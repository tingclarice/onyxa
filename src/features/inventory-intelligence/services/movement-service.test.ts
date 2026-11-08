import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ItemPurchaseHistory } from "../types/inventory";

function item(name: string, dates: string[], quantity = 10): ItemPurchaseHistory {
  return {
    itemId: name.toLowerCase(),
    name,
    baseUnit: "KG",
    purchases: dates.map((date) => ({ date, quantity })),
    lastPurchase: null,
  };
}
// Every 5 days → expected 5 days. On 30 Oct:
// Gula last 25 Oct (5 days, normal), Tepung last 15 Oct (10 days late),
// Kopi last 20 Oct (5 days late), Garam only 2 purchases.
const histories = [
  item("Gula", ["2026-10-15", "2026-10-20", "2026-10-25"]),
  item("Tepung", ["2026-10-05", "2026-10-10", "2026-10-15"]),
  item("Kopi", ["2026-10-10", "2026-10-15", "2026-10-20"]),
  item("Garam", ["2026-10-10", "2026-10-15"]),
];
const requestedBusinesses: string[] = [];

mock.module(
  pathToFileURL(
    resolve("src/features/inventory-intelligence/repository/purchase-history-repository.ts"),
  ).href,
  {
    namedExports: {
      async listItemPurchaseHistories(businessId: string) {
        requestedBusinesses.push(businessId);
        return histories;
      },
      async findItemPurchaseHistory(businessId: string, itemId: string) {
        requestedBusinesses.push(businessId);
        return histories.find((h) => h.itemId === itemId) ?? null;
      },
    },
  },
);
const service = import("./movement-service");
// 12:00 WIB on 30 Oct.
const now = new Date("2026-10-30T05:00:00Z");
const settings = { gracePercent: 20 };

test("items are listed most-late first, then by name", async () => {
  const { getItemMovements } = await service;
  const movements = await getItemMovements("business", settings, now);
  assert.deepEqual(
    movements.map((m) => [m.name, m.status.kind]),
    [
      ["Tepung", "slowing"],
      ["Kopi", "slowing"],
      ["Garam", "not_enough_data"],
      ["Gula", "normal"],
    ],
  );
  assert.deepEqual(requestedBusinesses.at(-1), "business");
});

test("the warning list contains only slowing items", async () => {
  const { getSlowingItems } = await service;
  const slowing = await getSlowingItems("business", settings, now);
  assert.deepEqual(slowing.map((m) => m.name), ["Tepung", "Kopi"]);
});

test("item detail shows purchases newest first; unknown items return null", async () => {
  const { getItemMovementDetail } = await service;
  const detail = await getItemMovementDetail("business", "tepung", settings, now);
  assert.equal(detail?.purchases[0].date, "2026-10-15");
  assert.equal(await getItemMovementDetail("business", "missing", settings, now), null);
});
