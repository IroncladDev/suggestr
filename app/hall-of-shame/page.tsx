import prisma from "../server/prisma";

export default async function HallOfShamePage() {
  const allSuggestions = await prisma.suggestion.findMany({
    where: {
      status: "rejected",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      content: true,
      additionalAmount: true,
      createdAt: true,
      updatedAt: true,
      ownerRejectionComment: true,
      userRejectionReply: true,
      userPubkey: true,
    },
  });

  // TODO: do NOT expose users nwc tokens to the public
  return (
    <div>
      <h1>Hall of Shame</h1>
      <p>Chickened out lol</p>
      <div>
        {allSuggestions.map((suggestion) => (
          <div key={suggestion.id}>
            <div>{suggestion.content}</div>
            {suggestion.ownerRejectionComment && (
              <div>{suggestion.ownerRejectionComment}</div>
            )}
            {suggestion.userRejectionReply && (
              <div>{suggestion.userRejectionReply}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
