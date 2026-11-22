import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { saveReviewedReceipt } from "./receipt-save-service";
import type {
  ReceiptSaveRepository,
  SavedReceiptRecord,
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
let savedReceipts: SavedReceiptRecord[] = [];
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
        async findActiveItemById(id) { return items.find((item) => item.id === id) ?? null; },
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
          savedReceipts.push(receipt);
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

test("saves each line net and applies the receipt discount once, even with a stale browser total", async () => {
  const first = { ...line("Susu", 2, "pcs"), unit_price: 10000, line_total: 20000, discount: 2000 };
  const second = { ...line("Roti", 1, "pcs"), unit_price: 12000, line_total: 12000 };
  const { receipt } = receiptWith([first, second]);
  await saveReviewedReceipt(saver, { receipt: { ...receipt, discount: 3000 } }, dependencies);
  assert.deepEqual(savedReceipts[0].lines.map(({ discount, lineTotal }) => [discount, lineTotal]),
    [[2000, 18000], [0, 12000]]);
  assert.equal(savedReceipts[0].discount, 3000);
  assert.equal(savedReceipts[0].total, 27000);
});

test("full discounts are allowed and excessive or negative discounts never reach persistence", async () => {
  const original = line("Roti", 1, "pcs");
  for (const [itemDiscount, discount] of [[-1, 0], [1001, 0], [500, 501], [0, -1]]) {
    const { receipt } = receiptWith([{ ...original }]);
    await assert.rejects(saveReviewedReceipt(saver, {
      receipt: { ...receipt, discount, items: [{ ...original, discount: itemDiscount }] },
    }, dependencies), /[Pp]otongan/);
  }
  assert.equal(transactionBusinessIds.length, 0);
  const { receipt } = receiptWith([original]);
  await saveReviewedReceipt(saver, { receipt: { ...receipt, discount: 1000 } }, dependencies);
  assert.equal(savedReceipts[0].total, 0);
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
