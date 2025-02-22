import { ownerNpub, ownerPubKey } from "./server/nostr";
import "./home.css";
import HomeContent from "./home";
import { getProfileFromPubkey } from "./shared/nostr";

export default async function Home() {
  const profile = await getProfileFromPubkey(ownerPubKey);

  if (!profile)
    throw new Error(
      "Failed to get nostr profile. Try adding some more relays in config.ts",
    );

  return (
    <HomeContent profile={profile} ownerNpub={ownerNpub} />
  );
}

export const dynamic = "force-static";
