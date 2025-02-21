type AppConfigType = {
  relays: string[];
  upfrontRate: number;
  baseFee: number;
  rejectionTemplate: string;
  approvalTemplate: string;
  stagnantTemplate: string;
  disclosureTemplate?: string;
};

export const appConfig: AppConfigType = {
  relays: [
    "wss://nostr.wine",
    "wss://relay.damus.io",
    "wss://nostr.wine",
  ],
  upfrontRate: 0.25,
  baseFee: 1000,
  /**
   * Optional. Sent as a reply on every suggestion you approve that gets posted to let others know it wasn't you.
   * {user} is the user's handle in the format @username
   * {url} is the site URL where other users can find your nostitute website and suggest posts
   */
  disclosureTemplate: `Suggested by {user} on {url}`,
  /**
   * Sent as a Nostr DM to the user when you reject their suggestion
   * {content} is the content the user suggested you post
   * {user} is the user's handle in the format @username
   */
  rejectionTemplate: `Hey {user}, I just rejected your suggestion to post "{content}" from my nostr account`,
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
  stagnantTemplate: `Hey {user}, your suggestion to post "{content}" has failed since the NWC payment did not go through.\n\nIf you still want me to post it, you can complete the payment via lightning at {url}`
};
