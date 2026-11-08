import assert from "node:assert/strict";
import { test } from "node:test";
import type { ItemPurchase, ItemPurchaseHistory } from "../types/inventory";
import {
  calculateBurnRates,
  calculateDropPercent,
  calculateEma,
  calculateGraceDays,
  calculateItemMovement,
  combineSameDayPurchases,
  toLocalDateKey,
} from "./burn-rate-rules";

function history(purchases: ItemPurchase[]): ItemPurchaseHistory {
  return {
    itemId: "gula",
    name: "Gula pasir",
    baseUnit: "KG",
    purchases,
    lastPurchase: null,
  };
}

// Gula pasir: 10 kg lasts 5 days, twice → 2 kg/day. Last purchase 12 kg on 11 Oct.
const sugar = history([
  { date: "2026-10-01", quantity: 10 },
  { date: "2026-10-06", quantity: 10 },
  { date: "2026-10-11", quantity: 12 },
]);

test("burn rate of a purchase = quantity ÷ days until the next purchase", () => {
  assert.deepEqual(calculateBurnRates(sugar.purchases), [2, 2]);
});

test("the EMA gives recent burn rates more weight", () => {
  assert.equal(calculateEma([2, 2]), 2);
  // 0.4 × 1 + 0.6 × 2 = 1.6
  assert.equal(calculateEma([2, 1]), 1.6);
});

test("two receipts on the same day count as one purchase", () => {
  assert.deepEqual(
    combineSameDayPurchases([
      { date: "2026-10-06", quantity: 4 },
      { date: "2026-10-01", quantity: 10 },
      { date: "2026-10-06", quantity: 6 },
    ]),
    [
      { date: "2026-10-01", quantity: 10 },
      { date: "2026-10-06", quantity: 10 },
    ],
  );
});

test("fewer than three purchase days is not enough data", () => {
  const status = calculateItemMovement(
    history(sugar.purchases.slice(0, 2)),
    "2026-10-30",
    20,
  );
  assert.deepEqual(status, { kind: "not_enough_data", purchaseDays: 2 });
});

test("before the expected run-out date plus grace the item is normal", () => {
  // 12 kg ÷ 2 kg/day = 6 days → runs out 17 Oct; grace 20% × 6 = 1.2 days.
  const status = calculateItemMovement(sugar, "2026-10-18", 20);
  assert(status.kind === "normal");
  assert.equal(status.expectedDaysToRunOut, 6);
  assert.equal(status.expectedRunOutDate, "2026-10-17");
  assert.equal(status.restockDelayDays, 1);
});

test("past run-out plus grace it is Melambat, with the burn-rate drop and the delay", () => {
  // 28 Oct: 17 days since 12 kg → at most 12/17 ≈ 0.71 kg/day, usual 2 → −65%.
  const status = calculateItemMovement(sugar, "2026-10-28", 20);
  assert(status.kind === "slowing");
  assert.equal(status.daysSinceLastPurchase, 17);
  assert.equal(status.restockDelayDays, 11);
  assert.equal(status.burnRateDropPercent, 65);
});

test("a bigger grace % waits longer before warning", () => {
  // Expected 6 days; 13 days since purchase = 7 days late.
  assert.equal(calculateItemMovement(sugar, "2026-10-24", 20).kind, "slowing");
  assert.equal(calculateItemMovement(sugar, "2026-10-24", 150).kind, "normal");
});

test("grace is at least one day, and the drop is never negative", () => {
  assert.equal(calculateGraceDays(2, 10), 1);
  assert.equal(calculateGraceDays(10, 20), 2);
  assert.equal(calculateDropPercent(2, 3), 0);
  assert.equal(calculateDropPercent(2, 0.5), 75);
});

test("today is counted in Indonesian time (WIB)", () => {
  // 20:00 UTC on 7 Nov is already 03:00 on 8 Nov in Jakarta.
  assert.equal(toLocalDateKey(new Date("2026-11-07T20:00:00Z")), "2026-11-08");
});
