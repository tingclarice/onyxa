import { ReceiptScanner } from "@/features/invoice-processing/ui/receipt-scanner";

/** /scan — upload receipt photos and scan them. */
export default function ScanPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Scan nota belanja
        </h1>
        <p className="text-base text-muted-foreground">
          Foto nota atau pilih gambar dari HP. Kamu bisa menambahkan beberapa
          nota sekaligus.
        </p>
        <p className="text-sm text-muted-foreground">
          Foto disimpan di Cloudinary, lalu Gemini menyiapkan data awal untuk
          dicek dan diperbaiki.
        </p>
      </header>

      <ReceiptScanner />
    </div>
  );
}
