import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import type { GenerateContentParameters } from "@google/genai";

mock.module("server-only", {});
const generate = mock.fn(async (request: GenerateContentParameters) => ({
  modelVersion: request.model,
  text: JSON.stringify({
    supplier_name: "Pasar", date: "2026-11-22", total: 60000, overall_confidence: 1,
    items: [{ raw_name: "SUNCO 2L", product_name: "Minyak Goreng", brand: "Sunco",
      qty: 2, unit: "pouch", package_size: 2, package_unit: "liter", unit_price: 30000,
      line_total: 60000, matched_item: "Minyak Goreng", confidence: 1 }],
  }),
}));
mock.module("@google/genai", { namedExports: { GoogleGenAI: class { models = { generateContent: generate }; } } });
mock.module(new URL("../repository/cloudinary-image.ts", import.meta.url).href, {
  namedExports: { fetchCloudinaryReceiptImage: async () => ({ bytes: Uint8Array.of(1), mimeType: "image/jpeg" }) },
});

const testUrl = process.env.ONYXA_CATALOG_TEST_DATABASE_URL;
test("scan uses its business catalog, persists the match in the draft, and verifies selections at approval", { skip: !testUrl }, async () => {
  process.env.DATABASE_URL = testUrl;
  process.env.GEMINI_API_KEY = "test";
  process.env.CLOUDINARY_CLOUD_NAME = "catalog-test";
  const { getPostgres } = await import("@/lib/prisma");
  const { extractAndStoreDraft, confirmReceipt, getScanDraft } = await import("./receipt-draft-service");
  const db = getPostgres();
  try {
    const business = await db.business.create({ data: { name: "Kantin" } });
    const other = await db.business.create({ data: { name: "Usaha lain" } });
    const email = randomUUID() + "@example.invalid";
    const user = await db.user.create({ data: { email, name: "Penguji", passwordHash: "unused" } });
    const member = await db.businessMember.create({ data: { email, businessId: business.id, userId: user.id, role: "STAFF" } });
    const owner = { businessId: business.id, memberId: member.id };
    const oil = await db.item.create({ data: { businessId: business.id, name: "Minyak Goreng", nameKey: "minyak goreng", baseUnit: "LITER" } });
    const foreign = await db.item.create({ data: { businessId: other.id, name: "Produk khusus usaha lain", nameKey: "lain", baseUnit: "PCS" } });
    const url = "https://res.cloudinary.com/catalog-test/image/upload/nota.jpg";
    const draft = await extractAndStoreDraft(owner, url, "catalog-test");
    const [line] = draft.receipt.items;
    assert.equal(line.catalog_item_id, oil.id);
    assert.equal(line.raw_name, "SUNCO 2L");
    assert.equal(line.qty, 4);
    assert.equal(line.unit, "liter");
    const payload = JSON.stringify(generate.mock.calls[0].arguments[0].contents);
    assert.ok(payload.includes(oil.name));
    assert.ok(!payload.includes(foreign.name));
    assert.deepEqual(await getScanDraft(owner, draft.draftId), draft);
    assert.deepEqual(await extractAndStoreDraft(owner, url, "repeat"), draft);
    assert.equal(generate.mock.callCount(), 1);
    const changed = (catalog_item_id: string) => ({
      ...draft, receipt: { ...draft.receipt, items: [{ ...line, catalog_item_id }] },
    });
    await assert.rejects(confirmReceipt(owner, changed(foreign.id)), /pilihan sudah tidak tersedia/);
    assert.ok(await getScanDraft(owner, draft.draftId));
    await db.item.update({ where: { id: oil.id }, data: { name: "Minyak Sawit", nameKey: "minyak sawit" } });
    await confirmReceipt(owner, draft);
    const saved = await db.receiptLine.findFirstOrThrow({ where: { businessId: business.id, receiptId: draft.draftId } });
    assert.equal(saved.itemId, oil.id);
    assert.equal(saved.baseQuantity?.toNumber(), 4);
    assert.equal(saved.lineTotal.toNumber(), 60000);

    // Without an active match, the proposed branded name remains a draft until approval.
    await db.item.update({ where: { id: oil.id }, data: { archivedAt: new Date() } });
    const next = await extractAndStoreDraft(owner, url.replace("nota.jpg", "nota-baru.jpg"), "new");
    assert.equal(next.receipt.items[0].proposed_name, "Minyak Goreng Sunco");
    assert.equal(await db.item.count({ where: { businessId: business.id, archivedAt: null } }), 0);
    await confirmReceipt(owner, next);
    const created = await db.item.findFirstOrThrow({ where: { businessId: business.id, archivedAt: null } });
    assert.equal(created.name, "Minyak Goreng Sunco");
    assert.equal(created.baseUnit, "LITER");
  } finally {
    await db.$disconnect();
  }
});
