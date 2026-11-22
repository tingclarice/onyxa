import { formatRupiah } from "@/lib/utils/format";
import type { FinanceDashboard, Ranking } from "../types/finance";

export function SummaryCards({ data }: { data: FinanceDashboard }) {
  const cards = [
    ["Total uang masuk", formatRupiah(data.income), "Cash dan QRIS"],
    ["Pengeluaran belanja", formatRupiah(data.expense), "Total nota tersimpan"],
    ["Estimasi profit bersih", formatRupiah(data.balance), "Selisih kas masuk dan belanja"],
    ["Rata-rata setoran per hari", data.average === null ? "—" : formatRupiah(data.average),
      data.depositDays ? `Dari ${data.depositDays} hari dengan setoran` : "Belum ada hari dengan setoran"],
  ];
  return <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, note]) =>
    <div key={label} className="rounded-2xl border bg-card p-5">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
      <dd className="mt-1 text-xs text-muted-foreground">{note}</dd>
    </div>)}</dl>;
}

const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
export function MovementRanking({ items }: { items: Ranking[] }) {
  return <section className="min-w-0 self-start rounded-2xl border bg-card">
    <div className="space-y-1 p-5"><h2 className="text-lg font-semibold">Peringkat pergerakan barang</h2>
      <p className="text-sm text-muted-foreground">Diurutkan dari jeda restock terpendek dalam periode yang dipilih. Cepat jika rata-rata 7 hari atau kurang.</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[35rem] text-left text-sm">
      <thead className="border-y bg-muted/50 text-muted-foreground"><tr>{["Nama barang","Total qty masuk","Total nominal","Rata-rata restock","Status"].map((label) =>
        <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
      <tbody className="divide-y">{items.map((item) => <tr key={item.key}>
        <th scope="row" className="px-4 py-3 font-medium">{item.name}</th>
        <td className="px-4 py-3">{item.quantities.map(([unit, qty]) => number.format(qty) + " " + unit).join(" + ")}</td>
        <td className="px-4 py-3 tabular-nums">{formatRupiah(item.amount)}</td>
        <td className="px-4 py-3">{item.interval === null ? "—" : number.format(item.interval) + " hari"}</td>
        <td className="px-4 py-3">{item.status}</td>
      </tr>)}
      {!items.length && <tr><td colSpan={5} className="p-5 text-muted-foreground">Belum ada barang dari nota pada periode ini.</td></tr>}</tbody>
    </table></div>
  </section>;
}

const colors = ["#087c67","#6477ac","#c47832","#ad5685","#488897","#9d8237","#795ba2"];
export function CompositionChart({ title, parts }: { title: string; parts: { name: string; value: number }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  let end = 0;
  const stops: string[] = [];
  for (const [index, part] of parts.entries()) {
    const start = end;
    end += total ? part.value / total * 100 : 0;
    stops.push(colors[index % colors.length] + " " + start + "% " + end + "%");
  }
  return <section className="rounded-2xl border bg-card p-5">
    <h2 className="mb-4 text-base font-semibold">{title}</h2>
    {total ? <div className="flex flex-wrap items-center gap-5">
      <div aria-hidden className="grid size-24 shrink-0 place-items-center rounded-full"
        style={{ background: "conic-gradient(" + stops.join(", ") + ")" }}>
        <div className="size-14 rounded-full bg-card" />
      </div>
      <ul className="min-w-0 flex-1 space-y-2">{parts.map((part, index) => <li key={part.name} className="text-sm">
        <div className="flex items-center gap-2"><span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} />
          <span className="break-words">{part.name}</span></div>
        <p className="pl-4 text-xs text-muted-foreground">{formatRupiah(part.value)} · {number.format(part.value / total * 100)}%</p>
      </li>)}</ul>
    </div> : <p className="text-sm text-muted-foreground">Belum ada nominal untuk periode ini.</p>}
  </section>;
}
