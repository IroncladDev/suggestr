"use client";

export default function Home() {
  const handleClick = async () => {
    const res = await window.nostr.getPublicKey();

    console.log(res);
  }

  return (
    <div>
      <button onClick={handleClick}>click</button>
    </div>
  );
}
