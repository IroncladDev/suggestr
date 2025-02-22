import { useProfile } from "../home";
import { Profile } from "../server/nostr";
import "./header.css";

export default function Header({
  tab,
  setTab,
}: {
  tab: number;
  setTab: (tab: number) => void;
}) {
  const { name, picture, website, ownerNpub } = useProfile();
  return (
    <header>
      <div id="img-container">
        <img
          src={picture}
          alt={`${name}'s profile image`}
          width="160"
          height="160"
        />
      </div>
      <div id="header-info">
        <h1>
          <span id="name">{name}&apos;s</span>{" "}
          <span id="brand-name">Suggestr</span> Page
        </h1>
        <p>I&apos;ll post whatever you want on Nostr - for a price</p>
        <div id="links">
          <a href={`https://primal.net/p/${ownerNpub}`} target="_blank">
            [Nostr Profile ↗]
          </a>
          {website && (
            <a href={website} target="_blank">
              [Website ↗]
            </a>
          )}
        </div>
        <div id="tabs-container">
          <div id="tabs">
            <button
              className={tab === 0 ? "active" : ""}
              onClick={() => setTab(0)}
            >
              Suggest a Banger
            </button>
            <button
              className={tab === 1 ? "active" : ""}
              onClick={() => setTab(1)}
            >
              Hall of Shame
            </button>
            <div id="diy-link-container">
              <a href="https://github.com/IroncladDev/suggestr" target="_blank">
                Make your own ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
