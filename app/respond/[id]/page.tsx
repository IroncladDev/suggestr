import prisma from "@/app/server/prisma";
import RespondContent from "./content";

export default async function RespondPage({ params }: { params: { id: string } }) {
  const suggestion = await prisma.suggestion.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!suggestion) {
    return <div>Suggestion not found</div>;
  }

  if(suggestion.status !== "rejected") {
    return <div>Suggestion must be rejected to respond</div>;
  }

  return (
    <RespondContent suggestion={suggestion} />
  );
}
