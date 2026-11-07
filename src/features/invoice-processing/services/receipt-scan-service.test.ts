import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

let uploads = 0;
let reads = 0;

function repositoryFile(name: string) {
  return pathToFileURL(
    resolve(`src/features/invoice-processing/repository/${name}.ts`),
  ).href;
}
class CloudinaryUploadError extends Error {
  constructor(
    message: string,
    readonly code: "cloudinary_not_configured" | "cloudinary_upload_failed",
  ) {
    super(message);
  }
}
mock.module(repositoryFile("receipt-image-storage"), {
  namedExports: {
    CloudinaryUploadError,
    async uploadImageToCloudinary() {
      uploads++;
      return "https://res.cloudinary.com/demo/image/upload/receipt.jpg";
    },
    isOurCloudinaryImageUrl: (url: string) =>
      url.startsWith("https://res.cloudinary.com/demo/"),
  },
});
mock.module(repositoryFile("demo-receipt-reader"), {
  namedExports: {
    async readReceiptFromImage() {
      reads++;
      return {
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
    },
  },
});
const service = import("./receipt-scan-service");
beforeEach(() => {
  uploads = 0;
  reads = 0;
});

test("an invalid photo is rejected on the server before uploading", async () => {
  const { uploadReceiptPhoto } = await service;
  const result = await uploadReceiptPhoto(
    new File(["x"], "a.pdf", { type: "application/pdf" }),
  );
  assert.equal(result.ok, false);
  assert.equal(uploads, 0);
});

test("a valid photo is uploaded and its address returned", async () => {
  const { uploadReceiptPhoto } = await service;
  const result = await uploadReceiptPhoto(
    new File(["x"], "a.jpg", { type: "image/jpeg" }),
  );
  assert.deepEqual(result, {
    ok: true,
    imageUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
  });
});

test("scanning refuses image addresses outside our Cloudinary account", async () => {
  const { scanReceipt } = await service;
  await assert.rejects(scanReceipt("https://evil.example.com/a.jpg"));
  assert.equal(reads, 0);
  const result = await scanReceipt(
    "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
  );
  assert.equal(result.receipt.supplier_name, "Pasar");
  assert.equal(reads, 1);
});
