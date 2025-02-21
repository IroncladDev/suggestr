"use client";

import { useEffect, useState } from "react";
import {
  pollRequestPaymentStatus,
  requestPostUpfront,
} from "../server/actions";
import { Invoice, Suggestion } from "@prisma/client";

export default function RequestPage() {
  const [content, setContent] = useState("");
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [nwcUri, setNwcUri] = useState("");
  const [createdSuggestion, setCreatedSuggestion] = useState<
    (Suggestion & { upfrontInvoice: Invoice }) | null
  >(null);

  const handleSubmit = async () => {
    const nostrPubKey = await window.nostr.getPublicKey();

    if (!nostrPubKey) {
      alert(
        "Failed to get nostr public key. Please use an extension like Alby or something",
      );
      return;
    }

    const res = await requestPostUpfront({
      content,
      pubKey: nostrPubKey,
      nwc: nwcUri,
      additionalAmount,
    });

    if (res.success) {
      setCreatedSuggestion(res.suggestion);
    } else {
      alert(res.message);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (createdSuggestion) {
      interval = setInterval(async () => {
        const status = await pollRequestPaymentStatus(createdSuggestion.id);

        console.log(status);

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
  }, [createdSuggestion]);

  if (createdSuggestion) {
    return (
      <div>
        Pls pay the invoice kk thx: {createdSuggestion.upfrontInvoice.pr}
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="poast"
      />
      <input
        type="number"
        value={additionalAmount}
        onChange={(e) => setAdditionalAmount(Number(e.target.value))}
        placeholder="additional amount"
      />
      <input
        type="text"
        value={nwcUri}
        onChange={(e) => setNwcUri(e.target.value)}
        placeholder="nwc uri"
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
