import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPeriodDashboard, businessDate } from "./finance-rules";
import type { Purchase } from "../types/finance";

const line = { itemId: "oil", name: "Minyak", quantity: 2, unit: "liter", amount: 300, category: null };
test("cash and QRIS are averaged per distinct deposit date in the current WIB month", () => {
  assert.equal(businessDate(new Date("2026-10-31T17:00:00Z")), "2026-11-01");
  const data = buildPeriodDashboard({ start: "2026-11-01", end: "2026-11-08" }, [
    { date: "2026-10-31", cash: 9000, qris: 0 }, { date: "2026-11-02", cash: 100, qris: 0 },
    { date: "2026-11-02", cash: 0, qris: 50 }, { date: "2026-11-06", cash: 20, qris: 30 },
    { date: "2026-11-09", cash: 999, qris: 0 },
  ], []);
  assert.deepEqual([data.income, data.depositDays, data.average], [200, 2, 100]);
  assert.deepEqual(data.cashFlow.map((day) => day.income), [0,150,0,0,0,50,0,0]);
  assert.equal(buildPeriodDashboard({ start: "2026-11-01", end: "2026-11-08" }, [], []).average, null);
});

test("category spending reconciles to net receipts and repeated lines count as a single restock date", () => {
  const purchases: Purchase[] = [
    { date: "2026-11-01", total: 450, lines: [line, { ...line, itemId: "tea", name: "Teh", amount: 200, category: "Minuman" }] },
    { date: "2026-11-05", total: 100, lines: [{ ...line, quantity: 1, unit: "pcs" }, line] },
  ];
  const data = buildPeriodDashboard({ start: "2026-11-01", end: "2026-11-08" }, [], purchases);
  assert.deepEqual([data.balance, data.expense], [-550, 550]);
  assert.deepEqual(data.categories, [{ name: "Belum dikategorikan", value: 370 }, { name: "Minuman", value: 180 }]);
  assert.deepEqual(data.ranking[0], { name: "Minyak", key: "oil", amount: 370, quantities: [["liter",4],["pcs",1]], interval: 4, status: "Cepat" });
  assert.equal(data.ranking[1].status, "Belum cukup data");
});
