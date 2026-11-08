import assert from "node:assert/strict";
import { test } from "node:test";
import { uploadReceiptPhoto, scanReceipt } from "./receipt-scan-service";
import {
  SaveReceiptInputSchema,
  ScanReceiptSchema,
} from "../types/scan";

test("an invalid photo is rejected on the server before uploading", async () => {
  let uploads = 0;
  const result = await uploadReceiptPhoto(
    new File(["x"], "a.pdf", { type: "application/pdf" }),
    {
      async upload() {
        uploads++;
        return {
          ok: true,
          imageUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
        };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(uploads, 0);
});

test("a valid photo is uploaded and its address returned", async () => {
  let uploads = 0;
  const result = await uploadReceiptPhoto(
    new File(["x"], "a.jpg", { type: "image/jpeg" }),
    {
      async upload() {
        uploads++;
        return {
          ok: true,
          imageUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
        };
      },
    },
  );
  assert.deepEqual(result, {
    ok: true,
    imageUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
  });
  assert.equal(uploads, 1);
});

test("scanning uses the image source and extractor for uploaded receipts", async () => {
  const imageUrl =
    "https://res.cloudinary.com/demo/image/upload/receipt.jpg";
  const receipt = {
    supplier_name: "Pasar",
    date: "2026-11-05",
    items: [
      {
        raw_name: "Telur",
        qty: 1,
        unit: "kg",
        unit_price: 1,
        line_total: 1,
        confidence: 1,
        matched_item: null,
      },
    ],
    total: 1,
    overall_confidence: 1,
  };
  let extracted = 0;
  let demoReads = 0;
  const result = await scanReceipt(imageUrl, {
    readDemoReceipt: async () => {
      demoReads++;
      return receipt;
    },
    imageSource: {
      async load(requestedUrl) {
        assert.equal(requestedUrl, imageUrl);
        return { bytes: new Uint8Array([1]), mimeType: "image/jpeg" };
      },
    },
    extractor: {
      async extract(image) {
        assert.deepEqual(image, {
          bytes: new Uint8Array([1]),
          mimeType: "image/jpeg",
        });
        extracted++;
        return receipt;
      },
    },
  });

  assert.deepEqual(result, { receipt, imageUrl });
  assert.equal(extracted, 1);
  assert.equal(demoReads, 0);
});

test("scanning without an image uses the demo reader", async () => {
  const receipt = {
    supplier_name: "Pasar",
    date: "2026-11-05",
    items: [
      {
        raw_name: "Telur",
        qty: 1,
        unit: "kg",
        unit_price: 1,
        line_total: 1,
        confidence: 1,
        matched_item: null,
      },
    ],
    total: 1,
    overall_confidence: 1,
  };
  let demoReads = 0;
  const result = await scanReceipt(undefined, {
    readDemoReceipt: async () => {
      demoReads++;
      return receipt;
    },
    imageSource: {
      async load() {
        throw new Error("No image should be fetched.");
      },
    },
    extractor: {
      async extract() {
        throw new Error("Demo receipt should not be extracted.");
      },
    },
  });

  assert.deepEqual(result, { receipt });
  assert.equal(demoReads, 1);
});

test("an incomplete extraction draft is reviewable but cannot be saved", () => {
  const draft = {
    supplier_name: "Tidak terbaca",
    date: "",
    items: [
      {
        raw_name: "Tidak terbaca",
        qty: 0,
        unit: "Tidak diketahui",
        unit_price: 0,
        line_total: 0,
        confidence: 0,
        matched_item: null,
      },
    ],
    total: 0,
    overall_confidence: 0,
  };

  assert.equal(ScanReceiptSchema.safeParse(draft).success, true);
  assert.equal(
    SaveReceiptInputSchema.safeParse({ receipt: draft }).success,
    false,
  );
});
