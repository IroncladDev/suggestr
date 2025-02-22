import prisma from "@/app/server/prisma";
import RespondContent from "./content";
import { ownerNpub, ownerPubKey } from "@/app/server/nostr";
import { getProfileFromPubkey } from "@/app/shared/nostr";

export default async function RespondPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const suggestion = await prisma.suggestion.findUnique({
    where: {
      id,
    },
  });
  const nostrProfile = await getProfileFromPubkey(ownerPubKey);

  if (!suggestion) {
    return <div>Suggestion not found</div>;
  }

  if (suggestion.status !== "rejected") {
    return <div>Suggestion must be rejected to respond</div>;
  }

  return (
    <RespondContent
      suggestion={suggestion}
      name={nostrProfile?.name ?? ""}
      ownerNpub={ownerNpub}
    />
  );
}

export const dynamic = "force-dynamic";
