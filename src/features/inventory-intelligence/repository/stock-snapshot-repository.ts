import "server-only";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type { StockSnapshotRecord } from "../types/inventory";

// Reads and writes physical shelf count checkpoints (StockSnapshot).
// Every query is scoped to one business.

const snapshotSelect = {
  id: true,
  itemId: true,
  source: true,
  receiptLineId: true,
  countedQty: true,
  postEventStock: true,
  recordedAt: true,
  createdAt: true,
} as const;

type SnapshotRow = {
  id: string;
  itemId: string;
  source: "INLINE_RESTOCK" | "STANDALONE_OPNAME";
  receiptLineId: string | null;
  countedQty: { toNumber(): number };
  postEventStock: { toNumber(): number };
  recordedAt: Date;
  createdAt: Date;
};

function toSnapshotRecord(row: SnapshotRow): StockSnapshotRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    source: row.source,
    receiptLineId: row.receiptLineId,
    countedQty: row.countedQty.toNumber(),
    postEventStock: row.postEventStock.toNumber(),
    recordedAt: row.recordedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function activeItemExists(
  businessId: string,
  itemId: string,
  db: DatabaseClient = getPrisma(),
): Promise<boolean> {
  const row = await db.item.findFirst({
    where: { id: itemId, businessId, archivedAt: null },
    select: { id: true },
  });
  return row !== null;
}

export async function createStandaloneStockSnapshot(
  input: {
    businessId: string;
    itemId: string;
    recordedByMemberId: string;
    countedQty: number;
    recordedAt: Date;
  },
  db: DatabaseClient = getPrisma(),
): Promise<StockSnapshotRecord> {
  const row = await db.stockSnapshot.create({
    data: {
      businessId: input.businessId,
      itemId: input.itemId,
      recordedByMemberId: input.recordedByMemberId,
      source: "STANDALONE_OPNAME",
      countedQty: input.countedQty,
      postEventStock: input.countedQty,
      recordedAt: input.recordedAt,
    },
    select: snapshotSelect,
  });
  return toSnapshotRecord(row);
}

export async function listStockSnapshotsForBusiness(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<StockSnapshotRecord[]> {
  const rows = await db.stockSnapshot.findMany({
    where: { businessId },
    select: snapshotSelect,
    orderBy: [{ recordedAt: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toSnapshotRecord);
}

export async function listStockSnapshotsForItem(
  businessId: string,
  itemId: string,
  db: DatabaseClient = getPrisma(),
): Promise<StockSnapshotRecord[]> {
  const rows = await db.stockSnapshot.findMany({
    where: { businessId, itemId },
    select: snapshotSelect,
    orderBy: [{ recordedAt: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toSnapshotRecord);
}
