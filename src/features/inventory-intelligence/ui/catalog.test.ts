import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const id = "11111111-1111-4111-8111-111111111111";
const save = mock.fn(async (businessId: string, itemId: string | null, input: unknown) => ({ businessId, itemId, input }));
const archive = mock.fn(async (businessId: string, itemId: string) => businessId === "kantin" && itemId === id);
const recordOpname = mock.fn(async (actor: unknown, input: unknown) => ({
  snapshot: {
    id: "snap-1",
    itemId: id,
    source: "STANDALONE_OPNAME" as const,
    receiptLineId: null,
    countedQty: 0,
    postEventStock: 0,
    recordedAt: "2026-11-27T00:00:00.000Z",
    createdAt: "2026-11-27T00:00:00.000Z",
  },
  audit: null,
  actor,
  input,
}));
const session = mock.fn(async () => ({ membership: { businessId: "kantin", id: "member-1" } }));
mock.module("@/features/business-management/server", { namedExports: { requireActiveBusiness: session } });
mock.module(new URL("../services/catalog-service.ts", import.meta.url).href, { namedExports: { saveCatalogItem: save } });
mock.module(new URL("../services/movement-service.ts", import.meta.url).href, { namedExports: { deleteCatalogItem: archive } });
mock.module(new URL("../services/stock-opname-service.ts", import.meta.url).href, { namedExports: { recordStandaloneStockOpname: recordOpname } });
mock.module("next/cache", { namedExports: { revalidatePath() {} } });

test("catalog actions validate input and use only the active business", async () => {
  const { saveCatalogItemAction, deleteItemAction } = await import("./actions");
  const form = new FormData();
  form.set("businessId", "usaha-lain");
  form.set("baseUnit", "PCS");
  assert.equal((await saveCatalogItemAction(null, form)).ok, false);
  form.set("name", "Roti");
  assert.equal((await saveCatalogItemAction("invalid", form)).ok, false);
  assert.equal(save.mock.callCount(), 0);
  assert.equal((await saveCatalogItemAction(id, form)).ok, true);
  assert.deepEqual(save.mock.calls[0].arguments, ["kantin", id, { name: "Roti", baseUnit: "PCS" }]);
  assert.equal((await deleteItemAction(id, "catalog")).ok, true);
  assert.deepEqual(archive.mock.calls[0].arguments, ["kantin", id]);
  assert.equal(session.mock.callCount(), 4);
});

test("the catalog table links manual items to details and offers actions even before the first purchase", async () => {
  const { ItemMovementList } = await import("./item-movement-list");
  const html = renderToStaticMarkup(createElement(ItemMovementList, {
    items: [{
      name: "Roti",
      itemId: id,
      baseUnit: "PCS",
      lastPurchase: null,
      status: { kind: "not_enough_data", purchaseDays: 0 },
      speedflow: {
        speedflowPerDay: 0,
        confidence: "ESTIMATED",
        windowDays: 30,
        hasCountDiscrepancy: false,
        sampleCount: 0,
      },
    }],
    priceCells: {}, canOpenDetail: true,
  }));
  assert.match(html, /<table/);
  assert.match(html, /Tambah barang/);
  assert.match(html, /Belum ada pembelian/);
  assert.match(html, /aria-label="Aksi untuk Roti"/);
  assert.ok(html.includes(`href="/barang/${id}"`));
  const empty = renderToStaticMarkup(createElement(ItemMovementList, { items: [], priceCells: {}, canOpenDetail: false }));
  assert.match(empty, /Tambah barang/);
  assert.match(empty, /Belum ada barang/);
});

test("recordStockOpnameAction rejects empty input and accepts explicit 0", async () => {
  const { recordStockOpnameAction } = await import("./actions");

  const emptyForm = new FormData();
  emptyForm.set("itemId", id);
  emptyForm.set("countedQty", "");
  emptyForm.set("recordedAt", "2026-11-27");
  assert.equal((await recordStockOpnameAction(emptyForm)).ok, false);

  const zeroForm = new FormData();
  zeroForm.set("itemId", id);
  zeroForm.set("countedQty", "0");
  zeroForm.set("recordedAt", "2026-11-27");
  const res = await recordStockOpnameAction(zeroForm);
  assert.equal(res.ok, true);
  assert.equal(recordOpname.mock.callCount(), 1);
  assert.deepEqual(recordOpname.mock.calls[0].arguments, [
    { businessId: "kantin", memberId: "member-1" },
    { itemId: id, countedQty: 0, recordedAt: "2026-11-27" },
  ]);
});
