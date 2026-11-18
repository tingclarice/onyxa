import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { ScanReceiptError, type ReceiptImage } from "../types/scan";

const imageUrl = "https://res.cloudinary.com/onyxa/image/upload/receipt.jpg";
const image: ReceiptImage = { bytes: Uint8Array.of(1, 2), mimeType: "image/jpeg" };
const extractedReceipt = {
  supplier_name: "Pemasok",
  date: "2026-11-01",
  items: [{
    raw_name: "Beras",
    qty: 2,
    unit: "kg",
    unit_price: 0,
    line_total: 20000,
    confidence: 0.9,
    matched_item: null,
  }],
  total: 20000,
  overall_confidence: 0.9,
};

const upload = mock.fn(async (file: File) => {
  assert.equal(file.type, image.mimeType);
  return { ok: true, imageUrl };
});
const load = mock.fn(async (url: string) => {
  assert.equal(url, imageUrl);
  return image;
});
const extract = mock.fn(async (input: ReceiptImage) => {
  assert.deepEqual(input, image);
  return extractedReceipt;
});

mock.module(new URL("../repository/receipt-image-storage.ts", import.meta.url).href, {
  namedExports: { uploadImageToCloudinary: upload },
});
mock.module(new URL("../repository/cloudinary-image.ts", import.meta.url).href, {
  namedExports: { fetchCloudinaryReceiptImage: load },
});
mock.module(new URL("../repository/gemini.ts", import.meta.url).href, {
  namedExports: { createGeminiReceiptExtractor: () => ({ extract }) },
});

const service = import("./receipt-scan-service");

beforeEach(() => {
  upload.mock.resetCalls();
  load.mock.resetCalls();
  extract.mock.resetCalls();
});

test("rejects an empty image before calling either provider", async () => {
  const { uploadAndScanReceipt } = await service;
  await assert.rejects(
    uploadAndScanReceipt(new File([], "receipt.jpg", { type: image.mimeType })),
    (error: unknown) => error instanceof ScanReceiptError && error.code === "unreadable_image",
  );
  assert.equal(upload.mock.callCount(), 0);
  assert.equal(extract.mock.callCount(), 0);
});

test("uploads and reads the same file without downloading it again", async () => {
  const { uploadAndScanReceipt } = await service;
  const result = await uploadAndScanReceipt(
    new File([Uint8Array.of(1, 2)], "receipt.jpg", { type: image.mimeType }),
  );
  assert.equal(upload.mock.callCount(), 1);
  assert.equal(extract.mock.callCount(), 1);
  assert.equal(load.mock.callCount(), 0);
  assert.equal(result.imageUrl, imageUrl);
  assert.equal(result.receipt.items[0]?.unit_price, 10000);
});

test("reads a previously uploaded photo using its real image URL", async () => {
  const { scanReceipt } = await service;
  const result = await scanReceipt(imageUrl);
  assert.equal(result.imageUrl, imageUrl);
  assert.equal(load.mock.callCount(), 1);
  assert.equal(extract.mock.callCount(), 1);
  assert.equal(upload.mock.callCount(), 0);
});
