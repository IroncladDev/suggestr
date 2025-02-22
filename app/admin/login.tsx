"use client";

import { getEventHash, UnsignedEvent, Event } from "nostr-tools";
import { adminNostrLogin } from "../server/actions";

declare global {
  interface Window {
    nostr: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: UnsignedEvent) => Promise<Event>;
    };
  }
}

export default function AdminLogin() {
  const handleLogin = async () => {
    const pubkey = await window.nostr.getPublicKey();

    const evt: UnsignedEvent = {
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["challenge", ""]],
      content: "",
      pubkey,
    };

    const event: Omit<Event, "sig"> = {
      ...evt,
      id: getEventHash(evt),
    };

    const signedEvent: Event = await window.nostr.signEvent(event);

    const res = await adminNostrLogin(signedEvent);

    if (!res.success) {
      alert(res.message);
      return;
    }

    window.location.reload();
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
