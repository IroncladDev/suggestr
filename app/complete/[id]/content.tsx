"use client";

import { pollCompletionInvoice } from "@/app/server/actions";
import { Invoice } from "@getalby/lightning-tools";
import {
  CompletionPayment,
  Invoice as DBInvoice,
  Suggestion,
} from "@prisma/client";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import "./complete.css";

const spinProgress = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default function CompletionContent({
  payment,
  suggestion,
}: {
  payment: CompletionPayment & { invoice: DBInvoice };
  suggestion: Suggestion;
}) {
  const [spinIndex, setSpinIndex] = useState(0);
  const [expiry, setExpiry] = useState("");
  const [status, setStatus] = useState<"paid" | "expired" | "pending">(
    "pending",
  );

  const handleCopyInvoice = async () => {
    if (!payment) return;

    navigator.clipboard.writeText(payment.invoice.pr).then(() => {
      alert(`Copied invoice to clipboard`);
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (payment && status === "pending")
      interval = setInterval(() => {
        setSpinIndex((index) => (index + 1) % spinProgress.length);
        const invoice = new Invoice({
          pr: payment.invoice.pr,
        });
        const expiry = invoice.expiryDate;
        if (expiry) {
          const secondsUntilExpiry = Math.floor(
            (expiry.getTime() - Date.now()) / 1000,
          );

          const hours = Math.floor(secondsUntilExpiry / 3600);
          const minutes = Math.floor((secondsUntilExpiry % 3600) / 60);
          const seconds = secondsUntilExpiry % 60;

          setExpiry(`${hours}:${minutes}:${seconds}`);
        }
      }, 100);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [payment, status]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (payment.invoice.pr) {
      interval = setInterval(async () => {
        const status = await pollCompletionInvoice(suggestion.id);

        if (status !== "pending") {
          setStatus(status);
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [payment.invoice.pr, suggestion]);

  return (
    <div id="complete-container">
      <div id="complete-content">
        <QRCode
          value={payment.invoice.pr}
          size={256}
          bgColor={"transparent"}
          fgColor="rgb(var(--text))"
        />
        <div id="invoice-content">
          <p className="load-p">
            Waiting for payment <span>{spinProgress[spinIndex]}</span>
          </p>
          <p>Expires in {expiry}</p>
          <button
            className="back-btn"
            onClick={handleCopyInvoice}
            style={{ padding: 0 }}
          >
            [Copy Lightning Invoice]
          </button>
        </div>
      </div>
    </div>
  );
}
