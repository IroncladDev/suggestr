"use client";

import SuggestionTimeline from "@/app/components/suggestion-timeline";
import { respondToRejection } from "@/app/server/actions";
import { Suggestion } from "@prisma/client";
import { getEventHash, UnsignedEvent, Event } from "nostr-tools";
import { useState } from "react";

export default function RespondContent({
  suggestion,
  name,
  ownerNpub,
}: {
  suggestion: Suggestion;
  name: string;
  ownerNpub: string;
}) {
  const [response, setResponse] = useState("");

  const handleRespond = async () => {
    const pubkey = await window.nostr.getPublicKey();

    const evt: UnsignedEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: response,
      pubkey,
    };

    const event: Omit<Event, "sig"> = {
      ...evt,
      id: getEventHash(evt),
    };

    const signedEvent: Event = await window.nostr.signEvent(event);

    const res = await respondToRejection(suggestion.id, signedEvent);

    if (!res.success) {
      alert(res.message);
      return;
    }

    alert("Responded");
  };

  return (
    <div>
      <div>
        <div>{suggestion.content}</div>
        <div>{suggestion.ownerRejectionComment}</div>
        <SuggestionTimeline
          suggestion={suggestion}
          ownerNpub={ownerNpub}
          name={name}
        />
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        ></textarea>
        <button onClick={handleRespond}>Respond</button>
      </div>
    </div>
  );
}
