import type { ScanReceipt, ScanReceiptItem } from "../types/scan";

// Rules for the receipt review screen. These run in the browser on every
// keystroke (approved exception: client UI may call core for instant
// calculations), and the same functions can be reused on the server.

/** OCR confidence below this means a person should double-check the value. */
export const LOW_CONFIDENCE_THRESHOLD = 0.8;

/** The supplier name, date and total all come from the header confidence. */
const HEADER_FIELD_COUNT = 3;

export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}

/**
 * Derives Harga satuan = Jumlah harga / Jumlah when unit_price is missing (0)
 * while line_total > 0 and qty > 0.
 */
export function deriveUnitPrice(lineTotal: number, qty: number): number {
  if (!Number.isFinite(lineTotal) || !Number.isFinite(qty) || qty <= 0 || lineTotal <= 0) {
    return 0;
  }
  return Math.round((lineTotal / qty) * 100) / 100;
}

/** Normalize the provider's printed amount to the gross amount used by review. */
export function buildReviewItem({ line_total_is_net, ...item }: ScanReceiptItem & { line_total_is_net?: boolean }): ScanReceiptItem {
  if (line_total_is_net) {
    return { ...item, line_total: (Math.round(item.line_total * 100) + Math.round((item.discount ?? 0) * 100)) / 100 };
  }
  if (!item.line_total && item.qty > 0 && item.unit_price > 0) {
    return { ...item, line_total: Math.round(item.qty * item.unit_price * 100) / 100 };
  }
  return item;
}

/** Fills missing unit_price (0) on scanned receipt items using line_total / qty. */
export function fillMissingUnitPrices(receipt: ScanReceipt): ScanReceipt {
  return {
    ...receipt,
    items: receipt.items.map((item) =>
      item.unit_price === 0 && item.line_total > 0 && item.qty > 0
        ? { ...item, unit_price: deriveUnitPrice(item.line_total, item.qty) }
        : item,
    ),
  };
}

/** The review form uses gross line amounts. Saved lineTotal is net of the line discount. */
export function calculateNetLineTotal(item: ScanReceiptItem): number {
  return (Math.round(item.line_total * 100) - Math.round((item.discount ?? 0) * 100)) / 100;
}

export function getLineDiscountError(item: ScanReceiptItem): string | undefined {
  if ((item.discount ?? 0) < 0) return "Potongan barang tidak boleh negatif.";
  if (calculateNetLineTotal(item) < 0) return "Potongan barang melebihi jumlah harga baris ini.";
}

export function getReceiptDiscountError(subtotal: number, discount = 0): string | undefined {
  if (discount < 0) return "Potongan nota tidak boleh negatif.";
  if (discount > Math.max(0, subtotal)) return "Potongan nota melebihi subtotal barang.";
}

export function hasDiscount(receipt: ScanReceipt): boolean {
  return Boolean(receipt.discount || receipt.items.some((item) => item.discount));
}

export function calculateReceiptTotal(items: ScanReceiptItem[], discount = 0): number {
  return (Math.round(sumLineTotals(items) * 100) - Math.round(discount * 100)) / 100;
}

/** Subtotal after line discounts, before the whole-receipt discount. */
export function sumLineTotals(items: ScanReceiptItem[]): number {
  let total = 0;
  for (const item of items) {
    if (Number.isFinite(item.line_total)) total += Math.round(calculateNetLineTotal(item) * 100);
  }
  return total / 100;
}

/** True when the lines do not add up to the total printed on the receipt. */
export function hasTotalMismatch(receipt: ScanReceipt): boolean {
  return calculateReceiptTotal(receipt.items, receipt.discount) !== receipt.total;
}

/** True when all required header and item fields are filled with valid values. */
export function isReceiptComplete(receipt: ScanReceipt): boolean {
  if (!receipt.supplier_name?.trim() || !receipt.date?.trim() || receipt.total < 0) {
    return false;
  }
  if (!Array.isArray(receipt.items) || receipt.items.length === 0) {
    return false;
  }
  if (receipt.total === 0 && !hasDiscount(receipt)) return false;
  return receipt.items.every(
    (item) =>
      Boolean(item.raw_name?.trim()) &&
      Boolean(item.unit?.trim()) &&
      Number.isFinite(item.qty) &&
      item.qty > 0 &&
      Number.isFinite(item.unit_price) &&
      item.unit_price >= 0 &&
      Number.isFinite(item.line_total) &&
      item.line_total >= 0,
  );
}

/**
 * How many fields the user should check, for the "N bagian perlu dicek" badge:
 * - 3 header fields when the header confidence is low,
 * - +1 per item with low confidence,
 * - +1 when the lines do not add up to the total.
 */
export function countFieldsNeedingReview(receipt: ScanReceipt): number {
  let count = 0;
  if (isLowConfidence(receipt.overall_confidence)) count += HEADER_FIELD_COUNT;
  for (const item of receipt.items) {
    if (isLowConfidence(item.confidence)) count += 1;
  }
  if (hasTotalMismatch(receipt)) count += 1;
  return count;
}
