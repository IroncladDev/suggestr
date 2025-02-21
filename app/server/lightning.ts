import { LightningAddress } from "@getalby/lightning-tools";

if (!process.env.LIGHTNING_ADDRESS) {
  throw new Error("LIGHTNING_ADDRESS env var is not set");
}

export const lightningAddress = new LightningAddress(process.env.LIGHTNING_ADDRESS);
