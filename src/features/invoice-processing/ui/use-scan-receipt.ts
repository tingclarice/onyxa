"use client";

import { useMutation } from "@tanstack/react-query";
import {
  scanReceiptAction,
  uploadReceiptImageAction,
} from "@/features/invoice-processing/services/actions";
import {
  MAX_RECEIPT_IMAGE_BYTES,
  ScanReceiptError,
  ScanReceiptResultSchema,
  SUPPORTED_RECEIPT_IMAGE_TYPES,
  type ScanReceiptResult,
} from "@/features/invoice-processing/types/scan";

export function useScanReceipt() {
  return useMutation({
    mutationFn: async (file?: File): Promise<ScanReceiptResult> => {
      let imageUrl: string | undefined;

      if (file) {
        if (
          !SUPPORTED_RECEIPT_IMAGE_TYPES.some((type) => type === file.type) ||
          file.size === 0
        ) {
          throw new ScanReceiptError(
            "Format foto belum didukung. Gunakan JPG, PNG, WebP, atau HEIC.",
            "unreadable_image",
          );
        }
        if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
          throw new ScanReceiptError(
            "Ukuran foto maksimal 8 MB. Pilih foto yang lebih kecil.",
            "file_too_large",
          );
        }

        const formData = new FormData();
        formData.set("file", file);
        const uploadResult = await uploadReceiptImageAction(formData);
        if (!uploadResult.ok) {
          throw new ScanReceiptError(
            uploadResult.message,
            uploadResult.code,
          );
        }
        imageUrl = uploadResult.imageUrl;
      }

      const scanResult = await scanReceiptAction(imageUrl);
      if (!scanResult.ok) {
        throw new ScanReceiptError(scanResult.message, scanResult.code);
      }

      return ScanReceiptResultSchema.parse(scanResult.result);
    },
  });
}
