import { pollRequestPaymentStatus } from "@/app/server/actions";
import { Invoice } from "@getalby/lightning-tools";
import { Invoice as DBInvoice, Suggestion } from "@prisma/client";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

const spinProgress = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default function RequestInvoice({
  onFinish,
  suggestion,
}: {
  onFinish: () => void;
  suggestion: (Suggestion & { upfrontInvoice: DBInvoice }) | null;
}) {
  const [spinIndex, setSpinIndex] = useState(0);
  const [status, setStatus] = useState<"paid" | "expired" | "pending">(
    "pending",
  );
  const [expiry, setExpiry] = useState("");

  const handleCopyInvoice = async () => {
    if (!suggestion) return;

    navigator.clipboard.writeText(suggestion.upfrontInvoice.pr).then(() => {
      alert(`Copied invoice to clipboard`);
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (suggestion && status === "pending")
      interval = setInterval(() => {
        setSpinIndex((index) => (index + 1) % spinProgress.length);
        const invoice = new Invoice({
          pr: suggestion?.upfrontInvoice.pr,
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
  }, [suggestion, status]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (suggestion) {
      interval = setInterval(async () => {
        const pollStatus = await pollRequestPaymentStatus(suggestion.id);

        if (pollStatus !== "pending") {
          setStatus(pollStatus);
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [suggestion]);

  if (!suggestion) return null;

  return (
    <div className="request-step">
      {status === "pending" && (
        <div
          className="request-step-content-row"
          style={{ alignItems: "flex-start" }}
        >
          <QRCode
            value={suggestion.upfrontInvoice.pr}
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
      )}

      {status === "paid" && (
        <div className="request-step-content-row">
          <div className="request-step-content">
            <div>
              <label># Payment Successful</label>
            </div>
            <button onClick={onFinish} className="submit-button">
              Done
            </button>
          </div>
        </div>
      )}

      {status === "expired" && (
        <div className="request-step-content-row">
          <div className="request-step-content">
            <div>
              <label># Payment Expired</label>
            </div>
            <button onClick={onFinish} className="submit-button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
