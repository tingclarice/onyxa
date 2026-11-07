import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import {
  MAX_RECEIPT_IMAGE_BYTES,
  ScanReceiptError,
  type ReceiptImage,
  type ScanReceipt,
} from "@/features/invoice-processing/types/scan";

mock.module("server-only", {});

const cloudinaryImageModule = import(
  "@/features/invoice-processing/repository/cloudinary-image"
);
const geminiModule = import("@/features/invoice-processing/repository/gemini");
const extractionServiceModule = import(
  "@/features/invoice-processing/services/extract-receipt"
);

const cloudinaryUrl =
  "https://res.cloudinary.com/test-cloud/image/upload/v1234567890/receipt.jpg";
const image: ReceiptImage = {
  bytes: new Uint8Array([1, 2, 3]),
  mimeType: "image/jpeg",
};

const validReceipt: ScanReceipt = {
  supplier_name: "Toko Sumber Makmur",
  date: "2026-10-12",
  items: [
    {
      raw_name: "Beras",
      qty: 2,
      unit: "kg",
      unit_price: 15000,
      line_total: 30000,
      confidence: 0.94,
      matched_item: null,
    },
  ],
  total: 30000,
  overall_confidence: 0.92,
};

beforeEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
});

function createImageSource(receiptImage: ReceiptImage = image) {
  return {
    async load() {
      return receiptImage;
    },
  };
}

test("valid receipt image is extracted and validated against the receipt contract", async () => {
  const { createGeminiReceiptExtractor } = await geminiModule;
  const { extractReceiptFromImageUrl } = await extractionServiceModule;
  let requestCount = 0;
  const extractor = createGeminiReceiptExtractor(
    () => "test-api-key",
    async (apiKey, submittedImage) => {
      requestCount++;
      assert.equal(apiKey, "test-api-key");
      assert.deepEqual(submittedImage, image);
      return JSON.stringify(validReceipt);
    },
  );

  const receipt = await extractReceiptFromImageUrl(cloudinaryUrl, {
    imageSource: createImageSource(),
    extractor,
  });

  assert.deepEqual(receipt, validReceipt);
  assert.equal(requestCount, 1);
});

test("malformed Gemini JSON returns a safe invalid-output error", async () => {
  const { createGeminiReceiptExtractor } = await geminiModule;
  const { extractReceiptFromImageUrl } = await extractionServiceModule;
  const extractor = createGeminiReceiptExtractor(
    () => "test-api-key",
    async () => '{"supplier_name":',
  );

  await assert.rejects(
    extractReceiptFromImageUrl(cloudinaryUrl, {
      imageSource: createImageSource(),
      extractor,
    }),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "invalid_model_output" &&
      !error.message.includes("supplier_name"),
  );
});

test("invalid structured model data is rejected by the Zod receipt schema", async () => {
  const { extractReceiptFromImageUrl } = await extractionServiceModule;
  await assert.rejects(
    extractReceiptFromImageUrl(cloudinaryUrl, {
      imageSource: createImageSource(),
      extractor: { async extract() { return { supplier_name: "Missing fields" }; } },
    }),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "invalid_model_output",
  );
});

test("low-confidence values and unknown-value sentinels remain reviewable", async () => {
  const { createGeminiReceiptExtractor } = await geminiModule;
  const { extractReceiptFromImageUrl } = await extractionServiceModule;
  const uncertainReceipt: ScanReceipt = {
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
  const extractor = createGeminiReceiptExtractor(
    () => "test-api-key",
    async () => JSON.stringify(uncertainReceipt),
  );

  const result = await extractReceiptFromImageUrl(cloudinaryUrl, {
    imageSource: createImageSource(),
    extractor,
  });

  assert.deepEqual(result, uncertainReceipt);
});

test("invalid Cloudinary URLs are rejected before any fetch", async () => {
  const { fetchCloudinaryReceiptImage } = await cloudinaryImageModule;
  let fetchCount = 0;
  const fetcher: typeof fetch = async () => {
    fetchCount++;
    return new Response(new Uint8Array([1]), {
      headers: { "content-type": "image/jpeg" },
    });
  };

  await assert.rejects(
    fetchCloudinaryReceiptImage("https://example.com/receipt.jpg", fetcher),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "cloudinary_image_invalid",
  );
  await assert.rejects(
    fetchCloudinaryReceiptImage(
      "https://res.cloudinary.com/another-cloud/image/upload/v123/receipt.jpg",
      fetcher,
    ),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "cloudinary_image_invalid",
  );
  await assert.rejects(
    fetchCloudinaryReceiptImage(
      "https://res.cloudinary.com/test-cloud/image/upload",
      fetcher,
    ),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "cloudinary_image_invalid",
  );
  assert.equal(fetchCount, 0);
});

test("valid Cloudinary image responses are size-bounded and mapped to image bytes", async () => {
  const { fetchCloudinaryReceiptImage } = await cloudinaryImageModule;
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, cloudinaryUrl);
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    return new Response(String.fromCharCode(...image.bytes), {
      headers: { "content-type": "image/jpeg; charset=binary" },
    });
  };

  assert.deepEqual(
    await fetchCloudinaryReceiptImage(cloudinaryUrl, fetcher),
    image,
  );
});

test("unsupported Cloudinary response content types are rejected", async () => {
  const { fetchCloudinaryReceiptImage } = await cloudinaryImageModule;
  const fetcher: typeof fetch = async () =>
    new Response("not an image", {
      headers: { "content-type": "text/plain" },
    });

  await assert.rejects(
    fetchCloudinaryReceiptImage(cloudinaryUrl, fetcher),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "unreadable_image",
  );
});

test("oversized Cloudinary image bodies are rejected", async () => {
  const { fetchCloudinaryReceiptImage } = await cloudinaryImageModule;
  const fetcher: typeof fetch = async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(MAX_RECEIPT_IMAGE_BYTES));
          controller.enqueue(new Uint8Array([1]));
          controller.close();
        },
      }),
      {
        headers: {
          "content-type": "image/jpeg",
        },
      },
    );

  await assert.rejects(
    fetchCloudinaryReceiptImage(cloudinaryUrl, fetcher),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "file_too_large",
  );
});

test("a missing Gemini API key is an explicit configuration error", async () => {
  const { createGeminiReceiptExtractor } = await geminiModule;
  let providerCalls = 0;
  const extractor = createGeminiReceiptExtractor(
    () => undefined,
    async () => {
      providerCalls++;
      return JSON.stringify(validReceipt);
    },
  );

  await assert.rejects(
    extractor.extract(image),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "gemini_not_configured",
  );
  assert.equal(providerCalls, 0);
});

test("Gemini provider failures are translated without exposing provider details", async () => {
  const { createGeminiReceiptExtractor } = await geminiModule;
  const extractor = createGeminiReceiptExtractor(
    () => "test-api-key",
    async () => {
      throw new Error("private provider response");
    },
  );

  await assert.rejects(
    extractor.extract(image),
    (error: unknown) =>
      error instanceof ScanReceiptError &&
      error.code === "gemini_request_failed" &&
      !error.message.includes("private provider response"),
  );
});

test("Gemini API status codes map to safe actionable errors", async () => {
  const { createGeminiReceiptExtractor } = await geminiModule;
  const cases = [
    { status: 401, code: "gemini_invalid_key" },
    { status: 403, code: "gemini_access_denied" },
    { status: 404, code: "gemini_model_unavailable" },
    { status: 429, code: "gemini_quota_exceeded" },
    { status: 400, code: "gemini_request_rejected" },
  ] as const;

  for (const { status, code } of cases) {
    const extractor = createGeminiReceiptExtractor(
      () => "test-api-key",
      async () => {
        throw Object.assign(new Error("sensitive provider details"), { status });
      },
    );

    await assert.rejects(
      extractor.extract(image),
      (error: unknown) =>
        error instanceof ScanReceiptError &&
        error.code === code &&
        !error.message.includes("sensitive provider details"),
    );
  }
});
