import { Invoice, LightningAddress } from "@getalby/lightning-tools";
import { Invoice as DBInvoice } from "@prisma/client";

if (!process.env.LIGHTNING_ADDRESS) {
  throw new Error("LIGHTNING_ADDRESS env var is not set");
}

export const lightningAddress = new LightningAddress(
  process.env.LIGHTNING_ADDRESS,
);

export const fromInvoice = (data: DBInvoice) => new Invoice({
    pr: data.pr,
    verify: data.verify ?? undefined,
    preimage: data.preimage ?? undefined,
  })

export function hasInvoiceExpired(data: DBInvoice) {
  return fromInvoice(data).hasExpired();
}

export async function isInvoicePaid(data: DBInvoice) {
  const invoice = fromInvoice(data);

  return invoice.isPaid();
}
