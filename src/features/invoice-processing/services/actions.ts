"use server";

import type { ScanReceipt } from "@/features/invoice-processing/types/scan";
import { getMockReceipt } from "@/features/invoice-processing/services/mock-receipts";

// Public demo action: returns synthetic receipts without accepting or storing images.
export async function scanReceiptAction(): Promise<ScanReceipt> {
  return getMockReceipt();
}
