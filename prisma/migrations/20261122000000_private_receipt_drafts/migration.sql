CREATE TABLE "ReceiptDraft" (
    "id" UUID NOT NULL PRIMARY KEY,
    "businessId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "sourceKey" CHAR(64) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extraction" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceiptDraft_businessId_memberId_fkey" FOREIGN KEY ("businessId", "memberId")
        REFERENCES "BusinessMember" ("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReceiptDraft_businessId_memberId_sourceKey_key" ON "ReceiptDraft" ("businessId", "memberId", "sourceKey");
CREATE INDEX "ReceiptDraft_businessId_memberId_createdAt_idx" ON "ReceiptDraft" ("businessId", "memberId", "createdAt");
ALTER TABLE "ReceiptDraft" ENABLE ROW LEVEL SECURITY;
