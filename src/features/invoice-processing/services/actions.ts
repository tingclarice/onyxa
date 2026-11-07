"use server";

import {
  ScanReceiptSchema,
  ScanReceiptResultSchema,
  type ScanReceiptResult,
  type UploadReceiptImageResult,
} from "@/features/invoice-processing/types/scan";
import {
  CloudinaryUploadError,
  isCloudinaryReceiptUrl,
  uploadReceiptImage,
  validateReceiptImage,
} from "@/features/invoice-processing/services/cloudinary";
import { getMockReceipt } from "@/features/invoice-processing/services/mock-receipts";
import { requireUser } from "@/features/auth/server";
import { requireActiveBusiness } from "@/features/business-management/server";

export async function uploadReceiptImageAction(
  formData: FormData,
): Promise<UploadReceiptImageResult> {
  await requireUser();
  await requireActiveBusiness();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      code: "unreadable_image",
      message: "Pilih foto nota terlebih dahulu.",
    };
  }

  const validation = validateReceiptImage(file);
  if (!validation.ok) return validation;

  try {
    return {
      ok: true,
      imageUrl: await uploadReceiptImage(file),
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }
}

export async function scanReceiptAction(
  imageUrl?: string,
): Promise<ScanReceiptResult> {
  await requireUser();
  await requireActiveBusiness();

  if (imageUrl && !isCloudinaryReceiptUrl(imageUrl)) {
    throw new Error("Alamat foto Cloudinary tidak valid.");
  }

  const receipt = ScanReceiptSchema.parse(await getMockReceipt());
  return ScanReceiptResultSchema.parse({
    receipt,
    ...(imageUrl ? { imageUrl } : {}),
  });
}
