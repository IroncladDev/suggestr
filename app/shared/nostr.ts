import { appConfig } from "@/config";
import { SimplePool } from "nostr-tools";

export type Profile = {
  banner?: string;
  name: string;
  website?: string;
  about: string;
  display_name?: string;
  picture: string;
};

export async function getProfileFromPubkey(
  pubkey: string,
): Promise<Profile | null> {
  const pool = new SimplePool();

  const event = await pool.get(appConfig.relays, {
    kinds: [0],
    authors: [pubkey],
  });

  if (!event) return null;

  const metadata = JSON.parse(event.content);

  pool.close(appConfig.relays);

  return metadata;
}

export async function makeHandleFromPubkey(pubkey: string) {
  const profile = await getProfileFromPubkey(pubkey);

  if (!profile) return "@unknown";

  return "@" + profile.name;
}
