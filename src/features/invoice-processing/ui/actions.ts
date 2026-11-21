"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/server";
import { requireActiveBusiness } from "@/features/business-management/server";
import type {
  SaveReceiptResult,
  ScanReceiptActionResult,
} from "../types/scan";
import { ReceiptDiscountError, ScanReceiptError } from "../types/scan";
import {
  scanReceipt,
  uploadAndScanReceipt,
} from "../services/receipt-scan-service";
import { saveReviewedReceipt } from "../services/receipt-save-service";
import { isOurCloudinaryImageUrl } from "@/lib/cloudinary-images";
import { receiptSaveRepository } from "../repository/receipt-save-adapter";

export async function scanReceiptAction(
  imageUrl?: unknown,
): Promise<ScanReceiptActionResult> {
  await requireUser();
  await requireActiveBusiness();

  const trace = startScanLog("galeri");
  if (typeof imageUrl !== "string" || !imageUrl) {
    return reportScanFailure(trace, new ScanReceiptError(
      "Alamat foto nota tidak valid. Pilih foto nota dari Cloudinary.", "cloudinary_image_invalid",
    ));
  }

  try {
    const result = await scanReceipt(imageUrl, trace.ref);
    reportScanSuccess(trace);
    return { ok: true, result };
  } catch (error) {
    return reportScanFailure(trace, error);
  }
}

/**
 * Single-pass action: uploads the photo to Cloudinary AND extracts the receipt
 * with Gemini in parallel from the same in-memory bytes (no re-download needed).
 */
export async function uploadAndScanReceiptAction(
  formData: FormData,
): Promise<ScanReceiptActionResult> {
  await requireUser();
  await requireActiveBusiness();

  const trace = startScanLog("kamera");
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return reportScanFailure(trace, new ScanReceiptError("Pilih foto nota terlebih dahulu.", "unreadable_image"));
  }

  try {
    const result = await uploadAndScanReceipt(file, trace.ref);
    reportScanSuccess(trace);
    return { ok: true, result };
  } catch (error) {
    return reportScanFailure(trace, error);
  }
}

function startScanLog(source: "kamera" | "galeri") {
  const ref = crypto.randomUUID();
  console.info("[receipt-scan]", { ref, source, stage: "scan", outcome: "started" });
  return { ref, source, start: performance.now() };
}

function reportScanSuccess({ ref, source, start }: ReturnType<typeof startScanLog>) {
  console.info("[receipt-scan]", { ref, source, stage: "scan", outcome: "ok",
    durationMs: Math.round(performance.now() - start) });
}

function reportScanFailure({ ref, source, start }: ReturnType<typeof startScanLog>, error: unknown): ScanReceiptActionResult {
  const failure = error instanceof ScanReceiptError ? error : new ScanReceiptError(
    "Server gagal menyelesaikan pemrosesan nota. Gunakan referensi ini untuk memeriksa log server.",
    "scan_failed",
  );
  console.error("[receipt-scan]", { ref, source, stage: "scan", outcome: "failed",
    durationMs: Math.round(performance.now() - start), code: failure.code, reason: failure.message });
  return { ok: false, code: failure.code, message: `${failure.message} [${failure.code} · Ref ${ref}]` };
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
      {
        repository: receiptSaveRepository,
        imageUrlValidator: { isValid: isOurCloudinaryImageUrl },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false,
        message: error.issues[0]?.message ?? "Periksa data nota.",
      };
    if (error instanceof ScanReceiptError || error instanceof ReceiptDiscountError)
      return { ok: false, message: error.message };
    console.error("[receipt] save failed");
    return {
      ok: false,
      message: "Nota belum bisa disimpan. Periksa koneksi lalu coba lagi.",
    };
  }

  // Items and the home-screen warnings depend on saved receipts.
  revalidatePath("/barang");
  revalidatePath("/beranda");
  revalidatePath("/transaksi");
  return { ok: true, ...saved };
}
