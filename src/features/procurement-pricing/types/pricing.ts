// Shapes for tracking item unit prices, EMA baselines, Purchase Price Variance (PPV),
// and cross-supplier price comparisons from saved receipts.

export type BaseUnit = "KG" | "LITER" | "PCS";

/**
 * Purchase Price Variance (PPV) classification:
 * - CRITICAL: variance >= criticalThresholdPercent (default 10%)
 * - WARNING: variance >= warningThresholdPercent (Business.priceIncreaseThresholdPercent, default 5%)
 * - NORMAL: variance between -5% and warningThresholdPercent
 * - PRICE_DROP: variance <= -5% (favorable variance)
 */
export type PriceAlertLevel = "CRITICAL" | "WARNING" | "NORMAL" | "PRICE_DROP";

/** One confirmed receipt line used as input to the pricing engine. */
export interface ReceiptLinePriceInput {
  receiptLineId: string;
  receiptDate: string; // YYYY-MM-DD
  supplierId: string | null;
  supplierName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  /** Quantity converted to the item's baseUnit when compatible; null otherwise. */
  baseQuantity: number | null;
  baseUnit: BaseUnit | null;
}

/** One catalog item and all of its confirmed receipt lines, oldest first. */
export interface ItemPriceHistoryRecord {
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  lines: ReceiptLinePriceInput[];
}

/** One chronological step in the EMA & PPV calculation series. */
export interface PriceSeriesPoint {
  receiptLineId: string;
  date: string;
  supplierId: string | null;
  supplierName: string;
  /** Quantity used for normalization (baseQuantity if valid, else raw quantity). */
  normalizedQuantity: number;
  /** Unit label corresponding to normalizedQuantity. */
  normalizedUnit: string;
  /** Whether this line could be normalized to the item's baseUnit. */
  isBaseUnitNormalized: boolean;
  lineTotal: number;
  /** Current_Unit_Price = lineTotal / (baseQuantity ?? quantity) */
  unitPrice: number;
  /** EMA baseline BEFORE blending in this purchase (equals unitPrice on first purchase). */
  previousEmaUnitPrice: number;
  /** EMA baseline AFTER blending in this purchase: (unitPrice * alpha) + (previousEma * (1 - alpha)). */
  emaUnitPrice: number;
  /** ((unitPrice - previousEmaUnitPrice) / previousEmaUnitPrice) * 100. 0 on first purchase. */
  variancePercent: number;
  alertLevel: PriceAlertLevel;
}

/** Per-supplier pricing breakdown for an item. */
export interface SupplierPriceSummary {
  supplierKey: string;
  supplierId: string | null;
  supplierName: string;
  purchaseCount: number;
  lastPurchaseDate: string;
  latestUnitPrice: number;
  emaUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  normalizedUnit: string;
}

/** Recommendation of a cheaper supplier when the latest purchase spikes. */
export interface SupplierSubstitutionRecommendation {
  currentSupplierName: string;
  currentUnitPrice: number;
  recommendedSupplierId: string | null;
  recommendedSupplierName: string;
  recommendedLatestUnitPrice: number;
  recommendedEmaUnitPrice: number;
  /** Estimated savings per unit vs. the current supplier's latest price. */
  savingsPerUnit: number;
  /** Estimated savings in % vs. the current supplier's latest price. */
  savingsPercent: number;
  normalizedUnit: string;
}

/** Summary of an item's current pricing state (used in /barang and /beranda). */
export interface ItemPriceSummary {
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  purchaseCount: number;
  latestPurchaseDate: string | null;
  latestSupplierName: string | null;
  normalizedUnit: string;
  /** Latest normalized unit price. Null when no valid purchases exist. */
  latestUnitPrice: number | null;
  /** EMA baseline prior to the latest purchase (used to judge the latest spike). */
  previousEmaUnitPrice: number | null;
  /** Current blended EMA baseline including the latest purchase. */
  currentEmaUnitPrice: number | null;
  /** Variance % of the latest purchase against previousEmaUnitPrice. */
  latestVariancePercent: number;
  alertLevel: PriceAlertLevel;
  cheapestAlternative: SupplierSubstitutionRecommendation | null;
}

/** Full pricing detail for a single item (used in /barang/[id]). */
export interface ItemPriceDetail extends ItemPriceSummary {
  /** Chronological series of normalized prices, EMA baselines, and variances (oldest first). */
  series: PriceSeriesPoint[];
  /** Per-supplier breakdown sorted by latestUnitPrice ascending (cheapest first). */
  suppliers: SupplierPriceSummary[];
}

/** Home-screen price fluctuation alert card data (for /beranda). */
export interface PriceFluctuationAlerts {
  /** False when the owner turned price increase alerts off in Pengaturan. */
  enabled: boolean;
  thresholdPercent: number;
  /** Items currently in CRITICAL or WARNING alert state, sorted by highest variance first. */
  alertItems: ItemPriceSummary[];
}

