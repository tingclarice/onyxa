"use server";

import {
  ScanReceiptResultSchema,
  ScanReceiptError,
  type ScanReceiptActionResult,
  type UploadReceiptImageResult,
} from "@/features/invoice-processing/types/scan";
import {
  CloudinaryUploadError,
  uploadReceiptImage,
  validateReceiptImage,
} from "@/features/invoice-processing/services/cloudinary";
import { getMockReceipt } from "@/features/invoice-processing/services/mock-receipts";
import { requireUser } from "@/features/auth/services/session";
import { fetchCloudinaryReceiptImage } from "@/features/invoice-processing/repository/cloudinary-image";
import { createGeminiReceiptExtractor } from "@/features/invoice-processing/repository/gemini";
import { extractReceiptFromImageUrl } from "@/features/invoice-processing/services/extract-receipt";

export async function uploadReceiptImageAction(
  formData: FormData,
): Promise<UploadReceiptImageResult> {
  await requireUser();

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
): Promise<ScanReceiptActionResult> {
  await requireUser();

  if (imageUrl === undefined) {
    const receipt = await getMockReceipt();
    return {
      ok: true,
      result: ScanReceiptResultSchema.parse({ receipt }),
    };
  }

  if (typeof imageUrl !== "string") {
    return {
      ok: false,
      code: "cloudinary_image_invalid",
      message: "Alamat foto nota tidak valid. Pilih foto nota dari Cloudinary.",
    };
  }

  try {
    const receipt = await extractReceiptFromImageUrl(imageUrl, {
      imageSource: { load: fetchCloudinaryReceiptImage },
      extractor: createGeminiReceiptExtractor(),
    });

    return {
      ok: true,
      result: ScanReceiptResultSchema.parse({ receipt, imageUrl }),
    };
  } catch (error) {
    if (error instanceof ScanReceiptError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }
}
