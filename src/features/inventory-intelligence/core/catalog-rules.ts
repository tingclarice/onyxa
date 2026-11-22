import { CatalogItemError, type CatalogItemRecord } from "../types/catalog";

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
