import { ReceiptReviewForm } from "@/features/invoice-processing/ui/receipt-review-form";

/**
 * /scan/review?receiptId=… — check and correct one scanned receipt.
 * The whole screen is interactive (its title shows live check results),
 * so it is one client component.
 */
export const instant = false;

export default async function ScanReviewPage({ searchParams }: PageProps<"/scan/review">) {
  const { receiptId, mode } = await searchParams;
  const manual = mode === "manual";
  const draftId = typeof receiptId === "string" ? receiptId : undefined;
  return <ReceiptReviewForm key={manual ? "manual" : draftId ?? "empty"} manual={manual} draftId={draftId} />;
}
