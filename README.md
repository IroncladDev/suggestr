# Draft name: **Nostritution**

Self-hosted nostr post proposal system

## Problem

Running low on sats? Other people can pay YOU to post from your nostr account

1. A nostr user identified by their npub creates a proposal for the owner to post
2. They pay an upfront payment of `${X}% * (base + bribery fees)`
3. They paste in their NWC connection string to complete the latter part of the payment `(base + bribery fees) - (${X}% * (base + bribery fees))`
4. The owner approves or rejects the proposal (they can add a comment to the rejection)

5. **If approved**
6. A request is made to the NWC string and the user is charged
7. If successful, the user's proposal is posted
8. The user is notified via a nostr dm

5. **If rejected**
6. The suggestion moves to the hall of shame 
7. The user is notified via a nostr dm with a special link
8. They can respond to the owner's rejection comment

## Pages
- Hall of shame for rejected post proposals
- Pending posts shows current proposals
- Approved posts show posts that have been approved
- Index page shows info
    - Fetches the user profile from nostr relays via user npub
    - Do not expose nsec to client side
- Admin Page
    - Single button to sign a nostr event to log in
    - List of all pending posts
    - Owner can approve or reject a post
    - For approving a post, single button
    - For rejecting a post, the owner is prompted for a reply comment

## .env Config Options

- `NOSTR_NSEC` - The owner's nsec
- `REDIS_DB_URL` - Redis database URL

## Config Options (config.toml / json)

- `UPFRONT_RATE` - Number from 0-1 for the upfront payment fee
- `DISCLOSURE_TEMPLATE` - Optional. Template string containing `{url}` so that the owner can disclose that they didn't post the post. If not provided, no disclosure is attached.
- `BASE_FEE` - The base fee (in sats) for posting a proposal
- `RELAYS` - List of nostr relays to use

## DB Schema (Redis KV)

- admin_session: `String | None`
- posts: `Vec<Post>`
    - id: `String`
    - status: `PostStatus`
    - content: `String`
    - created_at: `DateTime`
    - updated_at: `DateTime`
    - owner_rejection_comment: `String | None`
    - user_rejection_reply: `String | None`
    - user_npub: `String`
    - user_nwc: `String`

- `PostStatus` - enum: `"pending" | "approved" | "rejected"`
