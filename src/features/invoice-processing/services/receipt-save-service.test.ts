import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// ---- In-memory catalog replacing the repository modules ----
interface FakeItem {
  id: string;
  name: string;
  nameKey: string;
  baseUnit: "KG" | "LITER" | "PCS";
}
let items: FakeItem[] = [];
let aliases: { itemId: string; nameKey: string }[] = [];
let suppliers: string[] = [];
let savedReceipts: { lines: { itemId: string; baseQuantity: number | null }[] }[] = [];
let failReceiptWrite = false;

function file(path: string) {
  return pathToFileURL(resolve(path)).href;
}
mock.module(file("src/lib/database-transaction.ts"), {
  namedExports: {
    async runInTransaction<T>(work: (db: null) => Promise<T>): Promise<T> {
      const snapshot = structuredClone({ items, aliases, suppliers, savedReceipts });
      try {
        return await work(null);
      } catch (error) {
        ({ items, aliases, suppliers, savedReceipts } = snapshot);
        throw error;
      }
    },
  },
});
mock.module(file("src/features/invoice-processing/repository/receipt-image-storage.ts"), {
  namedExports: {
    isOurCloudinaryImageUrl: (url: string) =>
      url.startsWith("https://res.cloudinary.com/demo/"),
  },
});
mock.module(file("src/features/invoice-processing/repository/receipt-repository.ts"), {
  namedExports: {
    async findOrCreateSupplier(_businessId: string, _name: string, nameKey: string) {
      if (!suppliers.includes(nameKey)) suppliers.push(nameKey);
      return `supplier-${nameKey}`;
    },
    async findItemByNameKey(_businessId: string, nameKey: string) {
      const item =
        items.find((i) => i.nameKey === nameKey) ??
        items.find((i) => aliases.some((a) => a.nameKey === nameKey && a.itemId === i.id));
      return item ? { id: item.id, name: item.name, baseUnit: item.baseUnit } : null;
    },
    async createItem(
      _businessId: string,
      name: string,
      nameKey: string,
      baseUnit: FakeItem["baseUnit"],
    ) {
      const item = { id: `item-${items.length + 1}`, name, nameKey, baseUnit };
      items.push(item);
      return { id: item.id, name, baseUnit };
    },
    async saveItemAliasIfFree(_b: string, itemId: string, _n: string, nameKey: string) {
      if (!aliases.some((a) => a.nameKey === nameKey)) aliases.push({ itemId, nameKey });
    },
    async createSavedReceipt(receipt: {
      lines: { itemId: string; baseQuantity: number | null }[];
    }) {
      if (failReceiptWrite) throw new Error("database down");
      savedReceipts.push({ lines: receipt.lines });
      return `receipt-${savedReceipts.length}`;
    },
  },
});
const service = import("./receipt-save-service");

const saver = { businessId: "business", memberId: "member" };
function line(rawName: string, qty: number, unit: string, matched: string | null = null) {
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
      total: lines.reduce((sum, l) => sum + l.line_total, 0),
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
});

test("new items are created with the base unit of their first purchase", async () => {
  const { saveReviewedReceipt } = await service;
  const result = await saveReviewedReceipt(
    saver,
    receiptWith([line("Gula pasir", 2, "kg"), line("Kopi", 4, "pack"), line("Minyak", 2, "liter")]),
  );
  assert.equal(result.itemCount, 3);
  assert.deepEqual(
    items.map((i) => [i.name, i.baseUnit]),
    [["Gula pasir", "KG"], ["Kopi", "PCS"], ["Minyak", "LITER"]],
  );
  assert.deepEqual(suppliers, ["pasar segar"]);
});

test("a matched name reuses the item, converts units and remembers the receipt name", async () => {
  const { saveReviewedReceipt } = await service;
  await saveReviewedReceipt(saver, receiptWith([line("Gula pasir", 2, "kg")]));
  await saveReviewedReceipt(saver, receiptWith([line("Gula", 500, "g", "Gula pasir")]));
  // Next time "Gula" matches through the alias, even without a matched name.
  await saveReviewedReceipt(saver, receiptWith([line("Gula", 1, "kg")]));

  assert.equal(items.length, 1);
  assert.deepEqual(
    savedReceipts.map((r) => r.lines[0].baseQuantity),
    [2, 0.5, 1],
  );
});

test("a line whose unit does not fit the item is saved but not counted", async () => {
  const { saveReviewedReceipt } = await service;
  await saveReviewedReceipt(saver, receiptWith([line("Gula pasir", 2, "kg")]));
  await saveReviewedReceipt(saver, receiptWith([line("Gula pasir", 3, "pack")]));
  assert.equal(savedReceipts[1].lines[0].baseQuantity, null);
});

test("invalid input, foreign image URLs and failed writes save nothing", async () => {
  const { saveReviewedReceipt } = await service;
  await assert.rejects(saveReviewedReceipt(saver, { receipt: { items: [] } }));
  await assert.rejects(
    saveReviewedReceipt(saver, {
      ...receiptWith([line("Gula", 1, "kg")]),
      imageUrl: "https://evil.example.com/a.jpg",
    }),
  );
  failReceiptWrite = true;
  await assert.rejects(saveReviewedReceipt(saver, receiptWith([line("Gula", 1, "kg")])));
  assert.deepEqual(items, []);
  assert.deepEqual(savedReceipts, []);
});
