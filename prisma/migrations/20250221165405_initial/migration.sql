-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "content" TEXT NOT NULL,
    "additionalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerRejectionComment" TEXT,
    "userRejectionReply" TEXT,
    "userPubkey" TEXT NOT NULL,
    "userNWC" TEXT NOT NULL,
    "upfrontInvoiceId" TEXT NOT NULL,
    CONSTRAINT "Suggestion_upfrontInvoiceId_fkey" FOREIGN KEY ("upfrontInvoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompletionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    CONSTRAINT "CompletionPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompletionPayment_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pr" TEXT NOT NULL,
    "preimage" TEXT,
    "verify" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "Suggestion_upfrontInvoiceId_key" ON "Suggestion"("upfrontInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionPayment_invoiceId_key" ON "CompletionPayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionPayment_suggestionId_key" ON "CompletionPayment"("suggestionId");
