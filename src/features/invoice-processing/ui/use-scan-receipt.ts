"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ScanReceiptError,
  ScanReceiptResultSchema,
  type ScanReceiptResult,
} from "../types/scan";
import { getReceiptImageProblem } from "../core/receipt-image-rules";
import {
  scanReceiptAction,
  uploadAndScanReceiptAction,
} from "./actions";

const MAX_VISION_DIMENSION = 2048;
const JPEG_HIGH_QUALITY = 0.92;

/**
 * Only downscales oversized camera images (> 2048px) to 2048px at 92% quality,
 * which matches Gemini Vision's native tile resolution while keeping text razor-sharp.
 * Smaller images are returned untouched.
 */
async function optimizeImageIfOversized(file: File): Promise<File> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const maxDim = Math.max(width, height);

    if (maxDim <= MAX_VISION_DIMENSION && file.size <= 1_800_000) {
      bitmap.close();
      return file;
    }

    const scale =
      maxDim > MAX_VISION_DIMENSION ? MAX_VISION_DIMENSION / maxDim : 1;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_HIGH_QUALITY),
    );

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "receipt";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/** Browser hook: check the photo → upload & scan in parallel. */
export function useScanReceipt() {
  return useMutation({
    mutationFn: async (file?: File): Promise<ScanReceiptResult> => {
      if (file) {
        // Instant check in the browser; the server checks again.
        const problem = getReceiptImageProblem(file);
        if (problem) throw new ScanReceiptError(problem.message, problem.code);

        const optimizedFile = await optimizeImageIfOversized(file);
        const formData = new FormData();
        formData.set("file", optimizedFile);

        const combinedResult = await uploadAndScanReceiptAction(formData);
        if (!combinedResult.ok) {
          throw new ScanReceiptError(
            combinedResult.message,
            combinedResult.code,
          );
        }

        return ScanReceiptResultSchema.parse(combinedResult.result);
      }

      const scanResult = await scanReceiptAction(undefined);
      if (!scanResult.ok) {
        throw new ScanReceiptError(scanResult.message, scanResult.code);
      }

      return ScanReceiptResultSchema.parse(scanResult.result);
    },
  });
}
