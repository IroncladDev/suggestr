# Suggestr

Get paid to post what your Nostr audience REALLY wants to see

## Overview

Suggestr is designed to be a self-hosted Next.js website that allows users to pay you to post their suggestions

### Terms
- "owner" refers to the website owner
- "user" refers to a person who pays the owner to post a suggestion
- "suggestion" refers to a post that a user wants to see posted

Users must provide the post content, their nostr public key, and an NWC token in order to create a suggestion

Before the owner can review the suggestion, users are required to pay an upfront percentage (defaults to 25%)

Once a user has paid the upfront fee, the relevant suggestion is ready for review
- If the owner approves the suggestion, the suggestion's content is posted to the owner's nostr page, the user is notified, and the remaining percentage of the payment is paid to the owner's lightning address via NWC
- In order to reject a suggestion, the owner is required to provide a reason. If the owner rejects, the user is notified, and the suggestion gets moved to the Hall of Shame section. The user is given the option to add one additional comment as a response to the owner's reason to drive the final nail in the coffin (for humor purposes)

If the owner approves and the user's NWC payment fails, they are notified via a nostr dm and are sent a URL with a lightning invoice with the amount set to the remaining amount. Upon paying the lightning invoice, the user's suggestion is immediately posted to the owner's nostr page

## Setup

1. Ensure you have [Bun](https://bun.sh) installed
2. Clone the respo
3. Run `bun i` to install dependencies
4. Fill out the values in `.env.example` and rename it to `.env`
5. Configure the options in `config.ts` (optional)
6. Run `bun run dev` to start the development server

### Deployment

1. Find a postgres provider and get a database URL
2. Use `bun run build` as the build command
3. Use `bun run start` as the start command
4. Deploy to a hosting provider of your choice. I recommend [Vercel](https://vercel.com)
