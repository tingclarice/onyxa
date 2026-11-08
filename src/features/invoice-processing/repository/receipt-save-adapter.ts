import "server-only";

import { runInTransaction } from "@/lib/database-transaction";
import {
  createItem,
  createSavedReceipt,
  findItemByNameKey,
  findOrCreateSupplier,
  saveItemAliasIfFree,
} from "./receipt-repository";
import type {
  ReceiptSaveRepository,
  ReceiptSaveTransaction,
} from "../types/ports";

export const receiptSaveRepository: ReceiptSaveRepository = {
  withBusinessTransaction<T>(
    businessId: string,
    operation: (transaction: ReceiptSaveTransaction) => Promise<T>,
  ): Promise<T> {
    return runInTransaction((db) =>
      operation({
        findOrCreateSupplier: (name, nameKey) =>
          findOrCreateSupplier(businessId, name, nameKey, db),
        findItemByNameKey: (nameKey) =>
          findItemByNameKey(businessId, nameKey, db),
        createItem: (name, nameKey, baseUnit) =>
          createItem(businessId, name, nameKey, baseUnit, db),
        saveItemAliasIfFree: (itemId, name, nameKey) =>
          saveItemAliasIfFree(businessId, itemId, name, nameKey, db),
        createSavedReceipt: (receipt) =>
          createSavedReceipt(
            { ...receipt, businessId },
            db,
          ),
      }),
    );
  },
};
