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

const DEV_DEMO_PURCHASE_HISTORIES: ItemPurchaseHistory[] = [
  {
    itemId: "00000000-0000-0000-0000-000000000101",
    name: "Biji Kopi Arabika Gayo",
    baseUnit: "KG",
    purchases: [
      { date: "2026-09-15", quantity: 5 },
      { date: "2026-10-01", quantity: 10 },
      { date: "2026-10-18", quantity: 5 },
      { date: "2026-11-05", quantity: 5 },
    ],
    lastPurchase: {
      date: "2026-11-05",
      supplierName: "Roastery Nusantara",
      quantity: 5,
      unit: "kg",
      unitPrice: 160000,
    },
  },
  {
    itemId: "00000000-0000-0000-0000-000000000102",
    name: "Susu UHT Full Cream",
    baseUnit: "LITER",
    purchases: [
      { date: "2026-09-20", quantity: 24 },
      { date: "2026-10-10", quantity: 24 },
      { date: "2026-11-02", quantity: 24 },
    ],
    lastPurchase: {
      date: "2026-11-02",
      supplierName: "Grosir Sembako Makmur",
      quantity: 2,
      unit: "karton (12L)",
      unitPrice: 230400,
    },
  },
  {
    itemId: "00000000-0000-0000-0000-000000000103",
    name: "Gula Aren Cair",
    baseUnit: "LITER",
    purchases: [
      { date: "2026-09-25", quantity: 5 },
      { date: "2026-10-28", quantity: 5 },
    ],
    lastPurchase: {
      date: "2026-10-28",
      supplierName: "UD Manis Alami",
      quantity: 5,
      unit: "liter",
      unitPrice: 35000,
    },
  },
];

/** All active items of the business with their purchases. */
export async function listItemPurchaseHistories(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPurchaseHistory[]> {
  try {
    const rows = await db.item.findMany({
      where: { businessId, archivedAt: null },
      select: itemWithPurchases,
      orderBy: { name: "asc" },
    });
    if (rows.length === 0 && process.env.DEV_AUTH_BYPASS === "true") {
      return DEV_DEMO_PURCHASE_HISTORIES;
    }
    return rows.map(toPurchaseHistory);
  } catch (error) {
    if (process.env.DEV_AUTH_BYPASS === "true") {
      return DEV_DEMO_PURCHASE_HISTORIES;
    }
    throw error;
  }
}

/** One item of the business with its purchases, or null. */
export async function findItemPurchaseHistory(
  businessId: string,
  itemId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPurchaseHistory | null> {
  try {
    const row = await db.item.findFirst({
      where: { id: itemId, businessId, archivedAt: null },
      select: itemWithPurchases,
    });
    if (!row && process.env.DEV_AUTH_BYPASS === "true") {
      return (
        DEV_DEMO_PURCHASE_HISTORIES.find((item) => item.itemId === itemId) ??
        null
      );
    }
    return row ? toPurchaseHistory(row) : null;
  } catch (error) {
    if (process.env.DEV_AUTH_BYPASS === "true") {
      return (
        DEV_DEMO_PURCHASE_HISTORIES.find((item) => item.itemId === itemId) ??
        null
      );
    }
    throw error;
  }
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
