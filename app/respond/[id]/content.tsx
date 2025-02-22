"use client";

import SuggestionTimeline from "@/app/components/suggestion-timeline";
import { respondToRejection } from "@/app/server/actions";
import { Suggestion } from "@prisma/client";
import Link from "next/link";
import { getEventHash, UnsignedEvent, Event } from "nostr-tools";
import { useState } from "react";
import "./respond.css";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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

    router.push("/#hall-of-shame");
  };

  return (
    <div id="respond-container">
      <div id="respond-content">
        <h1>Respond to Rejection</h1>
        <p>
          <a href={`https://primal.net/p/${ownerNpub}`} target="_blank">
            @{name}
          </a>{" "}
          rejected your suggestion. You may leave a comment below and it will
          apear in the <Link href="/#hall-of-shame">Hall of Shame</Link>
        </p>
        <SuggestionTimeline
          suggestion={suggestion}
          ownerNpub={ownerNpub}
          name={name}
          userResponse={
            <>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="scaredy cat"
              ></textarea>
              <button onClick={handleRespond}>Submit</button>
            </>
          }
        />
      </div>
    </div>
  );
}
