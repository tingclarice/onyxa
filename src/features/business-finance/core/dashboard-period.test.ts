import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveDashboardPeriod } from "./dashboard-period";
import { buildPeriodDashboard } from "./finance-rules";

test("an unfiltered report defaults to month to date; invalid URL filters get a correction message", () => {
  const today = "2026-01-02";
  assert.deepEqual(resolveDashboardPeriod({}, today), { period: { start: "2026-01-01", end: today }, error: null });
  for (const filter of [
    { start: "2026-01-01" }, { end: "2026-01-02" }, { start: "2026-02-30", end: today },
    { start: "2026-01-03", end: today }, { start: [today, today], end: today },
    { start: "0000-01-01", end: today },
  ]) assert.ok(resolveDashboardPeriod(filter, today).error);
});

test("an inclusive range crossing leap day drives all BI sections", () => {
  const period = { start: "2024-02-28", end: "2024-03-01" };
  const dates = ["2024-02-27", period.start, period.end, "2024-03-02"];
  const data = buildPeriodDashboard(period, dates.map((date) => ({ date, cash: 4, qris: 1 })),
    dates.map((date) => ({ date, total: 2, lines: [{ name: "Teh", itemId: "tea", quantity: 1, unit: "pcs", amount: 2, category: "Minuman" }] })));
  assert.deepEqual(data.cashFlow.map((point) => [point.date, point.income, point.expense]),
    [[period.start, 5, 2], ["2024-02-29", 0, 0], [period.end, 5, 2]]);
  assert.deepEqual([data.income, data.expense, data.balance, data.average], [10, 4, 6, 5]);
  assert.deepEqual(data.channels.map((row) => row.value), [8, 2]);
  assert.deepEqual(data.categories, [{ name: "Minuman", value: 4 }]);
  assert.deepEqual(data.ranking.map((row) => [row.interval, row.quantities]), [[2, [["pcs", 2]]]]);
});

test("long periods group the chart without including out-of-range dates or averaging by chart bucket", () => {
  const period = { start: "2024-10-25", end: "2025-02-03" };
  const dates = ["2024-10-24", "2024-10-25", "2024-10-26", "2025-02-03", "2025-02-04"];
  const data = buildPeriodDashboard(period, dates.map((date) => ({ date, cash: 5, qris: 0 })), []);
  assert.equal(data.chartInterval, "month");
  assert.deepEqual(data.cashFlow.map((row) => row.income), [10, 0, 0, 0, 5]);
  assert.equal(data.depositDays, 3);
  assert.equal(data.average, 5);
});
