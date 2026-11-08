import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type { ItemPurchaseHistory } from "../types/inventory";

// Reads the purchase history of catalog items from SAVED receipts.
// Every query is scoped to one business.

const itemWithPurchases = {
  id: true,
  name: true,
  baseUnit: true,
  receiptLines: {
    where: { receipt: { status: "SAVED" } },
    select: {
      quantity: true,
      unit: true,
      unitPrice: true,
      baseQuantity: true,
      baseUnit: true,
      receipt: { select: { receiptDate: true, supplierName: true } },
    },
  },
} satisfies Prisma.ItemSelect;

type ItemRow = Prisma.ItemGetPayload<{ select: typeof itemWithPurchases }>;

/** All active items of the business with their purchases. */
export async function listItemPurchaseHistories(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPurchaseHistory[]> {
  const rows = await db.item.findMany({
    where: { businessId, archivedAt: null },
    select: itemWithPurchases,
    orderBy: { name: "asc" },
  });
  return rows.map(toPurchaseHistory);
}

/** One item of the business with its purchases, or null. */
export async function findItemPurchaseHistory(
  businessId: string,
  itemId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPurchaseHistory | null> {
  const row = await db.item.findFirst({
    where: { id: itemId, businessId, archivedAt: null },
    select: itemWithPurchases,
  });
  return row ? toPurchaseHistory(row) : null;
}

function toPurchaseHistory(row: ItemRow): ItemPurchaseHistory {
  const lines = row.receiptLines
    .map((line) => ({
      date: line.receipt.receiptDate.toISOString().slice(0, 10),
      supplierName: line.receipt.supplierName,
      quantity: line.quantity.toNumber(),
      unit: line.unit,
      unitPrice: line.unitPrice.toNumber(),
      // Only lines stored in the item's own unit can be compared.
      baseQuantity:
        line.baseUnit === row.baseUnit ? (line.baseQuantity?.toNumber() ?? null) : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const last = lines.at(-1);
  return {
    itemId: row.id,
    name: row.name,
    baseUnit: row.baseUnit,
    purchases: lines.flatMap((line) =>
      line.baseQuantity === null ? [] : [{ date: line.date, quantity: line.baseQuantity }],
    ),
    lastPurchase: last
      ? {
          date: last.date,
          supplierName: last.supplierName,
          quantity: last.quantity,
          unit: last.unit,
          unitPrice: last.unitPrice,
        }
      : null,
  };
}
