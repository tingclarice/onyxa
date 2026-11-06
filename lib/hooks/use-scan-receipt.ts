"use client";

import { useMutation } from "@tanstack/react-query";
import { scanReceipt } from "@/lib/api/scan";

export function useScanReceipt() {
  return useMutation({
    mutationFn: scanReceipt,
  });
}
