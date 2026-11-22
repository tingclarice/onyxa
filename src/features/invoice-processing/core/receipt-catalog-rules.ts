import type { ExtractedReceiptItem, ReceiptCatalogItem, ScanReceiptItem } from "../types/scan";
import { convertToBaseUnit, normalizeNameKey } from "./receipt-line-rules";
import { buildReviewItem, deriveUnitPrice } from "./receipt-review-rules";

export function findCatalogName(catalog: ReceiptCatalogItem[], name: string) {
  const key = normalizeNameKey(name);
  return catalog.find((item) => normalizeNameKey(item.name) === key)
    ?? catalog.find((item) => item.aliases.some((alias) => normalizeNameKey(alias) === key));
}

function nameWords(name: string) {
  return normalizeNameKey(name).split(/[\s\p{P}]+/u).filter(Boolean).sort().join(" ");
}

export function matchExtractedItem(extracted: ExtractedReceiptItem, catalog: ReceiptCatalogItem[]): ScanReceiptItem {
  const { product_name, brand, package_size, package_unit, ...printed } = extracted;
  const line = buildReviewItem(printed);
  const product = product_name?.trim() ?? "";
  const label = brand?.trim() ?? "";
  const suggested = product ? [product, label].filter(Boolean).join(" ") : printed.raw_name;
  const byWords = (name: string) => name && catalog.find((item) => nameWords(item.name) === nameWords(name));
  const hint = catalog.find((item) => item.name === printed.matched_item);
  // Canonical names come first. A branded purchase can also use a generic entry.
  // A model suggestion alone cannot select a differently branded catalog item.
  const exact = catalog.find((item) => normalizeNameKey(item.name) === normalizeNameKey(printed.raw_name));
  const hintWords = hint ? nameWords(hint.name).split(" ") : [];
  const evidence = new Set(nameWords(suggested + " " + printed.raw_name).split(" "));
  const compatibleHint = hint && label
    && nameWords(label).split(" ").every((word) => hintWords.includes(word))
    && hintWords.every((word) => evidence.has(word));
  const matched = byWords(suggested) || (compatibleHint ? hint : undefined)
    || exact || byWords(product) || (!product && findCatalogName(catalog, printed.raw_name));

  const reviewed: ScanReceiptItem = { ...line, matched_item: matched ? matched.name : null };
  if (matched) reviewed.catalog_item_id = matched.id;
  else if (suggested !== printed.raw_name) reviewed.proposed_name = suggested;

  // One price on the receipt may cover a whole package. Keep its monetary total.
  if (package_size && package_unit && line.qty > 0 && convertToBaseUnit(1, line.unit).baseUnit === "PCS") {
    const packed = convertToBaseUnit(line.qty * package_size, package_unit);
    if ((!matched || matched.baseUnit === packed.baseUnit) && packed.baseQuantity > 0) {
      reviewed.qty = packed.baseQuantity;
      reviewed.unit = packed.baseUnit.toLowerCase();
      reviewed.unit_price = deriveUnitPrice(line.line_total, reviewed.qty);
    }
  }
  return reviewed;
}
