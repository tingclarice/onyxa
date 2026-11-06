import { z } from "zod";

export const ScanReceiptItemSchema = z.object({
  raw_name: z.string(),
  qty: z.number().positive(),
  unit: z.string(),
  unit_price: z.number().nonnegative(),
  line_total: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  matched_item: z.string().nullable(),
});

export const ScanReceiptSchema = z.object({
  supplier_name: z.string(),
  date: z.iso.date(),
  items: z.array(ScanReceiptItemSchema),
  total: z.number().nonnegative(),
  overall_confidence: z.number().min(0).max(1),
});

export type ScanReceiptItem = z.infer<typeof ScanReceiptItemSchema>;
export type ScanReceipt = z.infer<typeof ScanReceiptSchema>;
