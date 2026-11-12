"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/server";
import { requireActiveBusiness } from "@/features/business-management/server";
import type {
  ReceiptImage,
  SaveReceiptResult,
  ScanReceiptActionResult,
  UploadReceiptImageResult,
} from "../types/scan";
import { ScanReceiptError } from "../types/scan";
import {
  scanReceipt,
  uploadReceiptPhoto,
} from "../services/receipt-scan-service";
import { saveReviewedReceipt } from "../services/receipt-save-service";
import { fetchCloudinaryReceiptImage } from "../repository/cloudinary-image";
import { createGeminiReceiptExtractor } from "../repository/gemini";
import { readReceiptFromImage } from "../repository/demo-receipt-reader";
import {
  isOurCloudinaryImageUrl,
  uploadReceiptImage,
} from "../repository/receipt-image-storage";
import { receiptSaveRepository } from "../repository/receipt-save-adapter";

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

  return uploadReceiptPhoto(file, { upload: uploadReceiptImage });
}

export async function scanReceiptAction(
  imageUrl?: unknown,
): Promise<ScanReceiptActionResult> {
  await requireUser();
  await requireActiveBusiness();

  if (imageUrl !== undefined && typeof imageUrl !== "string") {
    return {
      ok: false,
      code: "cloudinary_image_invalid",
      message: "Alamat foto nota tidak valid. Pilih foto nota dari Cloudinary.",
    };
  }

  try {
    const result = await scanReceipt(imageUrl, {
      readDemoReceipt: () => readReceiptFromImage(undefined),
      imageSource: { load: fetchCloudinaryReceiptImage },
      extractor: createGeminiReceiptExtractor(),
    });
    return { ok: true, result };
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

/**
 * Single-pass action: uploads the photo to Cloudinary AND extracts the receipt
 * with Gemini in parallel from the same in-memory bytes (no re-download needed).
 */
export async function uploadAndScanReceiptAction(
  formData: FormData,
): Promise<ScanReceiptActionResult> {
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

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const allowedMimeTypes: ReceiptImage["mimeType"][] = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    const mimeType: ReceiptImage["mimeType"] = allowedMimeTypes.includes(
      file.type as ReceiptImage["mimeType"],
    )
      ? (file.type as ReceiptImage["mimeType"])
      : "image/jpeg";

    const [uploadResult, scanResult] = await Promise.all([
      uploadReceiptPhoto(file, { upload: uploadReceiptImage }),
      scanReceipt("https://res.cloudinary.com/direct-buffer", {
        readDemoReceipt: () => readReceiptFromImage(undefined),
        imageSource: {
          load: async () => ({ bytes, mimeType }),
        },
        extractor: createGeminiReceiptExtractor(),
      }),
    ]);

    if (!uploadResult.ok) {
      return {
        ok: false,
        code: uploadResult.code,
        message: uploadResult.message,
      };
    }

    return {
      ok: true,
      result: {
        receipt: scanResult.receipt,
        imageUrl: uploadResult.imageUrl,
      },
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
    if (error instanceof ScanReceiptError)
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
  return { ok: true, ...saved };
}
