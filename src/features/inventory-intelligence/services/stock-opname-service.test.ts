import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  StockOpnameError,
  type ItemPurchaseHistory,
  type StockSnapshotRecord,
} from "../types/inventory";

let existingItems = new Set<string>();
let snapshots: StockSnapshotRecord[] = [];
let purchaseHistory: ItemPurchaseHistory | null = null;

mock.module(
  pathToFileURL(
    resolve("src/features/inventory-intelligence/repository/stock-snapshot-repository.ts"),
  ).href,
  {
    namedExports: {
      async activeItemExists(_businessId: string, itemId: string) {
        return existingItems.has(itemId);
      },
      async createStandaloneStockSnapshot(input: {
        itemId: string;
        countedQty: number;
        recordedAt: Date;
      }) {
        const record: StockSnapshotRecord = {
          id: `snap-${snapshots.length + 1}`,
          itemId: input.itemId,
          source: "STANDALONE_OPNAME",
          receiptLineId: null,
          countedQty: input.countedQty,
          postEventStock: input.countedQty,
          recordedAt: input.recordedAt.toISOString(),
          createdAt: new Date("2026-11-27T10:00:00.000Z").toISOString(),
        };
        snapshots.push(record);
        return record;
      },
      async listStockSnapshotsForItem() {
        return [...snapshots];
      },
    },
  },
);

mock.module(
  pathToFileURL(
    resolve("src/features/inventory-intelligence/repository/purchase-history-repository.ts"),
  ).href,
  {
    namedExports: {
      async findItemPurchaseHistory() {
        return purchaseHistory;
      },
    },
  },
);

const service = import("./stock-opname-service");
const actor = { businessId: "biz-1", memberId: "mem-1" };
const ITEM_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  existingItems = new Set([ITEM_ID]);
  snapshots = [];
  purchaseHistory = {
    itemId: ITEM_ID,
    name: "Gula Pasir",
    baseUnit: "KG",
    purchases: [{ date: "2026-11-05", quantity: 10 }],
    restocks: [
      {
        receiptLineId: "line-1",
        date: "2026-11-05",
        recordedAt: "2026-11-05T00:00:00.000Z",
        quantity: 10,
        lineTotal: 150_000,
        createdAt: "2026-11-05T01:00:00.000Z",
      },
    ],
    lastPurchase: null,
  };
});

test("rejects opname for an item not in the active business", async () => {
  const { recordStandaloneStockOpname } = await service;
  await assert.rejects(
    () =>
      recordStandaloneStockOpname(actor, {
        itemId: "22222222-2222-4222-8222-222222222222",
        countedQty: 5,
        recordedAt: "2026-11-10",
      }),
    StockOpnameError,
  );
});

test("first opname creates anchor with null audit; second opname with 0 triggers reconciliation", async () => {
  const { recordStandaloneStockOpname } = await service;

  const first = await recordStandaloneStockOpname(actor, {
    itemId: ITEM_ID,
    countedQty: 10,
    recordedAt: "2026-11-01",
  });
  assert.equal(first.snapshot.countedQty, 10);
  assert.equal(first.snapshot.postEventStock, 10);
  assert.equal(first.audit, null);

  const second = await recordStandaloneStockOpname(actor, {
    itemId: ITEM_ID,
    countedQty: 0,
    recordedAt: "2026-11-11",
  });
  assert.equal(second.snapshot.countedQty, 0);
  assert.equal(second.snapshot.postEventStock, 0);
  assert.ok(second.audit);
  // 10 initial + 10 restocked on Nov 5 - 0 remaining = 20 units over 10 days = 2/day
  assert.equal(second.audit.actualUnitsOut, 20);
  assert.equal(second.audit.auditSpeedflow, 2);
  assert.equal(second.audit.actualCOGS, 300_000);
});
