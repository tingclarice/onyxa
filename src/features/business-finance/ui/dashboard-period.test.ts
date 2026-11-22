import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { DashboardFilter } from "../types/finance";
import { resolveDashboardPeriod } from "../core/dashboard-period";
import { buildPeriodDashboard } from "../core/finance-rules";

mock.module("@/features/business-management/server", { namedExports: {
  getBusinessWorkspace: async () => ({ active: { role: "OWNER", business: { name: "Kantin" } } }),
} });
const getDashboard = mock.fn(async (filter: DashboardFilter) => {
  const { period, error } = resolveDashboardPeriod(filter, "2026-11-22");
  return { period, error, data: error ? null : buildPeriodDashboard(period, [], []) };
});
mock.module("@/features/business-finance/server", { namedExports: { getDashboard } });

test("the owner can open a filtered dashboard URL, reset it, and correct invalid dates", async () => {
  const { default: Page } = await import("@/app/(authenticated)/beranda/page");
  const params = Promise.resolve({});
  const filter = { start: "2026-08-29", end: "2026-09-05" };
  const html = renderToStaticMarkup(await Page({ params, searchParams: Promise.resolve(filter) }));
  assert.deepEqual(getDashboard.mock.calls[0].arguments, [filter]);
  assert.match(html, /<details><summary[^>]*>/);
  assert.match(html, /Filter tanggal<\/summary><form/);
  for (const text of ['action="/beranda"', 'name="start"', 'name="end"', filter.start, filter.end, 'Terapkan', 'Bulan berjalan', 'Rata-rata setoran per hari']) {
    assert.ok(html.includes(text), text);
  }
  const invalid = renderToStaticMarkup(await Page({ params, searchParams: Promise.resolve({ start: filter.end, end: filter.start }) }));
  assert.match(invalid, /<details open=""/);
  assert.match(invalid, /role="alert"/);
  assert.doesNotMatch(invalid, /Rata-rata setoran per hari/);
});
