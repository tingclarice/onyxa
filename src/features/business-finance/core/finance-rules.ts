import { SettlementError, type FinanceDashboard, type Purchase, type Ranking, type Settlement } from "../types/finance";

const DAY_MS = 86_400_000;
const FAST_RESTOCK_DAYS = 7;

export function businessDate(now: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function checkSettlementDate(date: string, today: string) {
  if (date > today) throw new SettlementError("Tanggal setoran melewati hari ini.");
}

// Allocate the final receipt total in cents, so a receipt-wide discount is applied exactly once.
function allocatePurchase(purchase: Purchase) {
  const sum = purchase.lines.reduce((total, line) => total + Math.round(line.amount * 100), 0);
  if (!sum) return purchase.lines.map(() => 0);
  const cents = Math.round(purchase.total * 100);
  let cumulative = 0;
  let allocated = 0;
  return purchase.lines.map((line) => {
    cumulative += Math.round(line.amount * 100);
    const next = Math.round(cents * cumulative / sum);
    const share = next - allocated;
    allocated = next;
    return share;
  });
}

function summarizePurchases(purchases: Purchase[]) {
  const categories = new Map<string, number>();
  const items = new Map<string, { name: string; quantities: Map<string, number>; days: Set<string>; cents: number }>();
  for (const purchase of purchases) {
    const shares = allocatePurchase(purchase);
    const unallocated = Math.round(purchase.total * 100) - shares.reduce((sum, value) => sum + value, 0);
    if (unallocated) categories.set("Tanpa rincian", (categories.get("Tanpa rincian") ?? 0) + unallocated);
    purchase.lines.forEach((line, index) => {
      const category = line.category || "Belum dikategorikan";
      categories.set(category, (categories.get(category) ?? 0) + shares[index]);
      const key = line.itemId ?? "nota:" + line.name.trim().toLowerCase();
      const item = items.get(key) ?? { name: line.name, quantities: new Map<string, number>(), days: new Set<string>(), cents: 0 };
      item.quantities.set(line.unit, (item.quantities.get(line.unit) ?? 0) + line.quantity);
      item.days.add(purchase.date);
      item.cents += shares[index];
      items.set(key, item);
    });
  }
  const ranking: Ranking[] = Array.from(items, ([key, item]) => {
    const dates = [...item.days].sort();
    const interval = dates.length < 2 ? null : (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / DAY_MS / (dates.length - 1);
    return { key, name: item.name, quantities: [...item.quantities], amount: item.cents / 100, interval,
      status: interval === null ? "Belum cukup data" : interval <= FAST_RESTOCK_DAYS ? "Cepat" : "Lambat" };
  });
  ranking.sort((a, b) => (a.interval ?? Infinity) - (b.interval ?? Infinity) || b.amount - a.amount || a.name.localeCompare(b.name, "id"));
  return { ranking, categories: Array.from(categories, ([name, cents]) => ({ name, value: cents / 100 })).sort((a, b) => b.value - a.value) };
}

export function buildMonthlyDashboard(today: string, settlements: Settlement[], purchases: Purchase[]): FinanceDashboard {
  const month = today.slice(0, 7);
  const daily = Array.from({ length: Number(today.slice(-2)) }, (_, index) => ({
    date: month + "-" + String(index + 1).padStart(2, "0"), income: 0, expense: 0,
  }));
  const days = new Map(daily.map((day) => [day.date, day]));
  const depositDates = new Set<string>();
  let cashCents = 0;
  let qrisCents = 0;
  let expenseCents = 0;
  for (const entry of settlements) {
    const day = days.get(entry.date);
    if (!day) continue;
    const cash = Math.round(entry.cash * 100);
    const qris = Math.round(entry.qris * 100);
    cashCents += cash;
    qrisCents += qris;
    day.income += (cash + qris) / 100;
    depositDates.add(entry.date);
  }
  const monthPurchases = purchases.filter((entry) => days.has(entry.date));
  for (const receipt of monthPurchases) {
    const day = days.get(receipt.date);
    if (day) day.expense += receipt.total;
    expenseCents += Math.round(receipt.total * 100);
  }
  const income = (cashCents + qrisCents) / 100;
  return { today, daily, income, expense: expenseCents / 100, balance: (cashCents + qrisCents - expenseCents) / 100,
    depositDays: depositDates.size, average: depositDates.size ? income / depositDates.size : null,
    channels: [{ name: "Cash", value: cashCents / 100 }, { name: "QRIS", value: qrisCents / 100 }],
    ...summarizePurchases(monthPurchases) };
}
