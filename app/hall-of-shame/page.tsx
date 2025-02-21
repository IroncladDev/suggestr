import prisma from "../server/prisma";

export default async function HallOfShamePage() {
  const allSuggestions = await prisma.suggestion.findMany();

  // TODO: do NOT expose users nwc tokens to the public
  return (
    <div>
      <h1>Hall of Shame</h1>
      <p>Chickened out lol</p>
      <div>
        {allSuggestions.map((suggestion) => (
          <div key={suggestion.id}>{suggestion.content}</div>
        ))}
      </div>
    </div>
  );
}
