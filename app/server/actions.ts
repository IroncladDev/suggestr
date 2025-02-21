"use server";

import { NostrEvent, verifyEvent } from "nostr-tools";
import prisma from "./prisma";
import {
  makeHandleFromPubkey,
  messageNpub,
  ownerNpub,
  ownerPubKey,
  postToRelays,
} from "./nostr";
import { nwc } from "@getalby/sdk";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  hasInvoiceExpired,
  isInvoicePaid,
  lightningAddress,
} from "./lightning";
import { appConfig } from "@/config";
import { Invoice } from "@getalby/lightning-tools";
import { Suggestion, Invoice as DBInvoice } from "@prisma/client";

export async function adminNostrLogin(
  event: NostrEvent,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const isValid = verifyEvent(event);
    const cookie = await cookies();

    if (!isValid) {
      throw new Error("Invalid event");
    }

    console.log(ownerPubKey, ownerNpub);

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

    const invoice = await lightningAddress.requestInvoice({
      satoshi: upfrontAmount,
      comment: "Upfront payment for Nositute",
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
        upfrontInvoice: true
      }
    });

    return { success: true, suggestion };
  } catch (err) {
    console.error(err);
    return { success: false, message: (err as Error).message };
  }
}

export async function pollRequestPaymentStatus(
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
    throw new Error("Request not found");
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

    return "paid";
  }

  if (hasInvoiceExpired(suggestion.upfrontInvoice)) return "expired";

  return "pending";
}

export async function reRequestUpfrontInvoice(
  suggestionId: string,
): Promise<
  { success: true; invoice: string } | { success: false; message: string }
> {
  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: {
        id: suggestionId,
      },
      include: {
        upfrontInvoice: true,
      },
    });

    if (!suggestion) {
      throw new Error("Request not found");
    }

    if (suggestion.upfrontInvoice.paid) {
      throw new Error("Upfront invoice already paid");
    }

    const totalAmountSats =
      appConfig.baseFee + (suggestion.additionalAmount || 0);
    const upfrontAmount = Math.floor(totalAmountSats * appConfig.upfrontRate);

    const invoice = await lightningAddress.requestInvoice({
      satoshi: upfrontAmount,
      comment: "Upfront payment for Nositute",
    });

    await prisma.invoice.update({
      where: {
        id: suggestion.upfrontInvoiceId,
      },
      data: {
        pr: invoice.paymentRequest,
        preimage: invoice.preimage,
        verify: invoice.verify,
        paid: false,
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
    throw new Error("Completion payment not found");
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

    const invoice = await lightningAddress.requestInvoice({
      satoshi: remainingAmount,
      comment: "Suggestr posting fee",
    });

    const { preimage } = await nwcClient.payInvoice({
      invoice: invoice.paymentRequest,
    });

    const userHandle = await makeHandleFromPubkey(suggestion.userPubkey);

    if (!preimage) {
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
    const suggesstion = await prisma.suggestion.findUnique({
      where: {
        id: suggestionId,
      },
    });

    if (!suggesstion) {
      throw new Error("Request not found");
    }

    if (suggesstion.status !== "pending") {
      throw new Error("Request is not pending");
    }

    const userHandle = await makeHandleFromPubkey(suggesstion.userPubkey);

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
      suggesstion.userPubkey,
      appConfig.rejectionTemplate
        .replaceAll("{content}", suggesstion.content)
        .replaceAll("{user}", userHandle)
        .replaceAll("{reason}", reason),
    );
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function fetchSuggestions() {
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
