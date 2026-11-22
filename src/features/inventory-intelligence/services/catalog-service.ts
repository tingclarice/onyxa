import { runInPostgresTransaction } from "@/lib/database-transaction";
import { buildCatalogNames, checkCatalogNameAvailable } from "../core/catalog-rules";
import {
  findAliasOwner, findCatalogItem, insertCatalogItem, rememberPreviousItemName, updateCatalogItem,
} from "../repository/catalog-repository";
import { CatalogItemError, type CatalogItemInput } from "../types/catalog";

export async function saveCatalogItem(businessId: string, itemId: string | null, input: CatalogItemInput) {
  const fields = { ...buildCatalogNames(input.name), baseUnit: input.baseUnit };
  await runInPostgresTransaction(async (db) => {
    const namedItem = await findCatalogItem(businessId, { nameKey: fields.nameKey }, db);
    const aliasOwner = await findAliasOwner(businessId, fields.nameKey, db);
    const item = itemId ? await findCatalogItem(businessId, { id: itemId }, db) : namedItem;

    if (itemId && (!item || item.archivedAt)) {
      throw new CatalogItemError("Barang tidak ditemukan dalam katalog aktif.");
    }
    checkCatalogNameAvailable(itemId, namedItem, aliasOwner);
    if (!item) {
      await insertCatalogItem(businessId, fields, db);
      return;
    }

    if (item.nameKey !== fields.nameKey) {
      await rememberPreviousItemName(businessId, item, db);
    }
    await updateCatalogItem(businessId, item.id, fields, db);
  });
}
