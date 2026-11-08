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
    .positive({ error: "Jumlah harus lebih dari 0." }),
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
  date: z.iso.date({ error: "Tanggal nota belum benar." }),
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
  | "file_too_large";

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

// ---- Saving a reviewed receipt ----

/** What the review screen sends when the user presses "Simpan". */
export const SaveReceiptInputSchema = z.object({
  receipt: ScanReceiptSchema,
  imageUrl: z.url().optional(),
});
export type SaveReceiptInput = z.infer<typeof SaveReceiptInputSchema>;

export type SaveReceiptResult =
  | { ok: true; receiptId: string; itemCount: number }
  | { ok: false; message: string };

/** The three units quantities are stored in, so purchases can be compared. */
export type BaseUnit = "KG" | "LITER" | "PCS";

/** One receipt line, ready to be stored. */
export interface ReceiptLineToSave {
  position: number;
  rawName: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  confidence: number;
  /** null when the unit cannot be converted to the item's base unit. */
  baseQuantity: number | null;
  baseUnit: BaseUnit | null;
}

/** A catalog item as the receipt-saving use case needs it. */
export interface CatalogItem {
  id: string;
  name: string;
  baseUnit: BaseUnit;
}
