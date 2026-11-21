import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TransactionDetail } from "../types/transactions";

const id = "11111111-1111-4111-8111-111111111111";
const receipt: TransactionDetail = {
  supplierName: "Pasar", date: "2026-11-21", discount: 3000, total: 27000, subtotal: 30000,
  lines: [{ position: 1, name: "Roti", quantity: 3, unit: "pcs", unitPrice: 11000, discount: 3000, lineTotal: 30000 }],
  imageUrl: null,
};
mock.module("next/navigation", { namedExports: {
  useRouter: () => ({}),
  notFound: () => { throw new Error("404"); },
} });
mock.module("@/features/invoice-processing/server", {
  namedExports: { getActiveBusinessTransaction: async (requested: string) => requested === id ? receipt : null },
});

test("transaction rows link to the detail page and omit the saved label", async () => {
  const { ReceiptTransactions } = await import("./receipt-transactions");
  const html = renderToStaticMarkup(createElement(ReceiptTransactions, {
    receipts: [{ ...receipt, id, status: "saved" }],
  }));
  assert.match(html, /<table/);
  assert.ok(html.includes(`href="/transaksi/${id}"`));
  assert.match(html, /Rp27\.000/);
  assert.doesNotMatch(html, /Tersimpan/);
});

test("detail shows purchased items, discounts, final total and the available receipt image", async () => {
  const { default: Page } = await import("@/app/(authenticated)/transaksi/[id]/page");
  const params = Promise.resolve({ id });
  const manual = renderToStaticMarkup(await Page({ params }));
  assert.match(manual, /Roti/);
  assert.match(manual, /Potongan seluruh nota/);
  assert.match(manual, /Rp27\.000/);
  assert.doesNotMatch(manual, /Foto nota/);
  receipt.imageUrl = "https://res.cloudinary.com/example/image/upload/nota.jpg";
  const scanned = renderToStaticMarkup(await Page({ params }));
  assert.ok(scanned.includes(`src="${receipt.imageUrl}"`));
  await assert.rejects(Page({ params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) }), /404/);
});
