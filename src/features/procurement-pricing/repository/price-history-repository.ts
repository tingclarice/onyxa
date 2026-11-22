import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type {
  ItemPriceHistoryRecord,
  ReceiptLinePriceInput,
} from "../types/pricing";

// Reads confirmed receipt lines of catalog items from SAVED receipts.
// Every query is scoped to one business.

const itemWithPriceHistory = {
  id: true,
  name: true,
  baseUnit: true,
  receiptLines: {
    where: { receipt: { status: "SAVED" } },
    select: {
      id: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      lineTotal: true,
      baseQuantity: true,
      baseUnit: true,
      receipt: {
        select: {
          receiptDate: true,
          status: true,
          supplierId: true,
          supplierName: true,
        },
      },
    },
  },
} satisfies Prisma.ItemSelect;

type ItemPriceRow = Prisma.ItemGetPayload<{
  select: typeof itemWithPriceHistory;
}>;

/** Lists the active catalog items and their saved receipt lines. */
export async function listItemPriceHistories(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPriceHistoryRecord[]> {
  const rows = await db.item.findMany({
    where: { businessId, archivedAt: null },
    select: itemWithPriceHistory,
    orderBy: { name: "asc" },
  });
  return rows.map(toItemPriceHistoryRecord);
}

/** Finds one active item in the business. */
export async function findItemPriceHistory(
  businessId: string,
  itemId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPriceHistoryRecord | null> {
  const row = await db.item.findFirst({
    where: { id: itemId, businessId, archivedAt: null },
    select: itemWithPriceHistory,
  });
  return row ? toItemPriceHistoryRecord(row) : null;
}

function toItemPriceHistoryRecord(row: ItemPriceRow): ItemPriceHistoryRecord {
  const lines: ReceiptLinePriceInput[] = row.receiptLines
    .filter((line) => line.baseUnit === null || line.baseUnit === row.baseUnit)
    .map((line) => {
      const rawUnit = line.unit.trim();
      const unit =
        !rawUnit || rawUnit.toLocaleLowerCase("id-ID") === "tidak diketahui"
          ? line.baseUnit?.toLowerCase() ?? "Tidak diketahui"
          : rawUnit;
      return {
        receiptLineId: line.id,
        receiptDate: line.receipt.receiptDate.toISOString().slice(0, 10),
        supplierId: line.receipt.supplierId,
        supplierName: line.receipt.supplierName,
        quantity: line.quantity.toNumber(),
        unit,
        unitPrice: line.unitPrice.toNumber(),
        lineTotal: line.lineTotal.toNumber(),
        baseQuantity:
          line.baseUnit === row.baseUnit
            ? (line.baseQuantity?.toNumber() ?? null)
            : null,
        baseUnit: line.baseUnit === row.baseUnit ? line.baseUnit : null,
      };
    })
    .sort((a, b) => a.receiptDate.localeCompare(b.receiptDate));

  return {
    itemId: row.id,
    name: row.name,
    baseUnit: row.baseUnit,
    lines,
  };
}

