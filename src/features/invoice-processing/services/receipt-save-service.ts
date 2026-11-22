import {
  ScanReceiptError,
  ReceiptDiscountError,
  SaveReceiptInputSchema,
  type CatalogItem,
  type ReceiptLineToSave,
  type ScanReceiptItem,
  type SaveReceiptInput,
} from "../types/scan";
import type {
  ReceiptImageUrlValidator,
  ReceiptSaveRepository,
  ReceiptSaveTransaction,
} from "../types/ports";
import {
  chooseItemName,
  convertToBaseUnit,
  normalizeNameKey,
  quantityInItemUnit,
  shouldSaveAlias,
} from "../core/receipt-line-rules";

import {
  calculateNetLineTotal,
  calculateReceiptTotal,
  getLineDiscountError,
  getReceiptDiscountError,
  hasDiscount,
  sumLineTotals,
} from "../core/receipt-review-rules";

/** Who is saving, and for which business (from the trusted session). */
export interface ReceiptSaver {
  businessId: string;
  memberId: string;
}

/**
 * The user pressed "Simpan" on a reviewed receipt.
 * Saves the supplier, the receipt and every line, matching each line to a
 * catalog item (creating new items when needed). Everything is saved
 * together or not at all. Returns the new receipt ID.
 */
export async function saveReviewedReceipt(
  saver: ReceiptSaver,
  input: unknown,
  dependencies: {
    readonly repository: ReceiptSaveRepository;
    readonly imageUrlValidator: ReceiptImageUrlValidator;
  },
  now: Date = new Date(),
): Promise<{ receiptId: string; itemCount: number }> {
  const reviewed = validateReceiptForSaving(input, dependencies.imageUrlValidator);
  return dependencies.repository.withBusinessTransaction(saver.businessId, (transaction) =>
    saveReceiptInTransaction(saver, reviewed, transaction, now),
  );
}

export function validateReceiptForSaving(input: unknown, imageUrlValidator: ReceiptImageUrlValidator) {
  const reviewed = SaveReceiptInputSchema.parse(input);
  const { receipt, imageUrl } = reviewed;
  for (const item of receipt.items) {
    const error = getLineDiscountError(item);
    if (error) throw new ReceiptDiscountError(error);
  }
  const error = getReceiptDiscountError(sumLineTotals(receipt.items), receipt.discount);
  if (error) throw new ReceiptDiscountError(error);
  if (imageUrl && !imageUrlValidator.isValid(imageUrl)) {
    throw new ScanReceiptError(
      "Alamat foto Cloudinary tidak valid.",
      "cloudinary_image_invalid",
    );
  }
  return reviewed;
}

export async function saveReceiptInTransaction(
  saver: ReceiptSaver,
  { receipt, imageUrl }: SaveReceiptInput,
  transaction: ReceiptSaveTransaction,
  now: Date = new Date(),
) {
  // 2. The supplier.
  const supplierName = receipt.supplier_name.trim();
  const supplierId = await transaction.findOrCreateSupplier(
    supplierName,
    normalizeNameKey(supplierName),
  );

  // 3. Each line → a catalog item and a quantity in the item's unit.
  const lines: (ReceiptLineToSave & { itemId: string })[] = [];
  const itemIds = new Set<string>();
  for (const [index, line] of receipt.items.entries()) {
    const item = await findOrCreateItemForLine(line, transaction);
    const baseQuantity = quantityInItemUnit(
      line.qty,
      line.unit,
      item.baseUnit,
    );
    itemIds.add(item.id);
    lines.push({
      position: index + 1,
      rawName: line.raw_name,
      itemName: item.name,
      itemId: item.id,
      quantity: line.qty,
      unit: line.unit,
      unitPrice: line.unit_price,
      lineTotal: calculateNetLineTotal(line),
      discount: line.discount ?? 0,
      confidence: line.confidence,
      baseQuantity,
      baseUnit: baseQuantity === null ? null : item.baseUnit,
    });
  }

  // 4. The receipt itself.
  const receiptId = await transaction.createSavedReceipt({
    createdByMemberId: saver.memberId,
    supplierId,
    supplierName,
    receiptDate: receipt.date,
    total: hasDiscount(receipt) ? calculateReceiptTotal(receipt.items, receipt.discount) : receipt.total,
    discount: receipt.discount ?? 0,
    overallConfidence: receipt.overall_confidence,
    imageUrl: imageUrl ?? null,
    confirmedAt: now,
    lines,
  });

  return { receiptId, itemCount: itemIds.size };
}

/**
 * Finds the catalog item for a receipt line, or creates it.
 * A new item gets the base unit of this first purchase (kg, liter or pcs).
 * When the receipt name differs from the item name, it is remembered as an
 * alias, so the next receipt with that name matches automatically.
 */
async function findOrCreateItemForLine(
  line: ScanReceiptItem,
  transaction: ReceiptSaveTransaction,
): Promise<CatalogItem> {
  const itemName = chooseItemName(line);
  const itemKey = normalizeNameKey(itemName);

  let item = await transaction.findItemByNameKey(itemKey);
  if (!item) {
    const { baseUnit } = convertToBaseUnit(line.qty, line.unit);
    item = await transaction.createItem(itemName, itemKey, baseUnit);
  }

  if (shouldSaveAlias(line.raw_name, item.name)) {
    const rawName = line.raw_name.trim();
    await transaction.saveItemAliasIfFree(
      item.id,
      rawName,
      normalizeNameKey(rawName),
    );
  }

  return item;
}
