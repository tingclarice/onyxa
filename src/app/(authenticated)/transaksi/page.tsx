import { getActiveBusinessTransactions } from "@/features/invoice-processing/server";
import { ReceiptTransactions } from "@/features/invoice-processing/ui/receipt-transactions";

export const instant = false;

export default async function TransaksiPage() {
  const receipts = await getActiveBusinessTransactions();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Transaksi</h1>
        <p className="text-base text-muted-foreground">Catatan nota belanja untuk usaha aktif.</p>
      </header>
      <ReceiptTransactions receipts={receipts} />
    </div>
  );
}
