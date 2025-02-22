import { Suggestion } from "@prisma/client";
import { SafeSuggestion } from "../home";
import "./suggestion-timeline.css";
import { getProfileFromPubkey, Profile } from "../shared/nostr";
import { ReactNode, useEffect, useState } from "react";

export default function SuggestionTimeline({
  suggestion,
  children,
  name,
  ownerNpub,
  userResponse,
}: {
  suggestion: SafeSuggestion | Suggestion;
  children?: ReactNode;
  name?: string;
  ownerNpub?: string;
  userResponse?: ReactNode;
}) {
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (suggestion.userPubkey) {
      getProfileFromPubkey(suggestion.userPubkey)
        .then(setUserProfile)
        .catch(() => {});
    }
  }, [suggestion]);

  return (
    <div className="item">
      <div className="item-date">
        <div className="item-linespan"></div>
        <div className="item-datetime">
          {suggestion.createdAt.toISOString()}
        </div>
        <div className="item-linespan"></div>
      </div>
      <div className="item-event">
        <div className="item-event-header">
          <a
            href={`https://primal.net/p/${suggestion.userPubkey}`}
            target="_blank"
          >
            @{userProfile?.name ?? "unknown"}
          </a>{" "}
          suggested:
        </div>
        <div className="item-event-content">
          <p>{suggestion.content}</p>
          {children}
        </div>
      </div>
      {suggestion.ownerRejectionComment && name && ownerNpub && (
        <div className="nested-item-event">
          <span>
            ┆<br />╰
          </span>
          <div className="item-event">
            <div className="item-event-header">
              <a href={`https://primal.net/p/${ownerNpub}`} target="_blank">
                @{name}
              </a>{" "}
              rejected:
            </div>
            <div className="item-event-content">
              <p>{suggestion.ownerRejectionComment}</p>
            </div>
          </div>
        </div>
      )}
      {suggestion.userRejectionReply && (
        <div className="nested-item-event">
          <span>
            ┆<br />╰
          </span>

          <div className="item-event">
            <div className="item-event-header">
              <a
                href={`https://primal.net/p/${suggestion.userPubkey}`}
                target="_blank"
              >
                @{userProfile?.name ?? "unknown"}
              </a>{" "}
              replied:
            </div>
            <div className="item-event-content">
              <p>{suggestion.userRejectionReply}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
