import { ReceiptReviewForm } from "@/features/invoice-processing/ui/receipt-review-form";

import { z } from "zod";
import { getMyScanDraft } from "@/features/invoice-processing/server";

/**
 * /scan/review?receiptId=… — check and correct one scanned receipt.
 * The whole screen is interactive (its title shows live check results),
 * so it is one client component.
 */
export const instant = false;

export default async function ScanReviewPage({ searchParams }: PageProps<"/scan/review">) {
  const { receiptId, mode } = await searchParams;
  const manual = mode === "manual";
  const draftId = z.uuid().safeParse(receiptId);
  const draft = !manual && draftId.success ? await getMyScanDraft(draftId.data) : null;
  return <ReceiptReviewForm key={manual ? "manual" : draft?.draftId ?? "empty"} manual={manual} draft={draft} />;
}
