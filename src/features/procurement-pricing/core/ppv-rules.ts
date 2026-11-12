import type {
  BaseUnit,
  ItemPriceDetail,
  ItemPriceHistoryRecord,
  ItemPriceSummary,
  PriceAlertLevel,
  PriceSeriesPoint,
  ReceiptLinePriceInput,
  SupplierPriceSummary,
  SupplierSubstitutionRecommendation,
} from "../types/pricing";

export const DEFAULT_EMA_ALPHA = 0.25;
export const DEFAULT_WARNING_THRESHOLD_PERCENT = 5;
export const DEFAULT_CRITICAL_THRESHOLD_PERCENT = 10;
export const PRICE_DROP_THRESHOLD_PERCENT = -5;

export interface PpvCalculationOptions {
  /** EMA smoothing factor (0 < alpha <= 1). Defaults to 0.25. */
  alpha?: number;
  /** Minimum positive variance % to trigger WARNING. Defaults to 5%. */
  warningThresholdPercent?: number;
  /** Minimum positive variance % to trigger CRITICAL. Defaults to max(10, warningThresholdPercent * 2). */
  criticalThresholdPercent?: number;
}

/**
 * Normalizes a receipt line's unit price:
 * Current_Unit_Price = lineTotal / (baseQuantity ?? quantity)
 * Prefers baseQuantity when it is positive and matches the item's baseUnit.
 * Returns null if both quantities are <= 0 or lineTotal < 0.
 */
export function calculateNormalizedUnitPrice(
  line: ReceiptLinePriceInput,
  itemBaseUnit: BaseUnit,
): {
  unitPrice: number;
  normalizedQuantity: number;
  normalizedUnit: string;
  isBaseUnitNormalized: boolean;
} | null {
  const hasCompatibleBaseQuantity =
    line.baseQuantity !== null &&
    Number.isFinite(line.baseQuantity) &&
    line.baseQuantity > 0 &&
    (line.baseUnit === null || line.baseUnit === itemBaseUnit);

  const normalizedQuantity = hasCompatibleBaseQuantity
    ? (line.baseQuantity as number)
    : line.quantity;

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    return null;
  }

  const effectiveTotal =
    Number.isFinite(line.lineTotal) && line.lineTotal > 0
      ? line.lineTotal
      : line.unitPrice * line.quantity;

  if (!Number.isFinite(effectiveTotal) || effectiveTotal < 0) {
    return null;
  }

  const unitPrice = roundCurrency(effectiveTotal / normalizedQuantity);
  return {
    unitPrice,
    normalizedQuantity,
    normalizedUnit: hasCompatibleBaseQuantity ? itemBaseUnit : line.unit,
    isBaseUnitNormalized: hasCompatibleBaseQuantity,
  };
}

/**
 * Blends a new unit price into the previous Exponential Moving Average (EMA):
 * New_EMA = (Current_Unit_Price * alpha) + (Previous_EMA * (1 - alpha))
 */
export function calculateNextEmaUnitPrice(
  currentUnitPrice: number,
  previousEmaUnitPrice: number,
  alpha: number = DEFAULT_EMA_ALPHA,
): number {
  const clampedAlpha = Math.min(1, Math.max(0.01, alpha));
  const nextEma =
    currentUnitPrice * clampedAlpha +
    previousEmaUnitPrice * (1 - clampedAlpha);
  return roundCurrency(nextEma);
}

/**
 * Calculates Purchase Price Variance (PPV) % against the previous EMA baseline
 * (prior to blending the new price into the EMA so the spike isn't dampened):
 * Variance_Percent = ((Current_Unit_Price - Previous_EMA) / Previous_EMA) * 100
 */
export function calculatePriceVariancePercent(
  currentUnitPrice: number,
  previousEmaUnitPrice: number,
): number {
  if (!Number.isFinite(previousEmaUnitPrice) || previousEmaUnitPrice <= 0) {
    return 0;
  }
  const rawPercent =
    ((currentUnitPrice - previousEmaUnitPrice) / previousEmaUnitPrice) * 100;
  return roundOneDecimal(rawPercent);
}

/**
 * Classifies a variance percentage into an alert level.
 */
export function classifyPriceAlertLevel(
  variancePercent: number,
  warningThresholdPercent: number = DEFAULT_WARNING_THRESHOLD_PERCENT,
  criticalThresholdPercent?: number,
): PriceAlertLevel {
  const effectiveWarning =
    warningThresholdPercent > 0
      ? warningThresholdPercent
      : DEFAULT_WARNING_THRESHOLD_PERCENT;
  const effectiveCritical =
    criticalThresholdPercent !== undefined && criticalThresholdPercent >= effectiveWarning
      ? criticalThresholdPercent
      : Math.max(DEFAULT_CRITICAL_THRESHOLD_PERCENT, effectiveWarning * 2);

  if (variancePercent >= effectiveCritical) return "CRITICAL";
  if (variancePercent >= effectiveWarning) return "WARNING";
  if (variancePercent <= PRICE_DROP_THRESHOLD_PERCENT) return "PRICE_DROP";
  return "NORMAL";
}

/**
 * Computes the chronological series of normalized unit prices, EMA baselines,
 * variance percentages, and alert levels from confirmed receipt lines.
 */
export function buildPriceSeries(
  lines: ReceiptLinePriceInput[],
  itemBaseUnit: BaseUnit,
  options: PpvCalculationOptions = {},
): PriceSeriesPoint[] {
  const alpha = options.alpha ?? DEFAULT_EMA_ALPHA;
  const warningThreshold =
    options.warningThresholdPercent ?? DEFAULT_WARNING_THRESHOLD_PERCENT;
  const criticalThreshold = options.criticalThresholdPercent;

  const sortedLines = [...lines].sort((a, b) =>
    a.receiptDate.localeCompare(b.receiptDate),
  );

  const series: PriceSeriesPoint[] = [];
  let runningEma: number | null = null;

  for (const line of sortedLines) {
    const normalized = calculateNormalizedUnitPrice(line, itemBaseUnit);
    if (!normalized) continue;

    const { unitPrice, normalizedQuantity, normalizedUnit, isBaseUnitNormalized } =
      normalized;

    if (runningEma === null) {
      runningEma = unitPrice;
      series.push({
        receiptLineId: line.receiptLineId,
        date: line.receiptDate,
        supplierId: line.supplierId,
        supplierName: line.supplierName,
        normalizedQuantity,
        normalizedUnit,
        isBaseUnitNormalized,
        lineTotal: line.lineTotal,
        unitPrice,
        previousEmaUnitPrice: unitPrice,
        emaUnitPrice: unitPrice,
        variancePercent: 0,
        alertLevel: "NORMAL",
      });
    } else {
      const previousEmaUnitPrice = runningEma;
      const variancePercent = calculatePriceVariancePercent(
        unitPrice,
        previousEmaUnitPrice,
      );
      const emaUnitPrice = calculateNextEmaUnitPrice(
        unitPrice,
        previousEmaUnitPrice,
        alpha,
      );
      const alertLevel = classifyPriceAlertLevel(
        variancePercent,
        warningThreshold,
        criticalThreshold,
      );

      runningEma = emaUnitPrice;
      series.push({
        receiptLineId: line.receiptLineId,
        date: line.receiptDate,
        supplierId: line.supplierId,
        supplierName: line.supplierName,
        normalizedQuantity,
        normalizedUnit,
        isBaseUnitNormalized,
        lineTotal: line.lineTotal,
        unitPrice,
        previousEmaUnitPrice,
        emaUnitPrice,
        variancePercent,
        alertLevel,
      });
    }
  }

  return series;
}

/**
 * Groups historical series points by supplier and computes each supplier's
 * latest normalized unit price and supplier-specific EMA unit price.
 * Sorted by latestUnitPrice ascending (cheapest supplier first).
 */
export function buildSupplierPriceBreakdown(
  series: PriceSeriesPoint[],
  alpha: number = DEFAULT_EMA_ALPHA,
): SupplierPriceSummary[] {
  const bySupplier = new Map<
    string,
    {
      supplierId: string | null;
      supplierName: string;
      points: PriceSeriesPoint[];
    }
  >();

  for (const point of series) {
    const key =
      point.supplierId ??
      `name:${point.supplierName.trim().toLocaleLowerCase("id-ID")}`;
    const existing = bySupplier.get(key);
    if (existing) {
      existing.points.push(point);
      existing.supplierName = point.supplierName;
    } else {
      bySupplier.set(key, {
        supplierId: point.supplierId,
        supplierName: point.supplierName,
        points: [point],
      });
    }
  }

  const summaries: SupplierPriceSummary[] = [];
  for (const [supplierKey, group] of bySupplier.entries()) {
    let supplierEma: number | null = null;
    let minUnitPrice = Infinity;
    let maxUnitPrice = -Infinity;

    for (const pt of group.points) {
      supplierEma =
        supplierEma === null
          ? pt.unitPrice
          : calculateNextEmaUnitPrice(pt.unitPrice, supplierEma, alpha);
      if (pt.unitPrice < minUnitPrice) minUnitPrice = pt.unitPrice;
      if (pt.unitPrice > maxUnitPrice) maxUnitPrice = pt.unitPrice;
    }

    const latest = group.points.at(-1);
    if (!latest || supplierEma === null) continue;

    summaries.push({
      supplierKey,
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      purchaseCount: group.points.length,
      lastPurchaseDate: latest.date,
      latestUnitPrice: latest.unitPrice,
      emaUnitPrice: supplierEma,
      minUnitPrice,
      maxUnitPrice,
      normalizedUnit: latest.normalizedUnit,
    });
  }

  return summaries.sort((a, b) => a.latestUnitPrice - b.latestUnitPrice);
}

/**
 * Chooses the cheapest alternative supplier from historical purchases when
 * another supplier offers a lower latest normalized unit price than the latest purchase.
 */
export function chooseCheapestAlternativeSupplier(
  latestPoint: PriceSeriesPoint | undefined,
  suppliers: SupplierPriceSummary[],
): SupplierSubstitutionRecommendation | null {
  if (!latestPoint || suppliers.length < 2) return null;

  const latestSupplierKey =
    latestPoint.supplierId ??
    `name:${latestPoint.supplierName.trim().toLocaleLowerCase("id-ID")}`;

  const cheaperAlternative = suppliers.find(
    (s) =>
      s.supplierKey !== latestSupplierKey &&
      s.normalizedUnit === latestPoint.normalizedUnit &&
      s.latestUnitPrice < latestPoint.unitPrice,
  );

  if (!cheaperAlternative) return null;

  const savingsPerUnit = roundCurrency(
    latestPoint.unitPrice - cheaperAlternative.latestUnitPrice,
  );
  const savingsPercent = roundOneDecimal(
    (savingsPerUnit / latestPoint.unitPrice) * 100,
  );

  if (savingsPerUnit <= 0 || savingsPercent <= 0) return null;

  return {
    currentSupplierName: latestPoint.supplierName,
    currentUnitPrice: latestPoint.unitPrice,
    recommendedSupplierId: cheaperAlternative.supplierId,
    recommendedSupplierName: cheaperAlternative.supplierName,
    recommendedLatestUnitPrice: cheaperAlternative.latestUnitPrice,
    recommendedEmaUnitPrice: cheaperAlternative.emaUnitPrice,
    savingsPerUnit,
    savingsPercent,
    normalizedUnit: latestPoint.normalizedUnit,
  };
}

/**
 * Computes full item pricing detail (series, summary, supplier comparison, and substitution insight).
 */
export function calculateItemPriceDetail(
  record: ItemPriceHistoryRecord,
  options: PpvCalculationOptions = {},
): ItemPriceDetail {
  const alpha = options.alpha ?? DEFAULT_EMA_ALPHA;
  const series = buildPriceSeries(record.lines, record.baseUnit, options);
  const suppliers = buildSupplierPriceBreakdown(series, alpha);
  const latestPoint = series.at(-1);
  const cheapestAlternative = chooseCheapestAlternativeSupplier(
    latestPoint,
    suppliers,
  );

  return {
    itemId: record.itemId,
    name: record.name,
    baseUnit: record.baseUnit,
    purchaseCount: series.length,
    latestPurchaseDate: latestPoint?.date ?? null,
    latestSupplierName: latestPoint?.supplierName ?? null,
    normalizedUnit: latestPoint?.normalizedUnit ?? record.baseUnit,
    latestUnitPrice: latestPoint?.unitPrice ?? null,
    previousEmaUnitPrice: latestPoint?.previousEmaUnitPrice ?? null,
    currentEmaUnitPrice: latestPoint?.emaUnitPrice ?? null,
    latestVariancePercent: latestPoint?.variancePercent ?? 0,
    alertLevel: latestPoint?.alertLevel ?? "NORMAL",
    cheapestAlternative,
    series,
    suppliers,
  };
}

/**
 * Computes the lightweight summary for an item (used in lists and alert cards).
 */
export function calculateItemPriceSummary(
  record: ItemPriceHistoryRecord,
  options: PpvCalculationOptions = {},
): ItemPriceSummary {
  const { series: _series, suppliers: _suppliers, ...summary } =
    calculateItemPriceDetail(record, options);
  return summary;
}

/**
 * Sorts items so CRITICAL and WARNING price spikes appear first (by highest variance %),
 * followed by NORMAL and PRICE_DROP items alphabetically.
 */
export function compareByPriceVarianceUrgency(
  a: ItemPriceSummary,
  b: ItemPriceSummary,
): number {
  const rank = (level: PriceAlertLevel): number => {
    if (level === "CRITICAL") return 0;
    if (level === "WARNING") return 1;
    if (level === "PRICE_DROP") return 2;
    return 3;
  };

  const rankDiff = rank(a.alertLevel) - rank(b.alertLevel);
  if (rankDiff !== 0) return rankDiff;

  if (a.alertLevel === "CRITICAL" || a.alertLevel === "WARNING") {
    const varDiff = b.latestVariancePercent - a.latestVariancePercent;
    if (varDiff !== 0) return varDiff;
  }

  return a.name.localeCompare(b.name, "id-ID");
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

