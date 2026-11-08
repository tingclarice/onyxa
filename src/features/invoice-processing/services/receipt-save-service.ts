import {
  runInTransaction,
  type DatabaseClient,
} from "@/lib/database-transaction";
import {
  SaveReceiptInputSchema,
  type CatalogItem,
  type ReceiptLineToSave,
  type ScanReceiptItem,
} from "../types/scan";
import {
  chooseItemName,
  convertToBaseUnit,
  normalizeNameKey,
  quantityInItemUnit,
  shouldSaveAlias,
} from "../core/receipt-line-rules";
import {
  createItem,
  createSavedReceipt,
  findItemByNameKey,
  findOrCreateSupplier,
  saveItemAliasIfFree,
} from "../repository/receipt-repository";
import { isOurCloudinaryImageUrl } from "../repository/receipt-image-storage";

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
  now: Date = new Date(),
): Promise<{ receiptId: string; itemCount: number }> {
  // 1. Validate what the browser sent.
  const { receipt, imageUrl } = SaveReceiptInputSchema.parse(input);
  if (imageUrl && !isOurCloudinaryImageUrl(imageUrl))
    throw new Error("Alamat foto Cloudinary tidak valid.");

  return runInTransaction(async (db) => {
    // 2. The supplier.
    const supplierName = receipt.supplier_name.trim();
    const supplierId = await findOrCreateSupplier(
      saver.businessId,
      supplierName,
      normalizeNameKey(supplierName),
      db,
    );

    // 3. Each line → a catalog item and a quantity in the item's unit.
    const lines: (ReceiptLineToSave & { itemId: string })[] = [];
    const itemIds = new Set<string>();
    for (const [index, line] of receipt.items.entries()) {
      const item = await findOrCreateItemForLine(saver.businessId, line, db);
      const baseQuantity = quantityInItemUnit(line.qty, line.unit, item.baseUnit);
      itemIds.add(item.id);
      lines.push({
        position: index + 1,
        rawName: line.raw_name,
        itemName: item.name,
        itemId: item.id,
        quantity: line.qty,
        unit: line.unit,
        unitPrice: line.unit_price,
        lineTotal: line.line_total,
        confidence: line.confidence,
        baseQuantity,
        baseUnit: baseQuantity === null ? null : item.baseUnit,
      });
    }

    // 4. The receipt itself.
    const receiptId = await createSavedReceipt(
      {
        businessId: saver.businessId,
        createdByMemberId: saver.memberId,
        supplierId,
        supplierName,
        receiptDate: receipt.date,
        total: receipt.total,
        overallConfidence: receipt.overall_confidence,
        imageUrl: imageUrl ?? null,
        confirmedAt: now,
        lines,
      },
      db,
    );

    return { receiptId, itemCount: itemIds.size };
  });
}

/**
 * Finds the catalog item for a receipt line, or creates it.
 * A new item gets the base unit of this first purchase (kg, liter or pcs).
 * When the receipt name differs from the item name, it is remembered as an
 * alias, so the next receipt with that name matches automatically.
 */
async function findOrCreateItemForLine(
  businessId: string,
  line: ScanReceiptItem,
  db: DatabaseClient,
): Promise<CatalogItem> {
  const itemName = chooseItemName(line);
  const itemKey = normalizeNameKey(itemName);

  let item = await findItemByNameKey(businessId, itemKey, db);
  if (!item) {
    const { baseUnit } = convertToBaseUnit(line.qty, line.unit);
    item = await createItem(businessId, itemName, itemKey, baseUnit, db);
  }

  if (shouldSaveAlias(line.raw_name, item.name)) {
    const rawName = line.raw_name.trim();
    await saveItemAliasIfFree(
      businessId,
      item.id,
      rawName,
      normalizeNameKey(rawName),
      db,
    );
  }

  return item;
}
