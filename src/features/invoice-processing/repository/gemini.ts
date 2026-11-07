import "server-only";

import { GoogleGenAI } from "@google/genai";
import {
  ScanReceiptError,
  type ReceiptExtractionProvider,
  type ReceiptImage,
} from "@/features/invoice-processing/types/scan";

const receiptJsonSchema = {
  type: "object",
  properties: {
    supplier_name: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD or empty when unreadable" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          raw_name: { type: "string" },
          qty: { type: "number" },
          unit: { type: "string" },
          unit_price: { type: "number" },
          line_total: { type: "number" },
          confidence: { type: "number" },
          matched_item: { type: ["string", "null"] },
        },
        required: [
          "raw_name",
          "qty",
          "unit",
          "unit_price",
          "line_total",
          "confidence",
          "matched_item",
        ],
        additionalProperties: false,
      },
    },
    total: { type: "number" },
    overall_confidence: { type: "number" },
  },
  required: [
    "supplier_name",
    "date",
    "items",
    "total",
    "overall_confidence",
  ],
  additionalProperties: false,
};

const extractionInstructions = `Extract the visible contents of this Indonesian supplier receipt.
Return exactly the fields in the supplied JSON schema. Copy only values that are visible; do not infer, calculate, or fill missing receipt values from context. Never calculate an item quantity, unit price, line total, or receipt total from other fields.
Use YYYY-MM-DD for a clearly readable date, otherwise use an empty string. Use "Tidak terbaca" for an unreadable supplier or item name. Use 0 for an unknown quantity, unit price, line total, or receipt total; use "Tidak diketahui" for an unknown unit; use null for matched_item because no inventory catalogue is available. If no item can be read, return one placeholder item with raw_name "Tidak terbaca", qty 0, unit "Tidak diketahui", unit_price 0, line_total 0, confidence 0, and matched_item null.
Confidence is a rough review heuristic, not a calibrated probability. Use low confidence when text or values are unclear or replaced by placeholders. Never mark an unknown value as highly confident.`;

type GeminiRequest = (
  apiKey: string,
  image: ReceiptImage,
) => Promise<string | undefined>;

async function requestGemini(
  apiKey: string,
  image: ReceiptImage,
): Promise<string | undefined> {
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: extractionInstructions },
          {
            inlineData: {
              mimeType: image.mimeType,
              data: Buffer.from(image.bytes).toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: receiptJsonSchema,
      temperature: 0,
    },
  });

  return response.text;
}

function getGeminiErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const status: unknown = error.status;
  return typeof status === "number" ? status : undefined;
}

function getSafeGeminiError(error: unknown): ScanReceiptError {
  switch (getGeminiErrorStatus(error)) {
    case 400:
      return new ScanReceiptError(
        "Permintaan ke Gemini ditolak. Pastikan model mendukung pemrosesan gambar dan coba lagi.",
        "gemini_request_rejected",
      );
    case 401:
      return new ScanReceiptError(
        "GEMINI_API_KEY tidak dikenali. Periksa API key di environment lokal, lalu mulai ulang server.",
        "gemini_invalid_key",
      );
    case 403:
      return new ScanReceiptError(
        "Akses Gemini ditolak. Periksa izin API key dan ketersediaan Gemini API di Google AI Studio.",
        "gemini_access_denied",
      );
    case 404:
      return new ScanReceiptError(
        "Model Gemini yang dipilih tidak tersedia untuk API key ini.",
        "gemini_model_unavailable",
      );
    case 429:
      return new ScanReceiptError(
        "Kuota atau batas permintaan Gemini tercapai. Cek kuota Google AI Studio atau coba lagi nanti.",
        "gemini_quota_exceeded",
      );
    default:
      return new ScanReceiptError(
        "Gemini belum dapat memproses foto nota. Periksa koneksi atau coba lagi.",
        "gemini_request_failed",
      );
  }
}

export function createGeminiReceiptExtractor(
  getApiKey: () => string | undefined = () => process.env.GEMINI_API_KEY,
  generate: GeminiRequest = requestGemini,
): ReceiptExtractionProvider {
  return {
    async extract(image) {
      const apiKey = getApiKey()?.trim();
      if (!apiKey) {
        throw new ScanReceiptError(
          "Pemrosesan nota belum dikonfigurasi. Minta pengelola aplikasi menambahkan GEMINI_API_KEY.",
          "gemini_not_configured",
        );
      }

      let output: string | undefined;
      try {
        output = await generate(apiKey, image);
      } catch (error) {
        throw getSafeGeminiError(error);
      }

      if (!output?.trim()) {
        throw new ScanReceiptError(
          "Gemini tidak menghasilkan data nota yang dapat dibaca. Coba foto ulang dengan lebih jelas.",
          "invalid_model_output",
        );
      }

      try {
        const parsedOutput: unknown = JSON.parse(output);
        return parsedOutput;
      } catch {
        throw new ScanReceiptError(
          "Hasil pembacaan nota tidak dapat diproses. Coba unggah ulang foto.",
          "invalid_model_output",
        );
      }
    },
  };
}
