import { ReceiptReviewForm } from "@/features/invoice-processing/ui/receipt-review-form";

/**
 * /scan/review?receiptId=… — check and correct one scanned receipt.
 * The whole screen is interactive (its title shows live check results),
 * so it is one client component.
 */
export default function ScanReviewPage() {
  return <ReceiptReviewForm />;
}
