import type {
  ItemPurchase,
  ItemPurchaseHistory,
  MovementStatus,
} from "../types/inventory";

// How slowing items are detected (all pure calculations):
//
//   1. Burn rate of one purchase = quantity bought ÷ days until the next purchase.
//   2. Usual burn rate = EMA of those rates (recent purchases count more).
//   3. The last purchase should run out after: last quantity ÷ usual burn rate days.
//   4. If the item was not bought again by then, plus a grace period
//      (grace % of the expected days, set by the owner), it is "Melambat".
//   5. We show how much the burn rate dropped and how many days restocking is late.

/** Need at least this many purchase days (two gaps) before judging an item. */
export const MIN_PURCHASES = 3;

/** EMA weight of the newest burn rate (0–1). Higher = reacts faster to change. */
export const EMA_SMOOTHING = 0.4;

/** The grace period is never shorter than this. */
export const MIN_GRACE_DAYS = 1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). Never negative. */
export function daysBetween(from: string, to: string): number {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
  return Math.max(0, days);
}

/** Receipt dates are Indonesian calendar days, so "today" is counted in WIB. */
export const BUSINESS_TIME_ZONE = "Asia/Jakarta";

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in the business time zone, YYYY-MM-DD. */
export function toLocalDateKey(now: Date, timeZone: string = BUSINESS_TIME_ZONE): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  return toDateKey(new Date(Date.parse(date) + Math.round(days) * MS_PER_DAY));
}

/** Two receipts on the same day count as one purchase of the total quantity. */
export function combineSameDayPurchases(purchases: ItemPurchase[]): ItemPurchase[] {
  const totalsByDate = new Map<string, number>();
  for (const purchase of purchases) {
    totalsByDate.set(
      purchase.date,
      (totalsByDate.get(purchase.date) ?? 0) + purchase.quantity,
    );
  }
  return [...totalsByDate.entries()]
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Burn rate of each purchase: its quantity ÷ days until the next purchase.
 * Example: 10 kg on 1 Oct, next purchase on 6 Oct → 10 / 5 = 2 kg per day.
 * The last purchase has no "next" yet, so it has no rate.
 */
export function calculateBurnRates(purchases: ItemPurchase[]): number[] {
  const rates: number[] = [];
  for (let i = 0; i < purchases.length - 1; i++) {
    const days = daysBetween(purchases[i].date, purchases[i + 1].date);
    if (days > 0) rates.push(purchases[i].quantity / days);
  }
  return rates;
}

/** Exponential moving average: each new rate moves the average by EMA_SMOOTHING. */
export function calculateEma(values: number[]): number {
  let average = values[0] ?? 0;
  for (const value of values.slice(1)) {
    average = EMA_SMOOTHING * value + (1 - EMA_SMOOTHING) * average;
  }
  return average;
}

/** Grace period in days: grace % of the expected days, at least MIN_GRACE_DAYS. */
export function calculateGraceDays(
  expectedDaysToRunOut: number,
  gracePercent: number,
): number {
  return Math.max(MIN_GRACE_DAYS, (expectedDaysToRunOut * gracePercent) / 100);
}

/** Percentage drop from `usual` to `current`. 0 when it did not drop. */
export function calculateDropPercent(usual: number, current: number): number {
  if (usual <= 0 || current >= usual) return 0;
  return Math.round((1 - current / usual) * 100);
}

/** Judges one item: Belum cukup data, Normal, or Melambat (with how much and how late). */
export function calculateItemMovement(
  history: ItemPurchaseHistory,
  today: string,
  gracePercent: number,
): MovementStatus {
  const purchases = combineSameDayPurchases(history.purchases);
  const rates = calculateBurnRates(purchases);
  const usualBurnRatePerDay = calculateEma(rates);
  const lastPurchase = purchases.at(-1);

  if (purchases.length < MIN_PURCHASES || !lastPurchase || usualBurnRatePerDay <= 0)
    return { kind: "not_enough_data", purchaseDays: purchases.length };

  const expectedDaysToRunOut = lastPurchase.quantity / usualBurnRatePerDay;
  const daysSinceLastPurchase = daysBetween(lastPurchase.date, today);
  const daysLate = daysSinceLastPurchase - expectedDaysToRunOut;
  const isSlowing =
    daysLate > calculateGraceDays(expectedDaysToRunOut, gracePercent);

  // If it is still not bought again, it was used at most this fast.
  const currentBurnRatePerDay =
    daysSinceLastPurchase > 0
      ? lastPurchase.quantity / daysSinceLastPurchase
      : usualBurnRatePerDay;

  return {
    kind: isSlowing ? "slowing" : "normal",
    usualBurnRatePerDay,
    currentBurnRatePerDay: Math.min(currentBurnRatePerDay, usualBurnRatePerDay),
    burnRateDropPercent: calculateDropPercent(usualBurnRatePerDay, currentBurnRatePerDay),
    expectedDaysToRunOut,
    expectedRunOutDate: addDays(lastPurchase.date, expectedDaysToRunOut),
    daysSinceLastPurchase,
    restockDelayDays: Math.max(0, Math.round(daysLate)),
  };
}

/** Slowing items first (most late first), then the rest by name. */
export function compareByUrgency(
  a: { name: string; status: MovementStatus },
  b: { name: string; status: MovementStatus },
): number {
  const delay = (status: MovementStatus) =>
    status.kind === "slowing" ? status.restockDelayDays : -1;
  return delay(b.status) - delay(a.status) || a.name.localeCompare(b.name, "id");
}
