import { Dispatch, SetStateAction } from "react";

export default function RequestNWCUri({
  setStep,
  nwcUri,
  setNwcUri,
}: {
  nwcUri: string;
  setNwcUri: (nwcUri: string) => void;
  setStep: Dispatch<SetStateAction<number>>;
}) {
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
          <label htmlFor="nwc-uri"># Nostr Wallet Connect URI</label>
          <p>
            Using Alby? Grab your Nostr Wallet Connect URI from{" "}
            <a href="https://nwc.getalby.com" target="_blank">
              nwc.getalby.com ↗
            </a>
          </p>
        </div>
        <textarea
          id="nwc-uri"
          name="nwc-uri"
          value={nwcUri}
          onChange={(e) => setNwcUri(e.target.value)}
          placeholder="nostr+walletconnect://69effe..."
          autoFocus
          rows={4}
        />
        <div>
          <button
            className="submit-button"
            onClick={() => setStep((step) => step + 1)}
            disabled={!nwcUri}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
