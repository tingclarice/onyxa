import type {
  BaseUnit,
  CatalogItem,
  ReceiptLineToSave,
  UploadReceiptImageResult,
} from "./scan";

export interface ReceiptImageUploader {
  upload(file: File): Promise<UploadReceiptImageResult>;
}

export interface ReceiptImageUrlValidator {
  isValid(imageUrl: string): boolean;
}

export interface SavedReceiptRecord {
  createdByMemberId: string;
  supplierId: string;
  supplierName: string;
  receiptDate: string;
  total: number;
  overallConfidence: number;
  imageUrl: string | null;
  confirmedAt: Date;
  lines: (ReceiptLineToSave & { itemId: string })[];
}

export interface ReceiptSaveTransaction {
  findOrCreateSupplier(name: string, nameKey: string): Promise<string>;
  findItemByNameKey(nameKey: string): Promise<CatalogItem | null>;
  createItem(
    name: string,
    nameKey: string,
    baseUnit: BaseUnit,
  ): Promise<CatalogItem>;
  saveItemAliasIfFree(
    itemId: string,
    name: string,
    nameKey: string,
  ): Promise<void>;
  createSavedReceipt(receipt: SavedReceiptRecord): Promise<string>;
}

export interface ReceiptSaveRepository {
  withBusinessTransaction<T>(
    businessId: string,
    operation: (transaction: ReceiptSaveTransaction) => Promise<T>,
  ): Promise<T>;
}
