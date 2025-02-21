"use server";

import { NostrEvent, verifyEvent } from "nostr-tools";
import prisma from "./prisma";
import { messageNpub, ownerNpub, ownerPubKey, postToRelays } from "./nostr";
import { nwc } from "@getalby/sdk";
import { cookies } from "next/headers";
import { z } from "zod";
import { lightningAddress } from "./lightning";
import { appConfig } from "@/config";
import { Invoice } from "@getalby/lightning-tools";
import { Suggestion } from "@prisma/client";

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
  additionalAmount: z.number().positive().int().optional(),
  content: z.string(),
  pubKey: z.string(),
  nwc: z.string(),
});

export async function requestPostUpfront(
  input: z.infer<typeof requestPostUpfrontSchema>,
): Promise<
  | { success: true; suggestion: Suggestion }
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

    const nwcClient = new nwc.NWCClient({
      nostrWalletConnectUrl: nwcUrl,
    });

    const info = await nwcClient.getInfo();

    if (!info) {
      throw new Error("Invalid nwc url");
    }

    const invoice = await lightningAddress.requestInvoice({
      satoshi: upfrontAmount,
      comment: "Upfront payment for Nositute",
    });

    const suggestion = await prisma.suggestion.create({
      data: {
        status: "pending",
        content,
        additionalAmount,
        userPubkey: pubKey,
        userNWC: nwcUrl,
        upfrontInvoice: invoice.paymentRequest,
      },
    });

    return { success: true, suggestion };
  } catch (err) {
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
  });

  if (!suggestion) {
    throw new Error("Request not found");
  }

  const invoice = new Invoice({ pr: suggestion.upfrontInvoice });

  const isPaid = await invoice.isPaid();

  if (isPaid) {
    await prisma.suggestion.update({
      where: {
        id: suggestionId,
      },
      data: {
        upfrontPaid: true,
      },
    });

    return "paid";
  }

  if (invoice.hasExpired()) return "expired";

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
    });

    if (!suggestion) {
      throw new Error("Request not found");
    }

    if (suggestion.upfrontPaid) {
      throw new Error("Upfront invoice already paid");
    }

    const totalAmountSats =
      appConfig.baseFee + (suggestion.additionalAmount || 0);
    const upfrontAmount = Math.floor(totalAmountSats * appConfig.upfrontRate);

    const invoice = await lightningAddress.requestInvoice({
      satoshi: upfrontAmount,
      comment: "Upfront payment for Nositute",
    });

    await prisma.suggestion.update({
      where: {
        id: suggestionId,
      },
      data: {
        upfrontInvoice: invoice.paymentRequest,
        upfrontPaid: false,
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
      invoice: paymentRequest,
    },
    include: {
      suggestion: true,
    },
  });

  if (!completionPayment) {
    throw new Error("Completion payment not found");
  }

  const isPaid = await invoice.isPaid();

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
        .replaceAll("{user}", completionPayment.suggestion.userPubkey),
    );
    await postToRelays(
      completionPayment.suggestion.content,
      appConfig.disclosureTemplate
        ? appConfig.disclosureTemplate
          .replaceAll("{url}", process.env.NEXT_PUBLIC_SITE_URL as string)
          .replaceAll("{user}", completionPayment.suggestion.userPubkey)
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
      comment: "Nostitute posting fee",
    });

    await prisma.completionPayment.update({
      where: {
        id: completionPaymentId,
      },
      data: {
        invoice: invoice.paymentRequest,
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
      comment: "Nostitute posting fee",
    });

    const { preimage } = await nwcClient.payInvoice({
      invoice: invoice.paymentRequest,
    });

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
          .replaceAll("{user}", suggestion.userPubkey)
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
        .replaceAll("{user}", suggestion.userPubkey),
    );
    await postToRelays(
      suggestion.content,
      appConfig.disclosureTemplate
        ? appConfig.disclosureTemplate
          .replaceAll("{url}", process.env.NEXT_PUBLIC_SITE_URL as string)
          .replaceAll("{user}", suggestion.userPubkey)
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
        .replaceAll("{user}", suggesstion.userPubkey),
    );
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
