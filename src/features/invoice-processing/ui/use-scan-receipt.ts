"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ScanReceiptError,
  ScanReceiptResultSchema,
  type ScanReceiptResult,
} from "../types/scan";
import { getReceiptImageProblem } from "../core/receipt-image-rules";
import { scanReceiptAction, uploadReceiptImageAction } from "./actions";

/** Browser hook: check the photo → upload it → scan it. */
export function useScanReceipt() {
  return useMutation({
    mutationFn: async (file?: File): Promise<ScanReceiptResult> => {
      let imageUrl: string | undefined;

      if (file) {
        // Instant check in the browser; the server checks again.
        const problem = getReceiptImageProblem(file);
        if (problem) throw new ScanReceiptError(problem.message, problem.code);

        const formData = new FormData();
        formData.set("file", file);
        const upload = await uploadReceiptImageAction(formData);
        if (!upload.ok) throw new ScanReceiptError(upload.message, upload.code);
        imageUrl = upload.imageUrl;
      }

      const scanResult = await scanReceiptAction(imageUrl);
      if (!scanResult.ok) {
        throw new ScanReceiptError(scanResult.message, scanResult.code);
      }

      return ScanReceiptResultSchema.parse(scanResult.result);
    },
  });
}
