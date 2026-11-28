"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveBusiness } from "@/features/business-management/server";
import { deleteCatalogItem } from "../services/movement-service";
import { saveCatalogItem } from "../services/catalog-service";
import { recordStandaloneStockOpname } from "../services/stock-opname-service";
import { CatalogItemError, catalogItemSchema } from "../types/catalog";
import {
  CreateStockOpnameInputSchema,
  StockOpnameError,
  type OpnameAuditResult,
  type StockSnapshotRecord,
} from "../types/inventory";

export type RecordStockOpnameResult =
  | { ok: true; snapshot: StockSnapshotRecord; audit: OpnameAuditResult | null }
  | { ok: false; message: string };

export type DeleteItemResult =
  | { ok: true }
  | { ok: false; message: string };

export async function saveCatalogItemAction(itemId: string | null, form: FormData) {
  const { membership } = await requireActiveBusiness();
  const id = z.uuid().nullable().safeParse(itemId);
  if (!id.success) return { ok: false, message: "ID barang tidak valid." } as const;
  const input = catalogItemSchema.safeParse({
    name: form.get("name"), baseUnit: form.get("baseUnit"),
    ...(form.has("category") ? { category: String(form.get("category")).trim() || null } : {}),
  });
  if (!input.success) return { ok: false, message: input.error.issues[0].message } as const;

  try {
    await saveCatalogItem(membership.businessId, id.data, input.data);
  } catch (error) {
    const message = error instanceof CatalogItemError ? error.message : "Barang gagal disimpan. Coba lagi.";
    return { ok: false, message } as const;
  }

  revalidatePath("/barang");
  if (id.data) revalidatePath(`/barang/${id.data}`);
  revalidatePath("/beranda");
  return { ok: true } as const;
}

export async function deleteItemAction(
  itemId: string,
  from: "detail" | "catalog" = "detail",
): Promise<DeleteItemResult> {
  const { membership } = await requireActiveBusiness();

  const parsedId = z.uuid().safeParse(itemId);
  if (!parsedId.success) {
    return { ok: false, message: "ID barang tidak valid." };
  }

  try {
    const deleted = await deleteCatalogItem(
      membership.businessId,
      parsedId.data,
    );
    if (!deleted) {
      return { ok: false, message: "Barang tidak ditemukan." };
    }
  } catch {
    return { ok: false, message: "Gagal menghapus barang. Silakan coba lagi." };
  }

  revalidatePath("/barang");
  revalidatePath(`/barang/${parsedId.data}`);
  revalidatePath("/beranda");
  if (from === "detail") redirect("/barang");
  return { ok: true };
}

export async function recordStockOpnameAction(
  form: FormData,
): Promise<RecordStockOpnameResult> {
  const { membership } = await requireActiveBusiness();

  const rawQty = String(form.get("countedQty") ?? "").trim();
  if (rawQty === "") {
    return {
      ok: false,
      message: "Masukkan jumlah stok fisik (isi 0 jika rak kosong).",
    };
  }

  const parsedQty = Number(rawQty);
  const parsed = CreateStockOpnameInputSchema.safeParse({
    itemId: String(form.get("itemId") ?? ""),
    countedQty: Number.isFinite(parsedQty) ? parsedQty : Number.NaN,
    recordedAt: String(form.get("recordedAt") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data stock opname tidak valid.",
    };
  }

  let result: { snapshot: StockSnapshotRecord; audit: OpnameAuditResult | null };
  try {
    result = await recordStandaloneStockOpname(
      { businessId: membership.businessId, memberId: membership.id },
      parsed.data,
    );
  } catch (error) {
    if (!(error instanceof StockOpnameError)) {
      console.error("[stock-opname] save failed", error);
    }
    const message =
      error instanceof StockOpnameError
        ? error.message
        : "Gagal menyimpan stock opname. Coba lagi.";
    return { ok: false, message };
  }

  revalidatePath("/barang");
  revalidatePath(`/barang/${parsed.data.itemId}`);
  revalidatePath("/beranda");
  return { ok: true, ...result };
}

