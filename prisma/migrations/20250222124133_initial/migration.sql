-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('pending', 'stagnant', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'pending',
    "content" TEXT NOT NULL,
    "additionalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerRejectionComment" TEXT,
    "userRejectionReply" TEXT,
    "userPubkey" TEXT NOT NULL,
    "userNWC" TEXT NOT NULL,
    "upfrontInvoiceId" TEXT NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletionPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,

    CONSTRAINT "CompletionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "pr" TEXT NOT NULL,
    "preimage" TEXT,
    "verify" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Suggestion_upfrontInvoiceId_key" ON "Suggestion"("upfrontInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionPayment_invoiceId_key" ON "CompletionPayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionPayment_suggestionId_key" ON "CompletionPayment"("suggestionId");

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_upfrontInvoiceId_fkey" FOREIGN KEY ("upfrontInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionPayment" ADD CONSTRAINT "CompletionPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionPayment" ADD CONSTRAINT "CompletionPayment_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
