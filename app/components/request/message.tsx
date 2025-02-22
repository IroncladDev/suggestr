import { useProfile } from "@/app/home";
import { nip19 } from "nostr-tools";
import { Dispatch, SetStateAction, useState } from "react";

export default function RequestMessage({
  setStep,
  message,
  setMessage,
  nostrPubKey,
  setNostrPubKey,
}: {
  setStep: Dispatch<SetStateAction<number>>;
  message: string;
  setMessage: (message: string) => void;
  nostrPubKey: string;
  setNostrPubKey: (nostrPubKey: string) => void;
}) {
  const { name } = useProfile();
  const [loading, setLoading] = useState(false);
  const handleContinue = async () => {
    setLoading(true);

    const nPubKey =
      nostrPubKey || (await window.nostr.getPublicKey().catch(() => null));

    if (nPubKey) {
      setNostrPubKey(nPubKey);
      setStep((step) => step + 1);
    } else {
      const npub = prompt("Please enter your nostr npub:");

      if (!npub) {
        alert("Please try again with a valid nostr npub");
        setLoading(false);
        return;
      }

      const { type, data } = nip19.decode(npub);

      if (type === "npub") {
        setNostrPubKey(
          data
            .split("")
            .reduce(
              (acc, curr) =>
                acc + curr.charCodeAt(0).toString(16).padStart(2, "0"),
              "",
            ),
        );
        setStep((step) => step + 1);
      } else {
        alert("Please try again with a valid nostr public key");
      }
    }

    setLoading(false);
  };

  return (
    <div className="request-step">
      <div className="request-step-content">
        <div>
          <label htmlFor="message"># Post Content</label>
          <p>The exact text you want {name} to post from their nostr account</p>
        </div>
        <textarea
          id="message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="check out my new memecoin..."
          rows={4}
        />
        <div>
          <button
            className="submit-button"
            onClick={handleContinue}
            disabled={!message || loading}
          >
            Continue →
          </button>
          <p className="under-notice">
            You will be prompted for your nostr public key
          </p>
        </div>
      </div>
    </div>
  );
}
