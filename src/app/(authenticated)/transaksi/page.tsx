import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveBusinessTransactions } from "@/features/invoice-processing/server";
import { ReceiptTransactions } from "@/features/invoice-processing/ui/receipt-transactions";

export const instant = false;

export default async function TransaksiPage() {
  const receipts = await getActiveBusinessTransactions();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Transaksi</h1>
          <p className="text-base text-muted-foreground">Catatan nota belanja untuk usaha aktif.</p>
        </div>
        <Button asChild>
          <Link href="/scan/review?mode=manual"><Plus aria-hidden="true" /> Tambah transaksi</Link>
        </Button>
      </header>
      <ReceiptTransactions receipts={receipts} />
    </div>
  );
}
