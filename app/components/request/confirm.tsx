import { useProfile } from "@/app/home";
import { appConfig } from "@/config";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";

export default function RequestAmount({
  setStep,
  additionalAmount,
  setAdditionalAmount,
  handleSubmit,
}: {
  setStep: Dispatch<SetStateAction<number>>;
  additionalAmount: number;
  setAdditionalAmount: (additionalAmount: number) => void;
  handleSubmit: () => Promise<void>;
}) {
  const { name } = useProfile();
  const [loading, setLoading] = useState(false);
  const totalAmountSats = appConfig.baseFee + (additionalAmount || 0);
  const upfrontAmount = Math.floor(totalAmountSats * appConfig.upfrontRate);
  const upfrontPercentFee = `${Math.round(appConfig.upfrontRate * 100)}%`;

  return (
    <div className="request-step">
      <div className="request-step-content">
        <div>
          <button
            className="back-btn"
            onClick={() => setStep((step) => step - 1)}
          >
            ← Back
          </button>
        </div>

        <div>
          <label># Confirmation</label>
          <p>
            Confirm the amount you want to send for your suggestion to be posted
          </p>
          <p>Higher Bribery Fees are recommended for more edgy suggestions</p>
        </div>

        <div className="amount-table">
          <div className="amount-row">
            <div>Base Fee</div>
            <div>{appConfig.baseFee} SATS</div>
          </div>
          <div className="amount-row">
            <div>Upfront Rate</div>
            <div>{upfrontPercentFee}</div>
          </div>
          <div className="amount-row">
            <div>Bribery Fee</div>
            <div id="additional-amount-container">
              <input
                type="number"
                id="additional-amount"
                name="additional-amount"
                placeholder="0.00"
                value={additionalAmount}
                onChange={(e) => setAdditionalAmount(Number(e.target.value))}
                min={0}
                autoFocus
              />
              <span>SATS</span>
            </div>
          </div>
          <div className="amount-row">
            <div>Total</div>
            <div>{upfrontAmount} SATS</div>
          </div>
        </div>

        <div className="notice">
          <span>Important!</span>
          <ul>
            <li>
              You will initially be charged a{" "}
              <strong>{upfrontPercentFee} upfront fee</strong> for your post
              suggestion
            </li>
            <li>
              If your suggestion is <span id="highlight-green">approved</span>,
              it will automatically appear on @{name}&apos;s nostr page. The
              remaining amount will be automatically charged to your lightning
              wallet
            </li>
            <li>
              If your suggestion is <span id="highlight-red">rejected</span>, it
              will <strong>not</strong> be posted and instead get added to the{" "}
              <Link href="/hall-of-shame">Hall of Shame</Link>. You will have
              the option to add one additional comment to your suggestion in
              response to @{name} rejecting it
            </li>
            <li>
              You will be notified via a nostr dm if your suggestion is
              approved, rejected, or if your NWC payment failed
            </li>
            <li>No refunds will be provided</li>
          </ul>
        </div>

        <button
          className="submit-button"
          onClick={async () => {
            setLoading(true);
            await handleSubmit();
            setLoading(false);
          }}
          disabled={loading}
        >
          Confirm and Submit →
        </button>
      </div>
    </div>
  );
}
