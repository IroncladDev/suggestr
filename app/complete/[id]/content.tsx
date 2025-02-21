import { CompletionPayment, Suggestion } from "@prisma/client";

export default function CompletionContent({
  suggestion,
  payment,
}: {
  suggestion: Suggestion;
  payment: CompletionPayment;
}) {
  return <div>Completion Content {suggestion.id}</div>;
}
