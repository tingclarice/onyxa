import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import type { ReceiptDraftSummary, StoredReceiptDraft } from "../types/scan";

const draft: StoredReceiptDraft = {
  draftId: "11111111-1111-4111-8111-111111111111",
  imageUrl: "https://res.cloudinary.com/example/image/upload/foto.jpg",
  receipt: {
    supplier_name: "Pasar", date: "", total: 10000, overall_confidence: 0.8,
    items: [{ raw_name: "Beras", qty: 1, unit: "kg", unit_price: 10000, line_total: 10000,
      confidence: 0.9, matched_item: null }],
  },
};
const scan = mock.fn(() => { throw new Error("Reload must not scan an image"); });
mock.module(new URL("./actions.ts", import.meta.url).href, {
  namedExports: { scanReceiptAction: scan, uploadAndScanReceiptAction: scan, discardDraftAction: mock.fn(), saveReceiptAction: mock.fn() },
});
mock.module("next/navigation", { namedExports: { useRouter: () => ({}) } });
let drafts = Promise.resolve<ReceiptDraftSummary[] | null>([
  { id: draft.draftId, name: "Pasar", imageUrl: draft.imageUrl },
]);
mock.module("@/features/invoice-processing/server", { namedExports: {
  getMyScanDrafts: async () => ({ memberId: "uploader", drafts }),
  getMyScanDraft: async (id: string) => id === draft.draftId ? draft : null,
} });

test("both scan pages render a persisted extraction on successive requests", async () => {
  const { default: ScanPage } = await import("@/app/(authenticated)/scan/page");
  const { default: ReviewPage } = await import("@/app/(authenticated)/scan/review/page");
  for (let reload = 0; reload < 2; reload++) {
    const stream = await renderToReadableStream(await ScanPage());
    await stream.allReady;
    const queue = await new Response(stream).text();
    assert.ok(queue.includes(`/scan/review?receiptId=${draft.draftId}`));
    assert.match(queue, /Draf siap dicek/);
    const review = renderToStaticMarkup(await ReviewPage({
      searchParams: Promise.resolve({ receiptId: draft.draftId }), params: Promise.resolve({}),
    }));
    assert.match(review, /Beras/);
    assert.match(review, /Setujui dan simpan/);
    assert.ok(review.includes(draft.imageUrl));
  }
  assert.equal(scan.mock.callCount(), 0);
});

test("the upload panel stays visible while drafts load and when they are empty or unavailable", async (context) => {
  const { default: ScanPage } = await import("@/app/(authenticated)/scan/page");
  const original = drafts;
  context.after(() => { drafts = original; });
  function checkPanel(html: string) {
    for (const text of ["Scan nota belanja", "Foto tegak", "Tambahkan foto nota", "Ambil foto", "Pilih dari galeri", "Catat manual"]) {
      assert.ok(html.includes(text), text);
    }
    assert.doesNotMatch(html, /<ul aria-label="Foto nota"/);
  }
  drafts = new Promise(() => {});
  checkPanel(renderToStaticMarkup(await ScanPage()));
  for (const result of [[], null]) {
    drafts = Promise.resolve(result);
    const stream = await renderToReadableStream(await ScanPage());
    await stream.allReady;
    const html = await new Response(stream).text();
    checkPanel(html);
    assert.equal(html.includes("Draf belum bisa dimuat"), result === null);
  }
});
