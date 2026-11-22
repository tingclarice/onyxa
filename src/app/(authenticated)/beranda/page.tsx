import { redirect } from "next/navigation";
import { getBusinessWorkspace } from "@/features/business-management/server";
import { getDashboard } from "@/features/business-finance/server";
import { SummaryCards, MovementRanking, CompositionChart } from "@/features/business-finance/ui/dashboard-sections";
import { CashFlowChart } from "@/features/business-finance/ui/daily-chart";
import { DashboardPeriodFilter } from "@/features/business-finance/ui/dashboard-period-filter";

export const instant = false;

export default async function BerandaPage({ searchParams }: PageProps<"/beranda">) {
  const { active } = await getBusinessWorkspace();
  if (!active) return null;
  if (active.role !== "OWNER") redirect("/scan");
  const { start, end } = await searchParams;
  const { data, period, error } = await getDashboard({ start, end });
  const custom = start !== undefined || end !== undefined;
  const format = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const label = data ? format.formatRange(new Date(period.start), new Date(period.end)) : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Beranda</h1>
        <p className="text-muted-foreground">{active.business.name}{label && ` · ${label}`}</p>
      </header>
      <DashboardPeriodFilter key={`${custom}-${period.start}-${period.end}`} period={period} error={error} custom={custom} />
      {data && (
        <>
          <SummaryCards data={data} />
          <CashFlowChart cashFlow={data.cashFlow} chartInterval={data.chartInterval} />
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(16rem,1fr)]">
            <MovementRanking items={data.ranking} />
            <div className="space-y-5">
              <CompositionChart title="Komposisi pemasukan" parts={data.channels} />
              <CompositionChart title="Pengeluaran per kategori barang" parts={data.categories} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
