import { appConfig } from "@/config";
import {
  getPublicKey,
  Event,
  nip19,
  Relay,
  UnsignedEvent,
  getEventHash,
  finalizeEvent,
  nip04,
  SimplePool,
} from "nostr-tools";

if (!process.env.NOSTR_NSEC) {
  throw new Error("NOSTR_NSEC env var is not set");
}

const res = nip19.decode(process.env.NOSTR_NSEC);

export const ownerSecretKey = res.data as Uint8Array;
export const ownerPubKey = getPublicKey(ownerSecretKey);
export const ownerNpub = nip19.npubEncode(ownerPubKey);

async function publishEventToRelays(event: Event) {
  for (const url of appConfig.relays) {
    try {
      const relay = await Relay.connect(url);
      await relay.publish(event);
      relay.close();
    } catch (error) {
      console.error(`Failed to publish to ${url}`, error);
    }
  }
}

export async function postToRelays(text: string, reply?: string) {
  const evt: UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: text,
    pubkey: ownerPubKey,
  };

  const event: Omit<Event, "sig"> = {
    ...evt,
    id: getEventHash(evt),
  };

  const signedEvent = finalizeEvent(event, ownerSecretKey);

  await publishEventToRelays(signedEvent);

  if (reply) {
    const replyEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["e", signedEvent.id, "", "root"], // Reference the original post as root
        ["p", signedEvent.pubkey], // Reference the author (yourself in this case)
      ],
      content: reply,
    };

    const signedReply = finalizeEvent(replyEvent, ownerSecretKey);

    await publishEventToRelays(signedReply);
  }
}

export async function messageNpub(recipientPubkey: string, text: string) {
  const encryptedContent = await nip04.encrypt(
    ownerSecretKey,
    recipientPubkey,
    text,
  );

  // Create the DM event (kind 4)
  const event = {
    kind: 4,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["p", recipientPubkey]],
    content: encryptedContent,
  };

  // Sign the event
  const signedEvent = finalizeEvent(event, ownerSecretKey);

  await publishEventToRelays(signedEvent);
}

export async function makeHandleFromPubkey(pubkey: string) {
  const pool = new SimplePool();

  const event = await pool.get(appConfig.relays, {
    kinds: [0],
    authors: [pubkey],
  });

  if (!event) return "{user}";

  const metadata = JSON.parse(event.content);

  pool.close(appConfig.relays);

  return "@" + metadata.name;
}
