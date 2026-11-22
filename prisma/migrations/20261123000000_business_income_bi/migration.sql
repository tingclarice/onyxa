BEGIN;

ALTER TABLE "Item"
  ADD COLUMN "category" VARCHAR(80);

CREATE TABLE "IncomeSettlement" (
  "id" UUID PRIMARY KEY,
  "businessId" UUID NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "memberId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "cash" DECIMAL(18,2) NOT NULL CHECK ("cash" >= 0),
  "qris" DECIMAL(18,2) NOT NULL CHECK ("qris" >= 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("cash" + "qris" > 0),
  FOREIGN KEY ("businessId", "memberId") REFERENCES "BusinessMember"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "IncomeSettlement_businessId_date_idx" ON "IncomeSettlement"("businessId", "date");
ALTER TABLE "IncomeSettlement" ENABLE ROW LEVEL SECURITY;

COMMIT;
