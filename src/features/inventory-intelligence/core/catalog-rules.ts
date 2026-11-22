import { CatalogItemError, type CatalogItemInput, type CatalogItemRecord } from "../types/catalog";

export function buildCatalogNames(name: string) {
  const displayName = name.trim().replace(/\s+/g, " ");
  return { name: displayName, nameKey: displayName.toLowerCase() };
}

export function checkCatalogNameAvailable(
  itemId: string | null, namedItem: CatalogItemRecord | null, aliasOwner: string | null,
) {
  const duplicate = itemId ? namedItem && namedItem.id !== itemId : namedItem && !namedItem.archivedAt;
  const targetId = itemId ?? namedItem?.id;
  if (duplicate || (aliasOwner && aliasOwner !== targetId)) {
    throw new CatalogItemError("Nama tersebut sudah digunakan di katalog usaha ini.");
  }
}

export function checkCatalogUnit(item: CatalogItemRecord, unit: CatalogItemInput["baseUnit"]) {
  if (item.hasPurchases && item.baseUnit !== unit) {
    throw new CatalogItemError("Barang ini sudah tercatat di nota. Gunakan satuan " + item.baseUnit.toLowerCase() + " agar riwayat pembelian konsisten.");
  }
}
