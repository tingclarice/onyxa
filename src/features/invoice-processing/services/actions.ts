"use server";

import type { ScanReceipt } from "@/features/invoice-processing/types/scan";
import { getMockReceipt } from "@/features/invoice-processing/services/mock-receipts";
import { requireUser } from "@/features/auth/services/session";

export async function scanReceiptAction(): Promise<ScanReceipt> {
  await requireUser();
  return getMockReceipt();
}
