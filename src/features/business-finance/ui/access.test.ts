import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const redirect = () => { throw new Error("redirect:/scan"); };
mock.module("next/navigation", { namedExports: { redirect, notFound: () => { throw new Error("404"); }, usePathname: () => "/scan", useRouter: () => ({}) } });
mock.module("@/features/business-management/server", { namedExports: {
  getBusinessWorkspace: async () => ({ active: { role: "STAFF" } }), requireBusinessOwner: redirect,
} });
const dashboard = mock.fn(() => { throw new Error("BI data should not be read"); });
mock.module("@/features/business-finance/server", { namedExports: { getDashboard: dashboard } });
mock.module("@/features/inventory-intelligence/server", { namedExports: { getActiveBusinessItemDetail: dashboard } });
mock.module("@/features/procurement-pricing/server", { namedExports: { getActiveBusinessItemPriceDetail: dashboard } });
mock.module("@/features/inventory-intelligence/ui/delete-item-button", { namedExports: { DeleteItemButton: () => null } });
mock.module("@/features/invoice-processing/server", { namedExports: { getActiveBusinessTransaction: async () => ({
  supplierName: "Pasar", date: "2026-11-22", total: 10, subtotal: 10, discount: 0, lines: [], imageUrl: null,
}) } });

test("staff navigation and direct routes enforce dashboard and item restrictions while allowing transaction details", async () => {
  const { AppNavigation } = await import("@/components/app-navigation");
  const nav = renderToStaticMarkup(createElement(AppNavigation, { isOwner: false }));
  assert.ok(!nav.includes('href="/beranda"'));
  assert.ok(nav.includes('href="/pemasukan"') && nav.includes('href="/transaksi"'));
  const home = await import("@/app/(authenticated)/beranda/page");
  await assert.rejects(home.default({ searchParams: Promise.resolve({ start: "2026-01-01", end: "2026-03-31" }), params: Promise.resolve({}) }), /redirect:\/scan/);
  const params = Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" });
  const item = await import("@/app/(authenticated)/barang/[id]/page");
  await assert.rejects(item.default({ params }), /redirect:\/scan/);
  assert.equal(dashboard.mock.callCount(), 0);
  const transaction = await import("@/app/(authenticated)/transaksi/[id]/page");
  assert.match(renderToStaticMarkup(await transaction.default({ params })), /Pasar/);
});
