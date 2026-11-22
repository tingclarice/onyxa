"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveBusiness } from "@/features/business-management/server";
import { deleteCatalogItem } from "../services/movement-service";
import { saveCatalogItem } from "../services/catalog-service";
import { CatalogItemError, catalogItemSchema } from "../types/catalog";

export type DeleteItemResult =
  | { ok: true }
  | { ok: false; message: string };

export async function saveCatalogItemAction(itemId: string | null, form: FormData) {
  const { membership } = await requireActiveBusiness();
  const id = z.uuid().nullable().safeParse(itemId);
  if (!id.success) return { ok: false, message: "ID barang tidak valid." } as const;
  const input = catalogItemSchema.safeParse({
    name: form.get("name"), baseUnit: form.get("baseUnit"),
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

