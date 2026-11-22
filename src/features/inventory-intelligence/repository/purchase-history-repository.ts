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
  category: true,
  baseUnit: true,
  receiptLines: {
    where: { receipt: { status: "SAVED" } },
    select: {
      quantity: true,
      unit: true,
      unitPrice: true,
      baseQuantity: true,
      baseUnit: true,
      receipt: { select: { receiptDate: true, supplierName: true, status: true } },
    },
  },
} satisfies Prisma.ItemSelect;

type ItemRow = Prisma.ItemGetPayload<{ select: typeof itemWithPurchases }>;

/** Lists the active catalog items and their saved receipt lines. */
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

/** Finds one active item in the business. */
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

/** Soft-deletes (archives) one catalog item belonging to the business. */
export async function archiveItem(
  businessId: string,
  itemId: string,
  archivedAt: Date,
  db: DatabaseClient = getPrisma(),
): Promise<boolean> {
  const result = await db.item.updateMany({
    where: { id: itemId, businessId, archivedAt: null },
    data: { archivedAt },
  });
  return result.count > 0;
}

function toPurchaseHistory(row: ItemRow): ItemPurchaseHistory {
  const lines = row.receiptLines
    .map((line) => {
      const rawUnit = line.unit.trim();
      const unit =
        !rawUnit || rawUnit.toLocaleLowerCase("id-ID") === "tidak diketahui"
          ? line.baseUnit?.toLowerCase() ?? "Tidak diketahui"
          : rawUnit;
      return {
        date: line.receipt.receiptDate.toISOString().slice(0, 10),
        supplierName: line.receipt.supplierName,
        quantity: line.quantity.toNumber(),
        unit,
        unitPrice: line.unitPrice.toNumber(),
        // Only lines stored in the item's own unit can be compared.
        baseQuantity:
          line.baseUnit === row.baseUnit
            ? (line.baseQuantity?.toNumber() ?? null)
            : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const last = lines.at(-1);
  return {
    itemId: row.id,
    name: row.name,
    category: row.category,
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
