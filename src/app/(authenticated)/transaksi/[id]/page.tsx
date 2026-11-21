import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { getActiveBusinessTransaction } from "@/features/invoice-processing/server";
import { formatDate, formatRupiah } from "@/lib/utils/format";

export const instant = false;

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const receipt = await getActiveBusinessTransaction(id);
  if (!receipt) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-6 sm:px-6 md:py-10">
      <header className="space-y-3">
        <Link href="/transaksi" className="inline-flex min-h-11 items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" /> Kembali ke transaksi
        </Link>
        <h1 className="break-words text-2xl font-bold sm:text-3xl">{receipt.supplierName}</h1>
        <p className="text-muted-foreground">{formatDate(receipt.date)}</p>
      </header>
      <section aria-labelledby="barang">
        <h2 id="barang" className="mb-3 text-lg font-semibold">Barang yang dibeli</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="border-b bg-muted/50">
              <tr>
                <th scope="col" className="p-3">Barang</th>
                <th scope="col" className="p-3">Jumlah</th>
                <th scope="col" className="p-3 text-right">Harga satuan</th>
                <th scope="col" className="p-3 text-right">Potongan barang</th>
                <th scope="col" className="p-3 text-right">Jumlah bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {receipt.lines.map((line) => (
                <tr key={line.position}>
                  <th scope="row" className="p-3 font-medium">{line.name}</th>
                  <td className="whitespace-nowrap p-3">{line.quantity.toLocaleString("id-ID", { maximumFractionDigits: 6 })} {line.unit}</td>
                  <td className="p-3 text-right">{formatRupiah(line.unitPrice)}</td>
                  <td className="p-3 text-right">{formatRupiah(line.discount)}</td>
                  <td className="p-3 text-right">{formatRupiah(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto mt-5 max-w-sm space-y-2 tabular-nums">
          <div className="flex justify-between gap-4"><dt>Subtotal barang</dt><dd>{formatRupiah(receipt.subtotal)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Potongan seluruh nota</dt><dd>{formatRupiah(receipt.discount)}</dd></div>
          <div className="flex justify-between gap-4 border-t pt-3 text-lg font-bold"><dt>Total bayar</dt><dd>{formatRupiah(receipt.total)}</dd></div>
        </dl>
      </section>
      {receipt.imageUrl && (
        <section aria-labelledby="foto">
          <h2 id="foto" className="mb-3 text-lg font-semibold">Foto nota</h2>
          <a href={receipt.imageUrl} target="_blank" rel="noreferrer" aria-label="Buka foto nota ukuran penuh">
            <Image src={receipt.imageUrl} alt={`Foto nota dari ${receipt.supplierName}`} width={800} height={1000}
              unoptimized className="h-auto max-h-[75vh] max-w-full rounded-xl border object-contain" />
          </a>
        </section>
      )}
    </div>
  );
}
