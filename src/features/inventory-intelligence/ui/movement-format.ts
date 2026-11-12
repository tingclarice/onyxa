import type { BaseUnit, MovementStatus } from "../types/inventory";

// Display text for movement numbers (formatting only, no rules).

const UNIT_LABELS: Record<BaseUnit, string> = { KG: "kg", LITER: "liter", PCS: "pcs" };

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function unitLabel(unit: BaseUnit): string {
  return UNIT_LABELS[unit];
}

/** "2 kg/hari", "0,7 liter/hari" */
export function formatPerDay(amount: number, unit: BaseUnit): string {
  return `${numberFormatter.format(amount)} ${unitLabel(unit)}/hari`;
}

/** "2 kg", "0,5 liter" */
export function formatQuantity(amount: number, unit: BaseUnit): string {
  return `${numberFormatter.format(amount)} ${unitLabel(unit)}`;
}

export function formatDays(days: number): string {
  return `${numberFormatter.format(Math.round(days))} hari`;
}

/** One short line under an item name. */
export function describeMovement(status: MovementStatus): string {
  switch (status.kind) {
    case "not_enough_data":
      return `Belum cukup data: baru tercatat di ${status.purchaseDays} tanggal pembelian (butuh 3 tanggal).`;
    case "slowing":
      return `Kecepatan habis turun ${status.burnRateDropPercent}% · restock terlambat ${formatDays(status.restockDelayDays)}`;
    case "normal":
      return `Biasanya habis ±${formatDays(status.expectedDaysToRunOut)} · dibeli ${formatDays(status.daysSinceLastPurchase)} lalu`;
  }
}
