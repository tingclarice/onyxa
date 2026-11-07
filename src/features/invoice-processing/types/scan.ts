import { z } from "zod";

export const MAX_RECEIPT_IMAGE_BYTES = 8 * 1024 * 1024;
export const SUPPORTED_RECEIPT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ScanReceiptItemSchema = z.object({
  raw_name: z.string({ error: "Nama barang harus diisi." }).min(1, {
    error: "Nama barang harus diisi.",
  }),
  qty: z
    .number({ error: "Jumlah harus berupa angka." })
    .nonnegative({ error: "Jumlah tidak boleh kurang dari 0." }),
  unit: z.string({ error: "Satuan harus diisi." }).min(1, {
    error: "Satuan harus diisi.",
  }),
  unit_price: z
    .number({ error: "Harga satuan harus berupa angka." })
    .nonnegative({ error: "Harga satuan tidak boleh kurang dari 0." }),
  line_total: z
    .number({ error: "Jumlah harga harus berupa angka." })
    .nonnegative({ error: "Jumlah harga tidak boleh kurang dari 0." }),
  confidence: z
    .number({ error: "Nilai keyakinan tidak valid." })
    .min(0, { error: "Nilai keyakinan tidak valid." })
    .max(1, { error: "Nilai keyakinan tidak valid." }),
  matched_item: z.string().nullable(),
});

export const ScanReceiptSchema = z.object({
  supplier_name: z
    .string({ error: "Nama pemasok harus diisi." })
    .min(1, { error: "Nama pemasok harus diisi." }),
  date: z.union([z.iso.date(), z.literal("")], {
    error: "Tanggal nota belum benar.",
  }),
  items: z
    .array(ScanReceiptItemSchema, { error: "Daftar barang belum benar." })
    .min(1, { error: "Tambahkan setidaknya satu barang." }),
  total: z
    .number({ error: "Total nota harus berupa angka." })
    .nonnegative({ error: "Total nota tidak boleh kurang dari 0." }),
  overall_confidence: z
    .number({ error: "Nilai keyakinan tidak valid." })
    .min(0, { error: "Nilai keyakinan tidak valid." })
    .max(1, { error: "Nilai keyakinan tidak valid." }),
});

export type ScanReceiptItem = z.infer<typeof ScanReceiptItemSchema>;
export type ScanReceipt = z.infer<typeof ScanReceiptSchema>;

export const ScanReceiptResultSchema = z.object({
  receipt: ScanReceiptSchema,
  imageUrl: z.url().optional(),
});

export type ScanReceiptResult = z.infer<typeof ScanReceiptResultSchema>;

export type ScanReceiptErrorCode =
  | "unreadable_image"
  | "duplicate_receipt"
  | "upload_failed"
  | "cloudinary_not_configured"
  | "cloudinary_upload_failed"
  | "cloudinary_image_invalid"
  | "cloudinary_image_unavailable"
  | "gemini_not_configured"
  | "gemini_request_failed"
  | "invalid_model_output"
  | "file_too_large";

export interface ReceiptImage {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export interface ReceiptImageSource {
  load(imageUrl: string): Promise<ReceiptImage>;
}

export interface ReceiptExtractionProvider {
  extract(image: ReceiptImage): Promise<unknown>;
}

export type ScanReceiptActionResult =
  | { ok: true; result: ScanReceiptResult }
  | {
      ok: false;
      code: ScanReceiptErrorCode;
      message: string;
    };

export type UploadReceiptImageResult =
  | { ok: true; imageUrl: string }
  | {
      ok: false;
      code: ScanReceiptErrorCode;
      message: string;
    };

export class ScanReceiptError extends Error {
  constructor(
    message: string,
    readonly code: ScanReceiptErrorCode,
  ) {
    super(message);
    this.name = "ScanReceiptError";
  }
}
