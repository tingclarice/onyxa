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

/** Sum of all line totals. Empty or invalid numbers count as 0. */
export function sumLineTotals(items: ScanReceiptItem[]): number {
  let total = 0;
  for (const item of items) {
    if (Number.isFinite(item.line_total)) total += item.line_total;
  }
  return total;
}

/** True when the lines do not add up to the total printed on the receipt. */
export function hasTotalMismatch(receipt: ScanReceipt): boolean {
  return sumLineTotals(receipt.items) !== receipt.total;
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
