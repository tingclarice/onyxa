import "server-only";
import type { DatabaseClient } from "@/lib/database-transaction";
import { getPrisma } from "@/lib/prisma";
import type { CatalogItemInput, CatalogItemRecord } from "../types/catalog";

type CatalogWrite = CatalogItemInput & { nameKey: string };

export async function findCatalogItem(
  businessId: string,
  key: { id: string } | { nameKey: string },
  db: DatabaseClient = getPrisma(),
): Promise<CatalogItemRecord | null> {
  const item = await db.item.findFirst({
    where: { businessId, ...key },
    select: {
      id: true, name: true, nameKey: true, baseUnit: true, archivedAt: true,
    },
  });
  return item;
}

export async function findAliasOwner(
  businessId: string, nameKey: string, db: DatabaseClient = getPrisma(),
) {
  const alias = await db.itemAlias.findUnique({
    where: { businessId_nameKey: { businessId, nameKey } },
    select: { itemId: true },
  });
  return alias?.itemId ?? null;
}

export async function insertCatalogItem(
  businessId: string, fields: CatalogWrite, db: DatabaseClient = getPrisma(),
) {
  await db.item.create({ data: { businessId, ...fields }, select: { id: true } });
}

export async function updateCatalogItem(
  businessId: string, id: string, fields: CatalogWrite, db: DatabaseClient = getPrisma(),
) {
  await db.item.update({
    where: { businessId_id: { businessId, id } },
    data: { ...fields, archivedAt: null },
    select: { id: true },
  });
}

export async function rememberPreviousItemName(
  businessId: string, item: CatalogItemRecord, db: DatabaseClient = getPrisma(),
) {
  await db.itemAlias.createMany({
    data: [{ businessId, itemId: item.id, name: item.name, nameKey: item.nameKey }],
    skipDuplicates: true,
  });
}
