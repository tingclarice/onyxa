// Shapes for detecting items that are slowing down and computing adaptive speedflow.
// A reseller buys an item again when it has sold out, so the purchase history
// tells how fast each item is used up ("burn rate"), while optional Stock Opname
// anchors calibrate true velocity and unit/COGS reconciliation.

import { z } from "zod";

export type BaseUnit = "KG" | "LITER" | "PCS";

export type StockSnapshotSource = "INLINE_RESTOCK" | "STANDALONE_OPNAME";

/** One verified physical shelf count checkpoint, in the item's base unit. */
export interface StockSnapshotRecord {
  id: string;
  itemId: string;
  source: StockSnapshotSource;
  receiptLineId: string | null;
  countedQty: number;
  postEventStock: number;
  /** ISO-8601 timestamp used for chronological ordering. */
  recordedAt: string;
  /** ISO-8601 creation timestamp (tie-breaker only). */
  createdAt: string;
}

/** One saved restock line in the item's base unit, with identity for boundary exclusion. */
export interface RestockEvent {
  receiptLineId: string;
  /** Receipt date, YYYY-MM-DD. */
  date: string;
  /** ISO-8601 timestamp matching receiptDate. */
  recordedAt: string;
  /** Quantity in the item's base unit (kg, liter, or pcs). */
  quantity: number;
  /** Net line cost in Rupiah, used for weighted average COGS. */
  lineTotal: number;
  createdAt: string;
}

export type SpeedflowConfidence = "CALIBRATED" | "ESTIMATED";

/** Live operational velocity (Mode 1). */
export interface SpeedflowResult {
  speedflowPerDay: number;
  confidence: SpeedflowConfidence;
  /** Set when confidence === "ESTIMATED". */
  windowDays?: 14 | 30;
  /** Set when confidence === "CALIBRATED". */
  anchorSpanDays?: number;
  /** True when a miscount produced negative units sold and was clamped to 0. */
  hasCountDiscrepancy: boolean;
  /** Number of restocks (estimated) or anchors (calibrated) used. */
  sampleCount: number;
}

/** Retroactive anchor-to-anchor reconciliation (Mode 2: unit & COGS). */
export interface OpnameAuditResult {
  fromSnapshot: StockSnapshotRecord;
  toSnapshot: StockSnapshotRecord;
  days: number;
  restockedQty: number;
  actualUnitsOut: number;
  auditSpeedflow: number;
  weightedAverageUnitCost: number | null;
  actualCOGS: number | null;
  hasCountDiscrepancy: boolean;
}

export const CreateStockOpnameInputSchema = z.object({
  itemId: z.uuid({ error: "ID barang tidak valid." }),
  countedQty: z
    .number({ error: "Jumlah stok fisik harus berupa angka." })
    .nonnegative({ error: "Jumlah stok fisik tidak boleh kurang dari 0." }),
  recordedAt: z.iso.date({ error: "Tanggal stock opname tidak valid." }),
});

export type CreateStockOpnameInput = z.infer<typeof CreateStockOpnameInputSchema>;

export class StockOpnameError extends Error {}

/** One purchase of an item, in the item's base unit. */
export interface ItemPurchase {
  /** Receipt date, YYYY-MM-DD. */
  date: string;
  /** Quantity in the item's base unit (kg, liter or pcs). */
  quantity: number;
}

/** The most recent receipt line for an item, for display. */
export interface LastPurchaseDetails {
  date: string;
  supplierName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

/** Everything known about how an item has been bought. */
export interface ItemPurchaseHistory {
  category?: string | null;
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  /** Purchases usable for burn rate, oldest first. */
  purchases: ItemPurchase[];
  /** Individual saved receipt lines in baseUnit, for Speedflow & Opname Audit. */
  restocks?: RestockEvent[];
  lastPurchase: LastPurchaseDetails | null;
}

/** The item's movement, as judged from its burn rate. */
export type MovementStatus =
  | {
      kind: "not_enough_data";
      /** Purchase days found so far (at least MIN_PURCHASES are needed). */
      purchaseDays: number;
    }
  | {
      kind: "normal" | "slowing";
      /** Usual amount used per day (EMA), in the base unit. */
      usualBurnRatePerDay: number;
      /** Highest possible current amount per day: last quantity ÷ days since it was bought. */
      currentBurnRatePerDay: number;
      /** How much the burn rate dropped, in %. 0 when it has not dropped. */
      burnRateDropPercent: number;
      /** How many days the last purchase should last at the usual burn rate. */
      expectedDaysToRunOut: number;
      /** When the last purchase should have run out, YYYY-MM-DD. */
      expectedRunOutDate: string;
      daysSinceLastPurchase: number;
      /** Whole days past the expected run-out date. 0 when not late. */
      restockDelayDays: number;
    };

export interface ItemMovement {
  category?: string | null;
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  lastPurchase: LastPurchaseDetails | null;
  status: MovementStatus;
  speedflow: SpeedflowResult;
}

export interface ItemMovementDetail extends ItemMovement {
  /** Purchases used for the calculation, newest first. */
  purchases: ItemPurchase[];
  /** Physical stock count checkpoints, newest first. */
  snapshots: StockSnapshotRecord[];
  /** Retroactive anchor-to-anchor reconciliations, newest first. */
  audits: OpnameAuditResult[];
}

/** What the home-screen warning card needs. */
export interface SlowMovingWarnings {
  /** False when the owner turned slow-moving alerts off in Pengaturan. */
  enabled: boolean;
  slowingItems: ItemMovement[];
}
