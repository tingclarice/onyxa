import { z } from "zod";

const amount = z.number().finite().nonnegative().max(999_999_999_999).multipleOf(0.01);
export const settlementSchema = z.object({
  id: z.uuid(), date: z.iso.date(), cash: amount, qris: amount,
}).refine((row) => row.cash > 0 || row.qris > 0, "Isi setidaknya satu nominal setoran.");

export type SettlementInput = z.infer<typeof settlementSchema>;
export type Settlement = { date: string; cash: number; qris: number };
export interface HistoryEntry extends Settlement { id: string; member: string }
export interface Purchase {
  date: string;
  total: number;
  lines: {
    itemId: string | null; name: string; category: string | null;
    quantity: number; unit: string; amount: number;
  }[];
}
export interface Ranking {
  name: string; key: string; quantities: [string, number][]; amount: number;
  interval: number | null; status: "Cepat" | "Lambat" | "Belum cukup data";
}
export type DashboardPeriod = { start: string; end: string };
export type DashboardFilter = { start?: string | string[]; end?: string | string[] };
const calendarDate = z.iso.date().refine((date) => !date.startsWith("0000"));
export const dashboardPeriodSchema = z.object({ start: calendarDate, end: calendarDate });
export type ChartInterval = "day" | "month" | "year";

export interface FinanceDashboard {
  income: number; expense: number; balance: number; average: number | null; depositDays: number;
  chartInterval: ChartInterval;
  cashFlow: { date: string; income: number; expense: number }[];
  channels: { name: string; value: number }[];
  categories: { name: string; value: number }[];
  ranking: Ranking[];
}
export class SettlementError extends Error {}
