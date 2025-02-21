"use client";

import { Suggestion } from "@prisma/client";
import { useState } from "react";
import { adminApproveRequest, adminRejectRequest, fetchSuggestions } from "../server/actions";

export default function AdminContent({
  suggestions: initialSuggestions,
}: {
  suggestions: Suggestion[];
}) {
  const [suggestions, setSuggestions] =
    useState<Suggestion[]>(initialSuggestions);

  const handleRefresh = async () => {
    setSuggestions(await fetchSuggestions());
  };

  return (
    <div>
      <div>
        {suggestions.map((suggestion) => (
          <SuggestionItem
            key={suggestion.id}
            suggestion={suggestion}
            onRefresh={handleRefresh}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestionItem({
  suggestion,
  onRefresh,
}: {
  suggestion: Suggestion;
  onRefresh: () => void;
}) {
  const handleReject = async () => {
    const reason = prompt("Enter a reason for rejection");

    if (!reason) return;

    await adminRejectRequest(suggestion.id, reason);
    onRefresh();
  };

  const handleApprove = async () => {
    await adminApproveRequest(suggestion.id);
    onRefresh();
  };

  return (
    <div>
      <p>{suggestion.content}</p>
      <div>{suggestion.userPubkey}</div>
      <button onClick={handleReject}>Reject</button>
      <button onClick={handleApprove}>Approve</button>
    </div>
  );
}
