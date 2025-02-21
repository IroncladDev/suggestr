"use client";

import { pollCompletionInvoice } from "@/app/server/actions";
import { CompletionPayment, Invoice, Suggestion } from "@prisma/client";
import { useEffect } from "react";

export default function CompletionContent({
  suggestion,
  payment,
}: {
  suggestion: Suggestion;
  payment: CompletionPayment & { invoice: Invoice };
}) {
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (payment.invoice.pr) {
      interval = setInterval(async () => {
        const status = await pollCompletionInvoice(payment.invoice.pr);

        if (status === "paid") {
          // TODO: improve ui
          alert("Success! will review when ready");
          clearInterval(interval);
        }

        if (status === "expired") {
          // TODO: improve ui, add refresh option
          alert("Payment expired. Please try again");
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [payment.invoice.pr])

  return (
    <div>
      Completion Content {suggestion.id} please pay {payment.invoice.pr}
    </div>
  );
}
