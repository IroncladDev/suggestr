import prisma from "@/app/server/prisma";
import CompletionContent from "./content";
import { appConfig } from "@/config";
import { lightningAddress } from "@/app/server/lightning";

export default async function CompletionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const suggestion = await prisma.suggestion.findUnique({
    where: {
      id,
    },
  });

  if (!suggestion) {
    return <div>No such suggestion</div>;
  }

  if (suggestion.status !== "stagnant") {
    return (
      <div>
        Suggestion is {suggestion.status}. Manual completion is not necessary
      </div>
    );
  }

  let payment = await prisma.completionPayment.findFirst({
    where: {
      suggestionId: id,
    },
    include: {
      invoice: true,
    },
  });

  if (!payment) {
    const totalAmountSats =
      appConfig.baseFee + (suggestion.additionalAmount || 0);
    const upfrontAmount = Math.floor(totalAmountSats * appConfig.upfrontRate);
    const remainingAmount = totalAmountSats - upfrontAmount;

    await lightningAddress.fetch();
    const invoice = await lightningAddress.requestInvoice({
      satoshi: remainingAmount,
      comment: "Suggestr posting fee",
    });

    const createdInvoice = await prisma.invoice.create({
      data: {
        pr: invoice.paymentRequest,
        preimage: invoice.preimage,
        verify: invoice.verify,
      },
    });

    payment = await prisma.completionPayment.create({
      data: {
        suggestionId: id,
        invoiceId: createdInvoice.id,
      },
      include: {
        invoice: true,
      },
    });
  }

  return <CompletionContent suggestion={suggestion} payment={payment} />;
}

export const dynamic = "force-dynamic";
