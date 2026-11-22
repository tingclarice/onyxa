import { z } from "zod";

export const catalogItemSchema = z.object({
  name: z.string().trim().min(1, "Isi nama barang."),
  baseUnit: z.enum(["PCS", "KG", "LITER"], { error: "Pilih satuan dasar yang tersedia." }),
  category: z.string().trim().max(80).nullable().optional(),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

export interface CatalogItemRecord extends CatalogItemInput {
  id: string;
  nameKey: string;
  archivedAt: Date | null;
}

export class CatalogItemError extends Error {}
