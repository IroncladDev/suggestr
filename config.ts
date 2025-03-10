
export const appConfig: AppConfigType = {
  /**
   * A list of nostr relays to use when posting, fetching, and sending DMs to
   */
  relays: [
    "wss://relay.primal.net",
    "wss://relay.damus.io",
    "wss://relay.snort.social",
    "wss://nos.lol",
    "wss://nostr.wine",
  ],
  /**
   * Upfront payment rate (decimal number between 0 and 1)
   *
   * Defaults to 25%
   */
  upfrontRate: 0.25,
  baseFee: 3000,
  /**
   * Optional. Sent as a reply on every suggestion you approve that gets posted to let others know it wasn't you.
   * {user} is the user's handle in the format @username
   * {url} is the site URL where other users can find your suggestr website and suggest posts
   */
  // disclosureTemplate: `Suggested by {user} on {url}`,
  /**
   * Sent as a Nostr DM to the user when you reject their suggestion
   * {content} is the content the user suggested you post
   * {user} is the user's handle in the format @username
   * {reason} is the reason or comment why you rejected the suggestion
   * {responseUrl} is a link where they can repond to your rejection comment, driving the final nail into the coffin
   * {url} is the site URL
   */
  rejectionTemplate: `> {content}\n\n{reason}\n\nIf you want to post a public response to me rejecting your suggestion, you an do it at {responseUrl} and it will appear in the [Hall of Shame]({url}/hall-of-shame)`,
  /**
   * Sent as a Nostr DM to the user when you approve their suggestion
   * {content} is the content the user suggested you post
   * {user} is the user's handle in the format @username
   */
  approvalTemplate: `Hey {user}, I just posted your suggestion "{content}"`,
  /**
   * Sent as a Nostr DM to the user if their NWC payment fails
   * {content} is the content the user suggested you post
   * {user} is the user's handle in the format @username
   * {url} is the recovery URL where they can complete the payment via lightning
   */
  stagnantTemplate: `Hey {user}, your suggestion to post "{content}" has failed since the NWC payment did not go through.\n\nIf you still want me to post it, you can complete the payment via lightning at {url}`,
};

type AppConfigType = {
  relays: string[];
  upfrontRate: number;
  baseFee: number;
  rejectionTemplate: string;
  approvalTemplate: string;
  stagnantTemplate: string;
  disclosureTemplate?: string;
};
