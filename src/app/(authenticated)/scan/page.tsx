import { ReceiptScanner } from "@/features/invoice-processing/ui/receipt-scanner";

import { getMyScanDrafts } from "@/features/invoice-processing/server";

export const instant = false;
export default async function ScanPage() {
  const { drafts, memberId } = await getMyScanDrafts();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Scan nota belanja
        </h1>
        <p className="text-sm text-muted-foreground">
          Onyxa akan membaca isi foto nota secara otomatis agar Anda tinggal
          memeriksa dan menyimpannya.
        </p>
      </header>

      <ReceiptScanner key={memberId} drafts={drafts} />
    </div>
  );
}
