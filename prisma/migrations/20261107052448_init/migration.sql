-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('CAFE_RESTAURANT', 'STORE', 'OTHER');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "BaseUnit" AS ENUM ('KG', 'LITER', 'PCS');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('NEEDS_REVIEW', 'SAVED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('COGS', 'OPEX', 'CAPEX');

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL DEFAULT 'OTHER',
    "priceIncreaseThresholdPercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "priceIncreaseAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slowMovingAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'STAFF',
    "removedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessInvitation" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "invitedByMemberId" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "emailKey" VARCHAR(254) NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'STAFF',
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "baseUnit" "BaseUnit" NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAlias" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "createdByMemberId" UUID NOT NULL,
    "supplierId" UUID,
    "supplierName" TEXT NOT NULL,
    "receiptDate" DATE NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "total" DECIMAL(18,2) NOT NULL,
    "overallConfidence" DECIMAL(4,3),
    "imageUrl" TEXT,
    "imageSha256" CHAR(64),
    "confirmedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptLine" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "receiptId" UUID NOT NULL,
    "itemId" UUID,
    "position" INTEGER NOT NULL,
    "rawName" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "confidence" DECIMAL(4,3),
    "expenseCategory" "ExpenseCategory",
    "baseQuantity" DECIMAL(18,6),
    "baseUnit" "BaseUnit",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_id_key" ON "BusinessMember"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvitation_tokenHash_key" ON "BusinessInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "BusinessInvitation_businessId_emailKey_idx" ON "BusinessInvitation"("businessId", "emailKey");

-- CreateIndex
CREATE INDEX "BusinessInvitation_businessId_invitedByMemberId_idx" ON "BusinessInvitation"("businessId", "invitedByMemberId");

-- CreateIndex
CREATE INDEX "BusinessInvitation_expiresAt_idx" ON "BusinessInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_businessId_id_key" ON "Supplier"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_businessId_nameKey_key" ON "Supplier"("businessId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Item_businessId_id_key" ON "Item"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Item_businessId_nameKey_key" ON "Item"("businessId", "nameKey");

-- CreateIndex
CREATE INDEX "ItemAlias_businessId_itemId_idx" ON "ItemAlias"("businessId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemAlias_businessId_nameKey_key" ON "ItemAlias"("businessId", "nameKey");

-- CreateIndex
CREATE INDEX "Receipt_businessId_receiptDate_idx" ON "Receipt"("businessId", "receiptDate");

-- CreateIndex
CREATE INDEX "Receipt_businessId_status_receiptDate_idx" ON "Receipt"("businessId", "status", "receiptDate");

-- CreateIndex
CREATE INDEX "Receipt_businessId_supplierId_receiptDate_idx" ON "Receipt"("businessId", "supplierId", "receiptDate");

-- CreateIndex
CREATE INDEX "Receipt_businessId_createdByMemberId_idx" ON "Receipt"("businessId", "createdByMemberId");

-- CreateIndex
CREATE INDEX "Receipt_businessId_imageSha256_idx" ON "Receipt"("businessId", "imageSha256");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_businessId_id_key" ON "Receipt"("businessId", "id");

-- CreateIndex
CREATE INDEX "ReceiptLine_businessId_itemId_receiptId_idx" ON "ReceiptLine"("businessId", "itemId", "receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptLine_businessId_receiptId_position_key" ON "ReceiptLine"("businessId", "receiptId", "position");

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_businessId_invitedByMemberId_fkey" FOREIGN KEY ("businessId", "invitedByMemberId") REFERENCES "BusinessMember"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAlias" ADD CONSTRAINT "ItemAlias_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAlias" ADD CONSTRAINT "ItemAlias_businessId_itemId_fkey" FOREIGN KEY ("businessId", "itemId") REFERENCES "Item"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_businessId_createdByMemberId_fkey" FOREIGN KEY ("businessId", "createdByMemberId") REFERENCES "BusinessMember"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_businessId_supplierId_fkey" FOREIGN KEY ("businessId", "supplierId") REFERENCES "Supplier"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_businessId_receiptId_fkey" FOREIGN KEY ("businessId", "receiptId") REFERENCES "Receipt"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_businessId_itemId_fkey" FOREIGN KEY ("businessId", "itemId") REFERENCES "Item"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
