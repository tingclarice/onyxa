import Link from "next/link";
import { getSettlementHistory } from "@/features/business-finance/server";
import { SettlementForm } from "@/features/business-finance/ui/settlement-form";
import { formatDate, formatRupiah } from "@/lib/utils/format";

export const instant = false;

export default async function PemasukanPage({ searchParams }: PageProps<"/pemasukan">) {
  const param = (await searchParams).page;
  const parsed = typeof param === "string" ? Number(param) : 1;
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 1000000 ? parsed : 1;
  const { entries, hasNext, today } = await getSettlementHistory(page);
  return <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 md:py-10">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Pemasukan</h1>
        <p className="mt-1 text-muted-foreground">Riwayat setoran usaha dari Cash dan QRIS.</p></div>
      <SettlementForm today={today} />
    </header>
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[35rem] text-left text-sm tabular-nums">
        <caption className="sr-only">Riwayat pencatatan pemasukan</caption>
        <thead className="border-b bg-muted/50 text-muted-foreground"><tr>
          {["Tanggal", "Cash", "QRIS", "Jumlah setoran", "Dicatat oleh"].map((label) =>
            <th key={label} className="px-4 py-3 font-medium" scope="col">{label}</th>)}
        </tr></thead>
        <tbody className="divide-y">{entries.map((entry) => <tr key={entry.id}>
          <td className="px-4 py-3">{formatDate(entry.date)}</td>
          <td className="px-4 py-3">{formatRupiah(entry.cash)}</td>
          <td className="px-4 py-3">{formatRupiah(entry.qris)}</td>
          <td className="px-4 py-3 font-semibold">{formatRupiah(entry.cash + entry.qris)}</td>
          <td className="px-4 py-3">{entry.member}</td></tr>)}
          {!entries.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada setoran di halaman ini.</td></tr>}
        </tbody>
      </table>
    </div>
    {(page > 1 || hasNext) && <nav aria-label="Halaman riwayat" className="flex gap-5 text-sm">
      {page > 1 && <Link className="underline" href={`/pemasukan?page=${page - 1}`}>Sebelumnya</Link>}
      {hasNext && <Link className="underline" href={`/pemasukan?page=${page + 1}`}>Berikutnya</Link>}
    </nav>}
  </div>;
}
