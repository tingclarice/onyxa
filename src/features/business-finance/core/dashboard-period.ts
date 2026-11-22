import { dashboardPeriodSchema, type ChartInterval, type DashboardFilter, type DashboardPeriod } from "../types/finance";

export function resolveDashboardPeriod(filter: DashboardFilter, today: string) {
  if (filter.start === undefined && filter.end === undefined) {
    return { period: { start: today.slice(0, 7) + "-01", end: today }, error: null };
  }
  const period = {
    start: typeof filter.start === "string" ? filter.start : "",
    end: typeof filter.end === "string" ? filter.end : "",
  };
  if (!dashboardPeriodSchema.safeParse(period).success) {
    return { period, error: "Isi tanggal awal dan tanggal akhir yang valid." };
  }
  if (period.start > period.end) {
    return { period, error: "Tanggal akhir harus sama dengan atau setelah tanggal awal." };
  }
  return { period, error: null };
}

const DAY_MS = 86_400_000;
const MAX_DAILY_CHART_DAYS = 92;
const MAX_MONTHLY_CHART_DAYS = 4 * 365;

export function chooseChartInterval(period: DashboardPeriod): ChartInterval {
  const days = (Date.parse(period.end) - Date.parse(period.start)) / DAY_MS + 1;
  if (days <= MAX_DAILY_CHART_DAYS) return "day";
  if (days <= MAX_MONTHLY_CHART_DAYS) return "month";
  return "year";
}

export function chartBucketDate(date: string, interval: ChartInterval) {
  if (interval === "year") return date.slice(0, 4) + "-01-01";
  if (interval === "month") return date.slice(0, 7) + "-01";
  return date;
}

export function buildChartBuckets(period: DashboardPeriod, interval: ChartInterval) {
  const cursor = new Date(chartBucketDate(period.start, interval));
  const endTime = Date.parse(period.end);
  const buckets = new Map<string, { date: string; income: number; expense: number }>();
  while (cursor.getTime() <= endTime) {
    const date = cursor.toISOString().slice(0, 10);
    buckets.set(date, { date, income: 0, expense: 0 });
    if (interval === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (interval === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
  }
  return buckets;
}
