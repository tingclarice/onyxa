import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { saveReviewedReceipt } from "./receipt-save-service";
import type {
  ReceiptSaveRepository,
  ReceiptSaveTransaction,
} from "../types/ports";

interface FakeItem {
  id: string;
  name: string;
  nameKey: string;
  baseUnit: "KG" | "LITER" | "PCS";
}

let items: FakeItem[] = [];
let aliases: { itemId: string; nameKey: string }[] = [];
let suppliers: string[] = [];
let savedReceipts: {
  lines: { itemId: string; baseQuantity: number | null }[];
}[] = [];
let failReceiptWrite = false;
let transactionBusinessIds: string[] = [];

function createRepository(): ReceiptSaveRepository {
  return {
    async withBusinessTransaction(businessId, operation) {
      transactionBusinessIds.push(businessId);
      const snapshot = structuredClone({
        items,
        aliases,
        suppliers,
        savedReceipts,
      });
      const transaction: ReceiptSaveTransaction = {
        async findOrCreateSupplier(name, nameKey) {
          if (!suppliers.includes(nameKey)) suppliers.push(nameKey);
          assert.ok(name.trim());
          return `supplier-${nameKey}`;
        },
        async findItemByNameKey(nameKey) {
          const item =
            items.find((candidate) => candidate.nameKey === nameKey) ??
            items.find((candidate) =>
              aliases.some(
                (alias) =>
                  alias.nameKey === nameKey && alias.itemId === candidate.id,
              ),
            );
          return item
            ? {
                id: item.id,
                name: item.name,
                baseUnit: item.baseUnit,
              }
            : null;
        },
        async createItem(name, nameKey, baseUnit) {
          const item = {
            id: `item-${items.length + 1}`,
            name,
            nameKey,
            baseUnit,
          };
          items.push(item);
          return { id: item.id, name, baseUnit };
        },
        async saveItemAliasIfFree(itemId, name, nameKey) {
          assert.ok(name.trim());
          if (!aliases.some((alias) => alias.nameKey === nameKey)) {
            aliases.push({ itemId, nameKey });
          }
        },
        async createSavedReceipt(receipt) {
          assert.ok(receipt.createdByMemberId);
          assert.ok(receipt.supplierId);
          if (failReceiptWrite) throw new Error("database down");
          savedReceipts.push({ lines: receipt.lines });
          return `receipt-${savedReceipts.length}`;
        },
      };

      try {
        return await operation(transaction);
      } catch (error) {
        ({ items, aliases, suppliers, savedReceipts } = snapshot);
        throw error;
      }
    },
  };
}

const saver = { businessId: "trusted-business", memberId: "member" };
const dependencies = {
  repository: createRepository(),
  imageUrlValidator: {
    isValid: (url: string) =>
      url.startsWith("https://res.cloudinary.com/demo/"),
  },
};

function line(
  rawName: string,
  qty: number,
  unit: string,
  matched: string | null = null,
) {
  return {
    raw_name: rawName,
    qty,
    unit,
    unit_price: 1000,
    line_total: 1000 * qty,
    confidence: 0.95,
    matched_item: matched,
  };
}

function receiptWith(lines: ReturnType<typeof line>[]) {
  return {
    receipt: {
      supplier_name: " Pasar Segar ",
      date: "2026-11-05",
      items: lines,
      total: lines.reduce((sum, item) => sum + item.line_total, 0),
      overall_confidence: 0.9,
    },
  };
}

beforeEach(() => {
  items = [];
  aliases = [];
  suppliers = [];
  savedReceipts = [];
  failReceiptWrite = false;
  transactionBusinessIds = [];
});

test("new items are created with the base unit of their first purchase", async () => {
  const result = await saveReviewedReceipt(
    saver,
    receiptWith([
      line("Gula pasir", 2, "kg"),
      line("Kopi", 4, "pack"),
      line("Minyak", 2, "liter"),
    ]),
    dependencies,
  );
  assert.equal(result.itemCount, 3);
  assert.deepEqual(
    items.map((item) => [item.name, item.baseUnit]),
    [
      ["Gula pasir", "KG"],
      ["Kopi", "PCS"],
      ["Minyak", "LITER"],
    ],
  );
  assert.deepEqual(suppliers, ["pasar segar"]);
  assert.deepEqual(transactionBusinessIds, ["trusted-business"]);
});

test("a matched name reuses the item, converts units and remembers the receipt name", async () => {
  await saveReviewedReceipt(
    saver,
    receiptWith([line("Gula pasir", 2, "kg")]),
    dependencies,
  );
  await saveReviewedReceipt(
    saver,
    receiptWith([line("Gula", 500, "g", "Gula pasir")]),
    dependencies,
  );
  await saveReviewedReceipt(
    saver,
    receiptWith([line("Gula", 1, "kg")]),
    dependencies,
  );

  assert.equal(items.length, 1);
  assert.deepEqual(
    savedReceipts.map((receipt) => receipt.lines[0]?.baseQuantity),
    [2, 0.5, 1],
  );
});

test("a line whose unit does not fit the item is saved but not counted", async () => {
  await saveReviewedReceipt(
    saver,
    receiptWith([line("Gula pasir", 2, "kg")]),
    dependencies,
  );
  await saveReviewedReceipt(
    saver,
    receiptWith([line("Gula pasir", 3, "pack")]),
    dependencies,
  );
  assert.equal(savedReceipts[1]?.lines[0]?.baseQuantity, null);
});

test("invalid inputs and foreign image URLs are rejected before persistence", async () => {
  await assert.rejects(
    saveReviewedReceipt(saver, { receipt: { items: [] } }, dependencies),
  );
  await assert.rejects(
    saveReviewedReceipt(
      saver,
      {
        ...receiptWith([line("Gula", 1, "kg")]),
        imageUrl: "https://evil.example.com/a.jpg",
      },
      dependencies,
    ),
    { code: "cloudinary_image_invalid" },
  );
  assert.deepEqual(transactionBusinessIds, []);
});

test("failed writes roll back all changes in the business transaction", async () => {
  failReceiptWrite = true;
  await assert.rejects(
    saveReviewedReceipt(
      saver,
      receiptWith([line("Gula", 1, "kg")]),
      dependencies,
    ),
  );
  assert.deepEqual(items, []);
  assert.deepEqual(suppliers, []);
  assert.deepEqual(savedReceipts, []);
});
