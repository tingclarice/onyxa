"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveBusiness } from "@/features/business-management/server";
import { deleteCatalogItem } from "../services/movement-service";

export type DeleteItemResult =
  | { ok: true }
  | { ok: false; message: string };

export async function deleteItemAction(
  itemId: string,
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
  revalidatePath("/beranda");
  redirect("/barang");
}

