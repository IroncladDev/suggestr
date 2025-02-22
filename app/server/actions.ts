"use server";

import { NostrEvent, verifyEvent } from "nostr-tools";
import prisma from "./prisma";
import { messageNpub, ownerPubKey, postToRelays } from "./nostr";
import { nwc } from "@getalby/sdk";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  hasInvoiceExpired,
  isInvoicePaid,
  lightningAddress,
} from "./lightning";
import { promiseWithTimeout } from "./utils";
import { appConfig } from "@/config";
import { Invoice } from "@getalby/lightning-tools";
import { Suggestion, Invoice as DBInvoice } from "@prisma/client";
import { getProfileFromPubkey, makeHandleFromPubkey } from "../shared/nostr";

export async function adminNostrLogin(
  event: NostrEvent,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const isValid = verifyEvent(event);
    const cookie = await cookies();

    if (!isValid) {
      throw new Error("Invalid event");
    }

    if (event.pubkey !== ownerPubKey) {
      throw new Error("Event pubkey does not match owner pubkey");
    }

    cookie.set("admin_session", (Date.now() + 1000 * 60 * 60 * 24).toString(), {
      maxAge: 1000 * 60 * 60 * 24,
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

const requestPostUpfrontSchema = z.object({
  additionalAmount: z.number().int().optional(),
  content: z.string(),
  pubKey: z.string(),
  nwc: z.string(),
});

export async function requestPostUpfront(
  input: z.infer<typeof requestPostUpfrontSchema>,
): Promise<
  | { success: true; suggestion: Suggestion & { upfrontInvoice: DBInvoice } }
  | { success: false; message: string }
> {
  try {
    const {
      additionalAmount,
      content,
      pubKey,
      nwc: nwcUrl,
    } = requestPostUpfrontSchema.parse(input);

    const totalAmountSats = appConfig.baseFee + (additionalAmount || 0);
    const upfrontAmount = Math.floor(totalAmountSats * appConfig.upfrontRate);

    const parsed = nwc.NWCClient.parseWalletConnectUrl(nwcUrl);

    if (!parsed) {
      throw new Error("Invalid nwc url");
    }

    await lightningAddress.fetch();
    const invoice = await lightningAddress.requestInvoice({
      satoshi: upfrontAmount,
      comment: "Upfront payment for Suggestr",
    });

    await invoice.verifyPayment();

    const suggestion = await prisma.suggestion.create({
      data: {
        status: "pending",
        content,
        additionalAmount,
        userPubkey: pubKey,
        userNWC: nwcUrl,
        upfrontInvoice: {
          create: {
            pr: invoice.paymentRequest,
            preimage: invoice.preimage,
            verify: invoice.verify,
          },
        },
      },
      include: {
        upfrontInvoice: true,
      },
    });

    return { success: true, suggestion };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err as Error).message };
  }
}

export async function pollSuggestionPaymentStatus(
  suggestionId: string,
): Promise<"paid" | "pending" | "expired"> {
  const suggestion = await prisma.suggestion.findUnique({
    where: {
      id: suggestionId,
    },
    include: {
      upfrontInvoice: true,
    },
  });

  if (!suggestion) {
    return "expired";
  }

  const invoice = new Invoice({
    pr: suggestion.upfrontInvoice.pr,
    preimage: suggestion.upfrontInvoice.preimage ?? undefined,
    verify: suggestion.upfrontInvoice.verify ?? undefined,
  });

  // isPaid throws an error instead of returning false
  const isPaid = await invoice.isPaid();

  if (isPaid) {
    await prisma.invoice.update({
      where: {
        id: suggestion.upfrontInvoiceId,
      },
      data: {
        paid: true,
      },
    });

    // DM self to let me know a user has paid for a suggestion
    const userProfile = await getProfileFromPubkey(suggestion.userPubkey);
    await messageNpub(
      ownerPubKey,
      `New suggestion by @${userProfile?.name} on Suggestr. Check it out at ${new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL as string)}`
    )

    return "paid";
  }

  if (hasInvoiceExpired(suggestion.upfrontInvoice)) return "expired";

  return "pending";
}

export async function pollCompletionInvoice(
  paymentRequest: string,
): Promise<"pending" | "paid" | "expired"> {
  const invoice = new Invoice({ pr: paymentRequest });

  const completionPayment = await prisma.completionPayment.findFirst({
    where: {
      invoice: {
        pr: paymentRequest,
      },
    },
    include: {
      suggestion: true,
      invoice: true,
    },
  });

  if (!completionPayment) {
    return "expired";
  }

  const isPaid = await isInvoicePaid(completionPayment.invoice);

  const userHandle = await makeHandleFromPubkey(
    completionPayment.suggestion.userPubkey,
  );

  if (isPaid) {
    await prisma.suggestion.update({
      where: {
        id: completionPayment.suggestionId,
      },
      data: {
        status: "approved",
      },
    });
    await prisma.completionPayment.delete({
      where: {
        id: completionPayment.id,
      },
    });

    await messageNpub(
      completionPayment.suggestion.userPubkey,
      appConfig.approvalTemplate
        .replaceAll("{content}", completionPayment.suggestion.content)
        .replaceAll("{user}", userHandle),
    );
    await postToRelays(
      completionPayment.suggestion.content,
      appConfig.disclosureTemplate
        ? appConfig.disclosureTemplate
            .replaceAll("{url}", process.env.NEXT_PUBLIC_SITE_URL as string)
            .replaceAll("{user}", userHandle)
        : undefined,
    );

    return "paid";
  }

  if (invoice.hasExpired()) return "expired";

  return "pending";
}

export async function reRequestCompletionInvoice(
  completionPaymentId: string,
): Promise<
  { success: true; invoice: string } | { success: false; message: string }
> {
  try {
    const completionPayment = await prisma.completionPayment.findUnique({
      where: {
        id: completionPaymentId,
      },
      include: {
        suggestion: true,
      },
    });

    if (!completionPayment) {
      throw new Error("Completion payment not found");
    }

    const totalAmountSats =
      appConfig.baseFee + (completionPayment.suggestion.additionalAmount || 0);
    const upfrontAmount = Math.floor(totalAmountSats * appConfig.upfrontRate);
    const remainingAmount = totalAmountSats - upfrontAmount;

    await lightningAddress.fetch();
    const invoice = await lightningAddress.requestInvoice({
      satoshi: remainingAmount,
      comment: "Sugestr posting fee",
    });

    await prisma.invoice.update({
      where: {
        id: completionPayment.invoiceId,
      },
      data: {
        pr: invoice.paymentRequest,
        preimage: invoice.preimage,
        verify: invoice.verify,
      },
    });

    return {
      success: true,
      invoice: invoice.paymentRequest,
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function adminApproveRequest(
  suggestionId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: {
        id: suggestionId,
      },
    });

    if (!suggestion) {
      throw new Error("Request not found");
    }

    if (suggestion.status !== "pending") {
      throw new Error("Request is not pending");
    }

    const nwcClient = new nwc.NWCClient({
      nostrWalletConnectUrl: suggestion.userNWC,
    });

    const totalAmountSats =
      appConfig.baseFee + (suggestion.additionalAmount || 0);
    const upfrontAmount = Math.floor(totalAmountSats * appConfig.upfrontRate);
    const remainingAmount = totalAmountSats - upfrontAmount;

    await lightningAddress.fetch();
    const invoice = await lightningAddress.requestInvoice({
      satoshi: remainingAmount,
      comment: "Suggestr posting fee",
    });

    const payRes = await promiseWithTimeout(
      nwcClient.payInvoice({
        invoice: invoice.paymentRequest,
      }),
      10000,
    ).catch(() => null);

    const userHandle = await makeHandleFromPubkey(suggestion.userPubkey);

    if (!payRes?.preimage) {
      await prisma.suggestion.update({
        where: {
          id: suggestionId,
        },
        data: {
          status: "stagnant",
        },
      });
      await messageNpub(
        suggestion.userPubkey,
        appConfig.stagnantTemplate
          .replaceAll("{content}", suggestion.content)
          .replaceAll("{user}", userHandle)
          .replaceAll(
            "{url}",
            new URL(
              "/complete/" + suggestionId,
              process.env.NEXT_PUBLIC_SITE_URL as string,
            ).toString(),
          ),
      );
      throw new Error("NWC Payment Failed");
    }

    await prisma.suggestion.update({
      where: {
        id: suggestionId,
      },
      data: {
        status: "approved",
      },
    });

    await messageNpub(
      suggestion.userPubkey,
      appConfig.approvalTemplate
        .replaceAll("{content}", suggestion.content)
        .replaceAll("{user}", userHandle),
    );
    await postToRelays(
      suggestion.content,
      appConfig.disclosureTemplate
        ? appConfig.disclosureTemplate
            .replaceAll("{url}", process.env.NEXT_PUBLIC_SITE_URL as string)
            .replaceAll("{user}", userHandle)
        : undefined,
    );
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function adminRejectRequest(
  suggestionId: string,
  reason: string,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: {
        id: suggestionId,
      },
    });

    if (!suggestion) {
      throw new Error("Request not found");
    }

    if (suggestion.status !== "pending") {
      throw new Error("Request is not pending");
    }

    const userHandle = await makeHandleFromPubkey(suggestion.userPubkey);

    await prisma.suggestion.update({
      where: {
        id: suggestionId,
      },
      data: {
        status: "rejected",
        ownerRejectionComment: reason,
      },
    });

    await messageNpub(
      suggestion.userPubkey,
      appConfig.rejectionTemplate
        .replaceAll("{content}", suggestion.content)
        .replaceAll("{user}", userHandle)
        .replaceAll("{reason}", reason)
        .replaceAll("{url}", process.env.NEXT_PUBLIC_SITE_URL as string)
        .replaceAll(
          "{responseUrl}",
          new URL(
            "/respond/" + suggestion.id,
            process.env.NEXT_PUBLIC_SITE_URL as string,
          ).toString(),
        ),
    );
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function fetchPendingSuggestions() {
  const suggestions = await prisma.suggestion.findMany({
    where: {
      status: "pending",
      upfrontInvoice: {
        paid: true,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      upfrontInvoice: true,
    },
  });

  return suggestions;
}

export async function fetchRejectedSuggestions() {
  return await prisma.suggestion.findMany({
    where: {
      status: "rejected",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      content: true,
      userRejectionReply: true,
      status: true,
      additionalAmount: true,
      createdAt: true,
      ownerRejectionComment: true,
      userPubkey: true,
    },
  });
}

export async function respondToRejection(
  suggestionId: string,
  event: NostrEvent,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const isValid = verifyEvent(event);

    if (!isValid) {
      throw new Error("Invalid event");
    }

    const suggestion = await prisma.suggestion.findUnique({
      where: {
        id: suggestionId,
      },
    });

    if (!suggestion) {
      throw new Error("Request not found");
    }

    if (suggestion.status !== "rejected") {
      throw new Error("Request must be rejected for you to respond");
    }

    if (event.pubkey !== suggestion?.userPubkey) {
      throw new Error("Event pubkey does not match owner pubkey");
    }

    await prisma.suggestion.update({
      where: {
        id: suggestionId,
      },
      data: {
        userRejectionReply: event.content,
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
