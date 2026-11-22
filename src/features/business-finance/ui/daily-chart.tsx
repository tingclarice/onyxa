"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/utils/format";
import type { FinanceDashboard } from "../types/finance";

const axisNumber = new Intl.NumberFormat("id-ID", { notation: "compact" });
const dateLabels = {
  day: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }),
  month: new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }),
  year: new Intl.DateTimeFormat("id-ID", { year: "numeric", timeZone: "UTC" }),
};
const fullDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "UTC" });
const titles = { day: "Arus kas harian", month: "Arus kas bulanan", year: "Arus kas tahunan" };

export function CashFlowChart({ cashFlow, chartInterval }: Pick<FinanceDashboard, "cashFlow" | "chartInterval">) {
  const label = dateLabels[chartInterval];
  const tooltipLabel = chartInterval === "day" ? fullDate : label;
  return (
    <section className="min-w-0 rounded-2xl border bg-card p-5">
      <h2 className="mb-4 text-lg font-semibold">{titles[chartInterval]}</h2>
      <div className="h-64 w-full" role="group" aria-label="Perbandingan setoran dan belanja dalam rupiah">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cashFlow} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={(date: string) => label.format(new Date(date))} minTickGap={12} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={(value: number) => axisNumber.format(value)} width={54} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip labelFormatter={(date) => tooltipLabel.format(new Date(String(date)))} formatter={(value) => formatRupiah(Number(value))}
              contentStyle={{ background: "var(--background)", borderColor: "var(--border)", borderRadius: 8 }} />
            <Legend iconType="circle" />
            <Bar name="Uang masuk" dataKey="income" fill="#087c67" maxBarSize={20} radius={[3,3,0,0]} />
            <Bar name="Belanja" dataKey="expense" fill="#c47832" maxBarSize={20} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
