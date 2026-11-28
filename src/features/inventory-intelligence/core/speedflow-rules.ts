import type {
  OpnameAuditResult,
  RestockEvent,
  SpeedflowResult,
  StockSnapshotRecord,
} from "../types/inventory";

// Adaptive Speedflow Engine (pure calculations, no DB/React/Next):
//
// Mode 1 (Live Dashboard Speedflow):
//   - Case A (Calibrated): Two anchors (S_prev, S_latest) exist, S_latest is
//     within MAX_ANCHOR_AGE_DAYS of `now`, and span >= 1 day.
//     unitsSold = S_prev.postEventStock + SUM(Restocks in (t_prev, t_latest]
//                 excluding S_latest's own receiptLineId) - S_latest.countedQty.
//   - Case B (Rolling Flow-Proxy): Capped 14-day rolling window, automatically
//     widening to 30 days when fewer than 3 restocks exist in 14 days.
//
// Mode 2 (Retroactive Opname Audit):
//   - Triggered for every consecutive anchor pair (S_old, S_new), regardless
//     of gap length. Computes actualUnitsOut, auditSpeedflow, weighted average
//     unit cost, and actualCOGS.

export const MAX_ANCHOR_AGE_DAYS = 14;
export const ROLLING_WINDOW_SHORT_DAYS = 14;
export const ROLLING_WINDOW_LONG_DAYS = 30;
export const MIN_RESTOCKS_FOR_SHORT_WINDOW = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Chronological comparator: strictly by recordedAt ASC, tie-broken by createdAt ASC. */
export function compareChronologically(
  a: { recordedAt: string; createdAt: string },
  b: { recordedAt: string; createdAt: string },
): number {
  const diff = Date.parse(a.recordedAt) - Date.parse(b.recordedAt);
  if (diff !== 0) return diff;
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

/** Sort snapshots strictly by recordedAt ASC (handles backdated entries). */
export function sortSnapshotsChronologically(
  snapshots: StockSnapshotRecord[],
): StockSnapshotRecord[] {
  return [...snapshots].sort(compareChronologically);
}

/** Sort restocks strictly by recordedAt ASC (handles backdated entries). */
export function sortRestocksChronologically(
  restocks: RestockEvent[],
): RestockEvent[] {
  return [...restocks].sort(compareChronologically);
}

/**
 * Restock events occurring strictly after `fromSnapshot` and up to `toSnapshot`,
 * excluding any restock line attached to `toSnapshot` (since `toSnapshot.countedQty`
 * was observed BEFORE `toSnapshot`'s restock was added) or `fromSnapshot`.
 */
export function selectIntervalRestocks(
  restocks: RestockEvent[],
  fromSnapshot: StockSnapshotRecord,
  toSnapshot: StockSnapshotRecord,
): RestockEvent[] {
  const fromMs = Date.parse(fromSnapshot.recordedAt);
  const toMs = Date.parse(toSnapshot.recordedAt);

  return restocks.filter((restock) => {
    if (
      toSnapshot.receiptLineId !== null &&
      restock.receiptLineId === toSnapshot.receiptLineId
    ) {
      return false;
    }
    if (
      fromSnapshot.receiptLineId !== null &&
      restock.receiptLineId === fromSnapshot.receiptLineId
    ) {
      return false;
    }
    const ts = Date.parse(restock.recordedAt);
    return ts > fromMs && ts <= toMs;
  });
}

/** Weighted average cost per base unit across the given restock events. */
export function calculateWeightedAverageUnitCost(
  restocks: RestockEvent[],
): number | null {
  let totalCost = 0;
  let totalQty = 0;
  for (const restock of restocks) {
    if (restock.quantity > 0 && restock.lineTotal >= 0) {
      totalCost += restock.lineTotal;
      totalQty += restock.quantity;
    }
  }
  if (totalQty <= 0) return null;
  return totalCost / totalQty;
}

/** Mode 1: Live Dashboard Speedflow (Calibrated if fresh anchor pair exists, else Rolling 14d/30d). */
export function calculateLiveSpeedflow(
  restocks: RestockEvent[],
  snapshots: StockSnapshotRecord[],
  now: Date,
): SpeedflowResult {
  const sortedSnapshots = sortSnapshotsChronologically(snapshots);
  const nowMs = now.getTime();

  // Case A: Calibrated Mode
  if (sortedSnapshots.length >= 2) {
    const latest = sortedSnapshots[sortedSnapshots.length - 1];
    const previous = sortedSnapshots[sortedSnapshots.length - 2];
    const latestMs = Date.parse(latest.recordedAt);
    const previousMs = Date.parse(previous.recordedAt);
    const anchorAgeDays = (nowMs - latestMs) / MS_PER_DAY;
    const spanDays = (latestMs - previousMs) / MS_PER_DAY;

    if (anchorAgeDays <= MAX_ANCHOR_AGE_DAYS && spanDays >= 1) {
      const intervalRestocks = selectIntervalRestocks(restocks, previous, latest);
      const restockedQty = intervalRestocks.reduce((sum, r) => sum + r.quantity, 0);
      const rawUnitsSold = previous.postEventStock + restockedQty - latest.countedQty;
      const hasCountDiscrepancy = rawUnitsSold < 0;
      const unitsSold = Math.max(0, rawUnitsSold);
      const days = Math.max(1, spanDays);

      return {
        speedflowPerDay: unitsSold / days,
        confidence: "CALIBRATED",
        anchorSpanDays: days,
        hasCountDiscrepancy,
        sampleCount: 2,
      };
    }
  }

  // Case B: Rolling Flow-Proxy Fallback (never stretches infinitely)
  const shortCutoffMs = nowMs - ROLLING_WINDOW_SHORT_DAYS * MS_PER_DAY;
  const shortRestocks = restocks.filter((r) => {
    const ts = Date.parse(r.recordedAt);
    return ts >= shortCutoffMs && ts <= nowMs;
  });

  if (shortRestocks.length >= MIN_RESTOCKS_FOR_SHORT_WINDOW) {
    const unitsSoldEstimate = shortRestocks.reduce((sum, r) => sum + r.quantity, 0);
    return {
      speedflowPerDay: unitsSoldEstimate / ROLLING_WINDOW_SHORT_DAYS,
      confidence: "ESTIMATED",
      windowDays: ROLLING_WINDOW_SHORT_DAYS,
      hasCountDiscrepancy: false,
      sampleCount: shortRestocks.length,
    };
  }

  const longCutoffMs = nowMs - ROLLING_WINDOW_LONG_DAYS * MS_PER_DAY;
  const longRestocks = restocks.filter((r) => {
    const ts = Date.parse(r.recordedAt);
    return ts >= longCutoffMs && ts <= nowMs;
  });
  const unitsSoldEstimate = longRestocks.reduce((sum, r) => sum + r.quantity, 0);

  return {
    speedflowPerDay: unitsSoldEstimate / ROLLING_WINDOW_LONG_DAYS,
    confidence: "ESTIMATED",
    windowDays: ROLLING_WINDOW_LONG_DAYS,
    hasCountDiscrepancy: false,
    sampleCount: longRestocks.length,
  };
}

/** Mode 2: Retroactive Opname Audit between two consecutive anchors (any span). */
export function calculateOpnameAudit(
  fromSnapshot: StockSnapshotRecord,
  toSnapshot: StockSnapshotRecord,
  restocks: RestockEvent[],
): OpnameAuditResult {
  const fromMs = Date.parse(fromSnapshot.recordedAt);
  const toMs = Date.parse(toSnapshot.recordedAt);
  const days = Math.max(1, (toMs - fromMs) / MS_PER_DAY);

  const intervalRestocks = selectIntervalRestocks(restocks, fromSnapshot, toSnapshot);
  const restockedQty = intervalRestocks.reduce((sum, r) => sum + r.quantity, 0);
  const rawUnitsOut = fromSnapshot.postEventStock + restockedQty - toSnapshot.countedQty;
  const hasCountDiscrepancy = rawUnitsOut < 0;
  const actualUnitsOut = Math.max(0, rawUnitsOut);
  const auditSpeedflow = actualUnitsOut / days;

  // Prefer weighted average unit cost from interval restocks; fall back to historical cost up to toSnapshot.
  const costPool =
    intervalRestocks.length > 0
      ? intervalRestocks
      : restocks.filter((r) => Date.parse(r.recordedAt) <= toMs);
  const weightedAverageUnitCost = calculateWeightedAverageUnitCost(costPool);
  const actualCOGS =
    weightedAverageUnitCost !== null ? actualUnitsOut * weightedAverageUnitCost : null;

  return {
    fromSnapshot,
    toSnapshot,
    days,
    restockedQty,
    actualUnitsOut,
    auditSpeedflow,
    weightedAverageUnitCost,
    actualCOGS,
    hasCountDiscrepancy,
  };
}

/** Computes all consecutive anchor-to-anchor audits for an item, newest first. */
export function calculateOpnameAuditHistory(
  snapshots: StockSnapshotRecord[],
  restocks: RestockEvent[],
): OpnameAuditResult[] {
  const sorted = sortSnapshotsChronologically(snapshots);
  const audits: OpnameAuditResult[] = [];
  for (let i = 1; i < sorted.length; i++) {
    audits.push(calculateOpnameAudit(sorted[i - 1], sorted[i], restocks));
  }
  return audits.reverse();
}
