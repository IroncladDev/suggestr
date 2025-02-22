"use client";

import { createContext, useContext, useState } from "react";
import Header from "./components/header";
import RequestForm from "./components/request";
import HallOfShame from "./components/hall-of-shame";
import { Suggestion } from "@prisma/client";
import { Profile } from "./shared/nostr";

const ProfileContext = createContext<(Profile & { ownerNpub: string }) | null>(
  null,
);

export type SafeSuggestion = Pick<
    Suggestion,
    | "id"
    | "content"
    | "status"
    | "additionalAmount"
    | "createdAt"
    | "ownerRejectionComment"
    | "userRejectionReply"
    | "userPubkey"
  >

export default function HomeContent({
  profile,
  ownerNpub,
}: {
  profile: Profile;
  ownerNpub: string;
}) {
  const [tab, setTab] = useState(0);

  return (
    <ProfileContext.Provider value={{ ...profile, ownerNpub }}>
      <div id="container">
        <Header tab={tab} setTab={setTab} />
        <div id="content">
          {tab === 0 && <RequestForm />}
          {tab === 1 && <HallOfShame />}
        </div>
      </div>
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const profile = useContext(ProfileContext);

  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
}
