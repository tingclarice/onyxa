import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { randomUUID } from "node:crypto";
import type { ScanReceipt } from "../types/scan";

mock.module("server-only", {});
const baseUrl = "https://res.cloudinary.com/draft-test/image/upload";
const extracted: ScanReceipt = {
  supplier_name: "Pasar", date: "", total: 17300, discount: 700, overall_confidence: 0.5,
  items: [{ raw_name: "Beras", qty: 2, unit: "kg", unit_price: 10000, line_total: 20000,
    discount: 2000, confidence: 0.7, matched_item: null }],
};
const scan = mock.fn(async (imageUrl: string) => ({ receipt: extracted, imageUrl }));
const camera = mock.fn(async () => ({ receipt: extracted, imageUrl: baseUrl + "/camera.jpg" }));
mock.module(new URL("./receipt-scan-service.ts", import.meta.url).href, {
  namedExports: { scanReceipt: scan, uploadAndScanReceipt: camera },
});

// Run on a disposable, migrated PostgreSQL database. No Gemini or Cloudinary calls.
const testUrl = process.env.ONYXA_DRAFT_TEST_DATABASE_URL;
test("drafts survive reload, isolate uploaders, and approve atomically just once", { skip: !testUrl }, async () => {
  process.env.DATABASE_URL = testUrl;
  process.env.CLOUDINARY_CLOUD_NAME = "draft-test";
  const { getPostgres } = await import("@/lib/prisma");
  const { extractAndStoreDraft, getScanDrafts, getScanDraft, confirmReceipt, deleteScanDraft } = await import("./receipt-draft-service");
  const db = getPostgres();
  try {
    const business = await db.business.create({ data: { name: "Draft integration test" } });
    async function addMember() {
      const email = randomUUID() + "@example.invalid";
      const user = await db.user.create({ data: { email, name: "Test", passwordHash: "unused" } });
      const member = await db.businessMember.create({
        data: { email, userId: user.id, businessId: business.id, role: "STAFF" },
      });
      return { businessId: business.id, memberId: member.id };
    }
    const owner = await addMember();
    const other = await addMember();
    const source = baseUrl + "/first.jpg";
    const draft = await extractAndStoreDraft(owner, source, "test");
    assert.deepEqual(draft.receipt, extracted);
    for (let reload = 0; reload < 2; reload++) {
      assert.equal((await getScanDrafts(owner))[0].id, draft.draftId);
      assert.deepEqual(await getScanDraft(owner, draft.draftId), draft);
    }
    assert.equal((await extractAndStoreDraft(owner, source, "retry")).draftId, draft.draftId);
    assert.equal(scan.mock.callCount(), 1);
    const corrected = { ...extracted, date: "2026-11-22", supplier_name: "Pasar Pagi" };
    for (const stranger of [other, { ...owner, businessId: randomUUID() }]) {
      assert.deepEqual(await getScanDrafts(stranger), []);
      assert.equal(await getScanDraft(stranger, draft.draftId), null);
      await deleteScanDraft(stranger, draft.draftId);
      await assert.rejects(confirmReceipt(stranger, { ...draft, receipt: corrected }), /tidak tersedia/);
      await assert.rejects(extractAndStoreDraft(stranger, baseUrl + "/next.jpg", "replace", draft.draftId), /tidak tersedia/);
    }
    assert.equal(scan.mock.callCount(), 1);
    for (const count of [
      await db.receipt.count({ where: { businessId: business.id } }),
      await db.item.count({ where: { businessId: business.id } }),
      await db.supplier.count({ where: { businessId: business.id } }),
    ]) assert.equal(count, 0);

    const replaced = await extractAndStoreDraft(owner, baseUrl + "/correct.jpg", "replace", draft.draftId);
    assert.equal(replaced.draftId, draft.draftId);
    assert.deepEqual(await getScanDraft(owner, draft.draftId), replaced);
    await assert.rejects(confirmReceipt(owner, { ...draft, receipt: corrected }), /diganti/);
    await assert.rejects(confirmReceipt(owner, { ...replaced, receipt: { ...corrected,
      items: [{ ...corrected.items[0], qty: 1e30 }] } }));
    assert.deepEqual(await getScanDraft(owner, draft.draftId), replaced);
    assert.equal(await db.supplier.count({ where: { businessId: business.id } }), 0);

    const approve = () => confirmReceipt(owner, { ...replaced, receipt: corrected });
    const [one, two] = await Promise.all([approve(), approve()]);
    assert.deepEqual(one, two);
    assert.equal(one.receiptId, draft.draftId);
    assert.deepEqual(await getScanDrafts(owner), []);
    const approved = await db.receipt.findMany({ where: { businessId: business.id }, include: { lines: true } });
    assert.equal(approved.length, 1);
    assert.equal(approved[0].supplierName, "Pasar Pagi");
    assert.equal(approved[0].total.toNumber(), 17300);
    assert.equal(approved[0].lines.length, 1);
    assert.equal(approved[0].lines[0].discount.toNumber(), 2000);

    const file = new File(["camera fixture"], "camera.jpg", { type: "image/jpeg" });
    const photo = await extractAndStoreDraft(owner, file, "camera");
    assert.deepEqual(await extractAndStoreDraft(owner, file, "retry"), photo);
    assert.equal(camera.mock.callCount(), 1);
    await deleteScanDraft(owner, photo.draftId);
    assert.equal(await getScanDraft(owner, photo.draftId), null);
    await assert.rejects(extractAndStoreDraft({ ...owner, memberId: randomUUID() }, source, "failed-save"),
      { code: "review_storage_failed" });
  } finally {
    await db.$disconnect();
  }
});
