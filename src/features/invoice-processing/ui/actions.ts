"use server";

import { requireUser } from "@/features/auth/server";
import { requireActiveBusiness } from "@/features/business-management/server";
import type {
  ScanReceiptResult,
  UploadReceiptImageResult,
} from "../types/scan";
import {
  scanReceipt,
  uploadReceiptPhoto,
} from "../services/receipt-scan-service";

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
