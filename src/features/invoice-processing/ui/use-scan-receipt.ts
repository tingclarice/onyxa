"use client";

import { useMutation } from "@tanstack/react-query";
import { startTransition } from "react";
import { scanReceiptAction } from "@/features/invoice-processing/services/actions";
import {
  ScanReceiptError,
  ScanReceiptSchema,
  type ScanReceipt,
} from "@/features/invoice-processing/types/scan";

export function useScanReceipt() {
  return useMutation({
    mutationFn: (file?: File) =>
      new Promise<ScanReceipt>((resolve, reject) => {
        if (file && (!file.type.startsWith("image/") || file.size === 0)) {
          reject(new ScanReceiptError("Foto belum terbaca.", "unreadable_image"));
          return;
        }

        // shortcut: demo fixtures only; add validated uploads and OCR when implemented.
        startTransition(async () => {
          try {
            resolve(ScanReceiptSchema.parse(await scanReceiptAction()));
          } catch {
            reject(new ScanReceiptError("Gagal memproses struk.", "upload_failed"));
          }
        });
      }),
  });
}
