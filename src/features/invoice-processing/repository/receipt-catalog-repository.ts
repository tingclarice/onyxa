import "server-only";
import type { DatabaseClient } from "@/lib/database-transaction";
import { getPostgres } from "@/lib/prisma";
import type { ReceiptCatalogItem } from "../types/scan";

export async function listActiveReceiptCatalog(businessId: string, db: DatabaseClient = getPostgres()): Promise<ReceiptCatalogItem[]> {
  const items = await db.item.findMany({
    where: { businessId, archivedAt: null },
    select: { id: true, name: true, baseUnit: true, aliases: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return items.map(({ aliases, ...item }) => ({ ...item, aliases: aliases.map((alias) => alias.name) }));
}
