"use server";

import { revalidatePath } from "next/cache";
import { requireActiveBusiness } from "@/features/business-management/server";
import { saveIncomeSettlement } from "../services/finance-service";
import { SettlementError, settlementSchema } from "../types/finance";

export async function saveSettlementAction(form: FormData) {
  const { actor, membership } = await requireActiveBusiness();
  const result = settlementSchema.safeParse({ id: form.get("id"), date: form.get("date"),
    cash: Number(form.get("cash")), qris: Number(form.get("qris")) });
  if (!result.success) return { ok: false, message: "Isi tanggal yang valid dan nominal setoran positif dengan maksimal dua angka desimal." } as const;
  try {
    await saveIncomeSettlement(membership.businessId, actor.id, result.data);
  } catch (error) {
    return { ok: false, message: error instanceof SettlementError ? error.message : "Setoran belum dapat disimpan. Coba lagi." } as const;
  }
  revalidatePath("/pemasukan");
  revalidatePath("/beranda");
  return { ok: true } as const;
}
