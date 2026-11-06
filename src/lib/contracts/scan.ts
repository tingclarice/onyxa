import { z } from "zod";

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
