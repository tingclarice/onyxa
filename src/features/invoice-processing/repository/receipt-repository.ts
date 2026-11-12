import "server-only";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type {
  BaseUnit,
  CatalogItem,
  ReceiptLineToSave,
} from "../types/scan";

// Stores reviewed receipts, their supplier and the catalog items they mention.
// Every query is scoped to the business.

/** Finds the supplier by its normalized name, or creates it. Returns its ID. */
export async function findOrCreateSupplier(
  businessId: string,
  name: string,
  nameKey: string,
  db: DatabaseClient = getPrisma(),
): Promise<string> {
  const supplier = await db.supplier.upsert({
    where: { businessId_nameKey: { businessId, nameKey } },
    create: { businessId, name, nameKey },
    update: {},
    select: { id: true },
  });
  return supplier.id;
}

/** Finds a catalog item by its own name or by one of its other names (aliases). */
export async function findItemByNameKey(
  businessId: string,
  nameKey: string,
  db: DatabaseClient = getPrisma(),
): Promise<CatalogItem | null> {
  const byName = await db.item.findUnique({
    where: { businessId_nameKey: { businessId, nameKey } },
    select: { id: true, name: true, baseUnit: true, archivedAt: true },
  });
  if (byName) {
    if (byName.archivedAt !== null) {
      await db.item.update({
        where: { id: byName.id },
        data: { archivedAt: null },
      });
    }
    return { id: byName.id, name: byName.name, baseUnit: byName.baseUnit };
  }

  const byAlias = await db.itemAlias.findUnique({
    where: { businessId_nameKey: { businessId, nameKey } },
    select: {
      item: { select: { id: true, name: true, baseUnit: true, archivedAt: true } },
    },
  });
  if (byAlias?.item) {
    if (byAlias.item.archivedAt !== null) {
      await db.item.update({
        where: { id: byAlias.item.id },
        data: { archivedAt: null },
      });
    }
    return {
      id: byAlias.item.id,
      name: byAlias.item.name,
      baseUnit: byAlias.item.baseUnit,
    };
  }
  return null;
}

export async function createItem(
  businessId: string,
  name: string,
  nameKey: string,
  baseUnit: BaseUnit,
  db: DatabaseClient = getPrisma(),
): Promise<CatalogItem> {
  return db.item.create({
    data: { businessId, name, nameKey, baseUnit },
    select: { id: true, name: true, baseUnit: true },
  });
}

/** Remembers another name for an item. Does nothing if the name is already used. */
export async function saveItemAliasIfFree(
  businessId: string,
  itemId: string,
  name: string,
  nameKey: string,
  db: DatabaseClient = getPrisma(),
): Promise<void> {
  const existing = await db.itemAlias.findUnique({
    where: { businessId_nameKey: { businessId, nameKey } },
    select: { id: true },
  });
  if (existing) return;
  await db.itemAlias.create({
    data: { businessId, itemId, name, nameKey },
    select: { id: true },
  });
}

/**
 * Saves the receipt and all its lines as one confirmed (SAVED) receipt.
 * Call inside runInTransaction so the receipt and lines are saved together.
 */
export async function createSavedReceipt(
  receipt: {
    businessId: string;
    createdByMemberId: string;
    supplierId: string;
    supplierName: string;
    receiptDate: string;
    total: number;
    overallConfidence: number;
    imageUrl: string | null;
    confirmedAt: Date;
    lines: (ReceiptLineToSave & { itemId: string })[];
  },
  db: DatabaseClient = getPrisma(),
): Promise<string> {
  const { id: receiptId } = await db.receipt.create({
    data: {
      businessId: receipt.businessId,
      createdByMemberId: receipt.createdByMemberId,
      supplierId: receipt.supplierId,
      supplierName: receipt.supplierName,
      // Receipt dates are calendar days (YYYY-MM-DD), stored as a DATE column.
      receiptDate: new Date(`${receipt.receiptDate}T00:00:00.000Z`),
      status: "SAVED",
      total: receipt.total,
      overallConfidence: receipt.overallConfidence,
      imageUrl: receipt.imageUrl,
      confirmedAt: receipt.confirmedAt,
    },
    select: { id: true },
  });

  await db.receiptLine.createMany({
    data: receipt.lines.map((line) => ({
      businessId: receipt.businessId,
      receiptId,
      itemId: line.itemId,
      position: line.position,
      rawName: line.rawName,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      confidence: line.confidence,
      baseQuantity: line.baseQuantity,
      baseUnit: line.baseUnit,
    })),
  });

  return receiptId;
}
