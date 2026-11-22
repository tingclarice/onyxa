import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardPeriod } from "../types/finance";

export function DashboardPeriodFilter({ period, error, custom }: {
  period: DashboardPeriod;
  error: string | null;
  custom: boolean;
}) {
  return (
    <Form action="/beranda" aria-label="Filter periode statistik"
      className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
      <label className="grid min-w-36 flex-1 gap-2 text-sm font-medium sm:flex-none">
        Tanggal awal
        <Input type="date" name="start" required defaultValue={period.start} />
      </label>
      <label className="grid min-w-36 flex-1 gap-2 text-sm font-medium sm:flex-none">
        Tanggal akhir
        <Input type="date" name="end" required defaultValue={period.end} />
      </label>
      <Button type="submit">Terapkan</Button>
      {custom && <Button asChild variant="outline"><Link href="/beranda">Bulan berjalan</Link></Button>}
      {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
    </Form>
  );
}
