"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/server";
import { requireActiveBusiness } from "@/features/business-management/server";
import type {
  SaveReceiptResult,
  ScanReceiptResult,
  UploadReceiptImageResult,
} from "../types/scan";
import {
  scanReceipt,
  uploadReceiptPhoto,
} from "../services/receipt-scan-service";
import { saveReviewedReceipt } from "../services/receipt-save-service";

// Both actions need a logged-in user who has an active business.

export async function uploadReceiptImageAction(
  formData: FormData,
): Promise<UploadReceiptImageResult> {
  await requireUser();
  await requireActiveBusiness();

  const file = formData.get("file");
  if (!(file instanceof File))
    return {
      ok: false,
      code: "unreadable_image",
      message: "Pilih foto nota terlebih dahulu.",
    };

  return uploadReceiptPhoto(file);
}

export async function scanReceiptAction(
  imageUrl?: string,
): Promise<ScanReceiptResult> {
  await requireUser();
  await requireActiveBusiness();

  return scanReceipt(imageUrl);
}

/** The "Simpan" button on the review screen. */
export async function saveReceiptAction(
  input: unknown,
): Promise<SaveReceiptResult> {
  await requireUser();
  const { membership } = await requireActiveBusiness();

  let saved: { receiptId: string; itemCount: number };
  try {
    saved = await saveReviewedReceipt(
      { businessId: membership.businessId, memberId: membership.id },
      input,
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false,
        message: error.issues[0]?.message ?? "Periksa data nota.",
      };
    console.error("[receipt] save failed");
    return {
      ok: false,
      message: "Nota belum bisa disimpan. Periksa koneksi lalu coba lagi.",
    };
  }

  // Items and the home-screen warnings depend on saved receipts.
  revalidatePath("/barang");
  revalidatePath("/beranda");
  return { ok: true, ...saved };
}
