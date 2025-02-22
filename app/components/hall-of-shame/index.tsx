import { SafeSuggestion, useProfile } from "@/app/home";
import SuggestionTimeline from "../suggestion-timeline";
import { useEffect, useState } from "react";
import { fetchRejectedSuggestions } from "@/app/server/actions";
import "./hall-of-shame.css";

export default function HallOfShame() {
  const [suggestions, setSuggestions] = useState<SafeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { name, ownerNpub } = useProfile();

  useEffect(() => {
    fetchRejectedSuggestions()
      .then(setSuggestions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div id="hall-of-shame-container">
      <div id="hall-of-shame-content">
        <div id="hall-of-shame-header">
          <h1># Hall of Shame</h1>
          <p>Post Suggestions that @{name} chickened out on</p>
        </div>
        <div id="hall-of-shame-list">
          {loading && <div>Loading...</div>}
          {suggestions.map((suggestion) => (
            <SuggestionTimeline
              key={suggestion.id}
              suggestion={suggestion}
              name={name}
              ownerNpub={ownerNpub}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
