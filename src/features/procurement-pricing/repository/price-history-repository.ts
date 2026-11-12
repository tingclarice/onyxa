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

const DEV_DEMO_PRICE_HISTORIES: ItemPriceHistoryRecord[] = [
  {
    itemId: "00000000-0000-0000-0000-000000000101",
    name: "Biji Kopi Arabika Gayo",
    baseUnit: "KG",
    lines: [
      {
        receiptLineId: "demo-line-1",
        receiptDate: "2026-09-15",
        supplierId: "sup-1",
        supplierName: "Roastery Nusantara",
        quantity: 5,
        unit: "kg",
        unitPrice: 140000,
        lineTotal: 700000,
        baseQuantity: 5,
        baseUnit: "KG",
      },
      {
        receiptLineId: "demo-line-2",
        receiptDate: "2026-10-01",
        supplierId: "sup-2",
        supplierName: "Koperasi Gayo Jaya",
        quantity: 10,
        unit: "kg",
        unitPrice: 136000,
        lineTotal: 1360000,
        baseQuantity: 10,
        baseUnit: "KG",
      },
      {
        receiptLineId: "demo-line-3",
        receiptDate: "2026-10-18",
        supplierId: "sup-1",
        supplierName: "Roastery Nusantara",
        quantity: 5,
        unit: "kg",
        unitPrice: 142000,
        lineTotal: 710000,
        baseQuantity: 5,
        baseUnit: "KG",
      },
      {
        receiptLineId: "demo-line-4",
        receiptDate: "2026-11-05",
        supplierId: "sup-1",
        supplierName: "Roastery Nusantara",
        quantity: 5,
        unit: "kg",
        unitPrice: 160000,
        lineTotal: 800000,
        baseQuantity: 5,
        baseUnit: "KG",
      },
    ],
  },
  {
    itemId: "00000000-0000-0000-0000-000000000102",
    name: "Susu UHT Full Cream",
    baseUnit: "LITER",
    lines: [
      {
        receiptLineId: "demo-line-5",
        receiptDate: "2026-09-20",
        supplierId: "sup-3",
        supplierName: "Grosir Sembako Makmur",
        quantity: 2,
        unit: "karton (12L)",
        unitPrice: 216000,
        lineTotal: 432000,
        baseQuantity: 24,
        baseUnit: "LITER",
      },
      {
        receiptLineId: "demo-line-6",
        receiptDate: "2026-10-10",
        supplierId: "sup-4",
        supplierName: "Agen Dairy Prima",
        quantity: 24,
        unit: "liter",
        unitPrice: 17500,
        lineTotal: 420000,
        baseQuantity: 24,
        baseUnit: "LITER",
      },
      {
        receiptLineId: "demo-line-7",
        receiptDate: "2026-11-02",
        supplierId: "sup-3",
        supplierName: "Grosir Sembako Makmur",
        quantity: 2,
        unit: "karton (12L)",
        unitPrice: 230400,
        lineTotal: 460800,
        baseQuantity: 24,
        baseUnit: "LITER",
      },
    ],
  },
  {
    itemId: "00000000-0000-0000-0000-000000000103",
    name: "Gula Aren Cair",
    baseUnit: "LITER",
    lines: [
      {
        receiptLineId: "demo-line-8",
        receiptDate: "2026-09-25",
        supplierId: "sup-5",
        supplierName: "UD Manis Alami",
        quantity: 5,
        unit: "liter",
        unitPrice: 38000,
        lineTotal: 190000,
        baseQuantity: 5,
        baseUnit: "LITER",
      },
      {
        receiptLineId: "demo-line-9",
        receiptDate: "2026-10-28",
        supplierId: "sup-5",
        supplierName: "UD Manis Alami",
        quantity: 5,
        unit: "liter",
        unitPrice: 35000,
        lineTotal: 175000,
        baseQuantity: 5,
        baseUnit: "LITER",
      },
    ],
  },
];

/** All active items of the business with their confirmed receipt lines. */
export async function listItemPriceHistories(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPriceHistoryRecord[]> {
  try {
    const rows = await db.item.findMany({
      where: { businessId, archivedAt: null },
      select: itemWithPriceHistory,
      orderBy: { name: "asc" },
    });
    if (rows.length === 0 && process.env.DEV_AUTH_BYPASS === "true") {
      return DEV_DEMO_PRICE_HISTORIES;
    }
    return rows.map(toItemPriceHistoryRecord);
  } catch (error) {
    if (process.env.DEV_AUTH_BYPASS === "true") {
      return DEV_DEMO_PRICE_HISTORIES;
    }
    throw error;
  }
}

/** One item of the business with its confirmed receipt lines, or null. */
export async function findItemPriceHistory(
  businessId: string,
  itemId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ItemPriceHistoryRecord | null> {
  try {
    const row = await db.item.findFirst({
      where: { id: itemId, businessId, archivedAt: null },
      select: itemWithPriceHistory,
    });
    if (!row && process.env.DEV_AUTH_BYPASS === "true") {
      return (
        DEV_DEMO_PRICE_HISTORIES.find((item) => item.itemId === itemId) ?? null
      );
    }
    return row ? toItemPriceHistoryRecord(row) : null;
  } catch (error) {
    if (process.env.DEV_AUTH_BYPASS === "true") {
      return (
        DEV_DEMO_PRICE_HISTORIES.find((item) => item.itemId === itemId) ?? null
      );
    }
    throw error;
  }
}

function toItemPriceHistoryRecord(row: ItemPriceRow): ItemPriceHistoryRecord {
  const lines: ReceiptLinePriceInput[] = row.receiptLines
    .map((line) => ({
      receiptLineId: line.id,
      receiptDate: line.receipt.receiptDate.toISOString().slice(0, 10),
      supplierId: line.receipt.supplierId,
      supplierName: line.receipt.supplierName,
      quantity: line.quantity.toNumber(),
      unit: line.unit,
      unitPrice: line.unitPrice.toNumber(),
      lineTotal: line.lineTotal.toNumber(),
      baseQuantity:
        line.baseUnit === row.baseUnit
          ? (line.baseQuantity?.toNumber() ?? null)
          : null,
      baseUnit: line.baseUnit === row.baseUnit ? line.baseUnit : null,
    }))
    .sort((a, b) => a.receiptDate.localeCompare(b.receiptDate));

  return {
    itemId: row.id,
    name: row.name,
    baseUnit: row.baseUnit,
    lines,
  };
}

