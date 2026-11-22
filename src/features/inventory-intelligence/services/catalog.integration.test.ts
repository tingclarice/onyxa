import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { randomUUID } from "node:crypto";

mock.module("server-only", {});
const testUrl = process.env.ONYXA_CATALOG_TEST_DATABASE_URL;

test("manual items share identity with receipt lines and stay inside their business", { skip: !testUrl }, async () => {
  process.env.DATABASE_URL = testUrl;
  process.env.SUPABASE_URL = testUrl;
  const { getPostgres, getPrisma } = await import("@/lib/prisma");
  const { saveCatalogItem } = await import("./catalog-service");
  const { deleteCatalogItem, getItemMovements } = await import("./movement-service");
  const { confirmReceipt } = await import("@/features/invoice-processing/services/receipt-draft-service");
  const db = getPostgres();
  try {
    const business = await db.business.create({ data: { name: "Kantin A" } });
    const other = await db.business.create({ data: { name: "Kantin B" } });
    const email = randomUUID() + "@example.invalid";
    const user = await db.user.create({ data: { email, name: "Test", passwordHash: "unused" } });
    const member = await db.businessMember.create({ data: { email, businessId: business.id, userId: user.id, role: "STAFF" } });
    const list = () => getItemMovements(business.id, { gracePercent: 20 });
    const original = { name: "Susu  Cokelat", baseUnit: "PCS" } as const;
    await saveCatalogItem(business.id, null, original);
    const [item] = await list();
    assert.equal(item.name, "Susu Cokelat");
    assert.equal(item.lastPurchase, null);
    await saveCatalogItem(other.id, null, original);
    await assert.rejects(saveCatalogItem(other.id, item.itemId, original), /tidak ditemukan/);
    assert.equal(await deleteCatalogItem(other.id, item.itemId), false);
    await assert.rejects(saveCatalogItem(business.id, null, { ...original, name: " susu cokelat " }), /sudah digunakan/);

    const renamed = { name: "Susu Segar", baseUnit: "LITER" } as const;
    await saveCatalogItem(business.id, item.itemId, renamed);
    await assert.rejects(saveCatalogItem(business.id, null, original), /sudah digunakan/);
    const saved = await confirmReceipt({ businessId: business.id, memberId: member.id }, {
      receipt: { supplier_name: "Pasar", date: "2026-11-20", total: 10000, overall_confidence: 1,
        items: [{ raw_name: "Susu Cokelat", qty: 1, unit: "liter", unit_price: 10000, line_total: 10000, confidence: 1, matched_item: null }] },
    });
    assert.equal((await list()).length, 1);
    assert.equal((await list())[0].lastPurchase?.unitPrice, 10000);
    await saveCatalogItem(business.id, item.itemId, { ...renamed, baseUnit: "KG" });
    assert.equal((await list())[0].baseUnit, "KG");
    assert.equal(await deleteCatalogItem(business.id, item.itemId), true);
    assert.deepEqual(await list(), []);
    const lines = await db.receiptLine.findMany({ where: { receiptId: saved.receiptId, businessId: business.id } });
    assert.equal(lines[0].itemId, item.itemId);
    assert.equal(lines[0].rawName, "Susu Cokelat");
    assert.equal(lines[0].baseUnit, "LITER");
    await saveCatalogItem(business.id, null, renamed);
    assert.equal((await list())[0].itemId, item.itemId);
  } finally {
    await Promise.all([db.$disconnect(), getPrisma().$disconnect()]);
  }
});
