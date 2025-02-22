"use client";

import { Suggestion } from "@prisma/client";
import { useState } from "react";
import {
  adminApproveRequest,
  adminRejectRequest,
  fetchPendingSuggestions,
} from "../server/actions";
import SuggestionTimeline from "../components/suggestion-timeline";
import "./admin.css";

export default function AdminContent({
  suggestions: initialSuggestions,
}: {
  suggestions: Suggestion[];
}) {
  const [suggestions, setSuggestions] =
    useState<Suggestion[]>(initialSuggestions);

  const handleRefresh = async () => {
    setSuggestions(await fetchPendingSuggestions());
  };

  return (
    <div id="admin-content">
      <div id="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage all pending suggestions made by users in which the upfront payment has successfully been paid</p>
      </div>
      <div id="admin-list">
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
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    setLoading(true);
    const reason = prompt("Enter a reason for rejection");

    if (!reason) {
      setLoading(false);
      return;
    }

    await adminRejectRequest(suggestion.id, reason);
    onRefresh();
  };

  const handleApprove = async () => {
    setLoading(true);
    await adminApproveRequest(suggestion.id);
    onRefresh();
  };

  return (
    <SuggestionTimeline suggestion={suggestion}>
      <ul>
        <li>Bribery Fee: {suggestion.additionalAmount} SATS</li>
      </ul>
      <div className="buttons">
        <button onClick={handleReject} disabled={loading}>
          Reject
        </button>
        <button onClick={handleApprove} disabled={loading}>
          Approve
        </button>
      </div>
    </SuggestionTimeline>
  );
}
