import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { RestockEvent, StockSnapshotRecord } from "../types/inventory";
import {
  calculateLiveSpeedflow,
  calculateOpnameAudit,
  calculateOpnameAuditHistory,
} from "./speedflow-rules";

function restock(
  id: string,
  date: string,
  quantity: number,
  lineTotal = quantity * 10_000,
  createdAt = `${date}T01:00:00.000Z`,
): RestockEvent {
  return {
    receiptLineId: id,
    date,
    recordedAt: `${date}T00:00:00.000Z`,
    quantity,
    lineTotal,
    createdAt,
  };
}

function snapshot(
  id: string,
  date: string,
  countedQty: number,
  postEventStock = countedQty,
  opts: {
    source?: "INLINE_RESTOCK" | "STANDALONE_OPNAME";
    receiptLineId?: string | null;
    createdAt?: string;
  } = {},
): StockSnapshotRecord {
  return {
    id,
    itemId: "item-1",
    source: opts.source ?? "STANDALONE_OPNAME",
    receiptLineId: opts.receiptLineId ?? null,
    countedQty,
    postEventStock,
    recordedAt: `${date}T00:00:00.000Z`,
    createdAt: opts.createdAt ?? `${date}T01:00:00.000Z`,
  };
}

describe("Mode 1: Live Dashboard Speedflow", () => {
  test("Calibrated mode uses two fresh anchors and excludes S_latest inline restock", () => {
    // Day 1: inline restock of 10 with 5 on shelf -> postEventStock = 15
    // Day 4: mid-interval restock of 10 (no opname)
    // Day 6: inline restock of 20 with 5 on shelf -> countedQty = 5, postEventStock = 25
    // Units sold in [Day 1, Day 6] = 15 + 10 - 5 = 20 over 5 days = 4/day (20 from Day 6 is excluded!)
    const restocks = [
      restock("line-1", "2026-11-01", 10),
      restock("line-2", "2026-11-04", 10),
      restock("line-3", "2026-11-06", 20),
    ];
    const snapshots = [
      snapshot("s-1", "2026-11-01", 5, 15, {
        source: "INLINE_RESTOCK",
        receiptLineId: "line-1",
      }),
      snapshot("s-2", "2026-11-06", 5, 25, {
        source: "INLINE_RESTOCK",
        receiptLineId: "line-3",
      }),
    ];

    const result = calculateLiveSpeedflow(
      restocks,
      snapshots,
      new Date("2026-11-10T00:00:00.000Z"),
    );

    assert.equal(result.confidence, "CALIBRATED");
    assert.equal(result.speedflowPerDay, 4);
    assert.equal(result.anchorSpanDays, 5);
    assert.equal(result.hasCountDiscrepancy, false);
  });

  test("Explicit 0 shelf count is treated as a 100% calibrated anchor", () => {
    const restocks = [restock("line-1", "2026-11-01", 30)];
    const snapshots = [
      snapshot("s-1", "2026-11-01", 0, 30, {
        source: "INLINE_RESTOCK",
        receiptLineId: "line-1",
      }),
      snapshot("s-2", "2026-11-11", 0, 0, {
        source: "STANDALONE_OPNAME",
      }),
    ];

    const result = calculateLiveSpeedflow(
      restocks,
      snapshots,
      new Date("2026-11-12T00:00:00.000Z"),
    );

    assert.equal(result.confidence, "CALIBRATED");
    assert.equal(result.speedflowPerDay, 3);
    assert.equal(result.hasCountDiscrepancy, false);
  });

  test("Clamps negative sales to 0 and flags COUNT_DISCREPANCY on miscount", () => {
    const snapshots = [
      snapshot("s-1", "2026-11-01", 10, 10),
      snapshot("s-2", "2026-11-06", 15, 15),
    ];

    const result = calculateLiveSpeedflow(
      [],
      snapshots,
      new Date("2026-11-07T00:00:00.000Z"),
    );

    assert.equal(result.confidence, "CALIBRATED");
    assert.equal(result.speedflowPerDay, 0);
    assert.equal(result.hasCountDiscrepancy, true);
  });

  test("Orders backdated entries strictly by recordedAt ASC rather than createdAt", () => {
    // s-backdated was created AFTER s-latest, but its recordedAt is earlier.
    const restocks = [
      restock("line-late", "2026-11-05", 10, 100_000, "2026-11-20T00:00:00.000Z"),
    ];
    const snapshots = [
      snapshot("s-latest", "2026-11-10", 5, 5, {
        createdAt: "2026-11-10T01:00:00.000Z",
      }),
      snapshot("s-backdated", "2026-11-01", 10, 10, {
        createdAt: "2026-11-20T01:00:00.000Z",
      }),
    ];

    const result = calculateLiveSpeedflow(
      restocks,
      snapshots,
      new Date("2026-11-12T00:00:00.000Z"),
    );

    // 10 + 10 - 5 = 15 over 9 days
    assert.equal(result.confidence, "CALIBRATED");
    assert.equal(result.anchorSpanDays, 9);
    assert.ok(Math.abs(result.speedflowPerDay - 15 / 9) < 1e-9);
  });

  test("Falls back to 14-day rolling window when >= 3 restocks exist in 14 days", () => {
    const restocks = [
      restock("l-1", "2026-11-05", 10),
      restock("l-2", "2026-11-09", 12),
      restock("l-3", "2026-11-13", 6),
    ];

    const result = calculateLiveSpeedflow(
      restocks,
      [],
      new Date("2026-11-15T00:00:00.000Z"),
    );

    assert.equal(result.confidence, "ESTIMATED");
    assert.equal(result.windowDays, 14);
    assert.equal(result.speedflowPerDay, 28 / 14);
    assert.equal(result.sampleCount, 3);
  });

  test("Widens rolling window to 30 days when < 3 restocks exist in 14 days", () => {
    const restocks = [
      restock("l-old", "2026-10-01", 100), // outside 30d window
      restock("l-1", "2026-10-25", 15),
      restock("l-2", "2026-11-10", 15),
    ];

    const result = calculateLiveSpeedflow(
      restocks,
      [],
      new Date("2026-11-15T00:00:00.000Z"),
    );

    assert.equal(result.confidence, "ESTIMATED");
    assert.equal(result.windowDays, 30);
    assert.equal(result.speedflowPerDay, 30 / 30);
    assert.equal(result.sampleCount, 2);
  });

  test("Falls back to rolling mode when latest anchor is older than 14 days", () => {
    const restocks = [restock("l-1", "2026-11-25", 30)];
    const staleSnapshots = [
      snapshot("s-1", "2026-10-01", 10, 10),
      snapshot("s-2", "2026-10-10", 1, 1),
    ];

    const result = calculateLiveSpeedflow(
      restocks,
      staleSnapshots,
      new Date("2026-11-26T00:00:00.000Z"),
    );

    assert.equal(result.confidence, "ESTIMATED");
    assert.equal(result.windowDays, 30);
    assert.equal(result.speedflowPerDay, 1);
  });
});

describe("Mode 2: Retroactive Opname Audit", () => {
  test("Reconciles long anchor-to-anchor gap (45 days) with weighted average COGS", () => {
    const sOld = snapshot("s-1", "2026-09-01", 10, 10);
    const sNew = snapshot("s-2", "2026-10-16", 5, 25, {
      source: "INLINE_RESTOCK",
      receiptLineId: "l-end",
    });
    const restocks = [
      restock("l-1", "2026-09-15", 20, 200_000), // 10,000/unit
      restock("l-2", "2026-10-01", 20, 240_000), // 12,000/unit -> weighted avg = 11,000/unit
      restock("l-end", "2026-10-16", 20, 300_000), // attached to sNew -> must be excluded!
    ];

    const audit = calculateOpnameAudit(sOld, sNew, restocks);

    assert.equal(audit.days, 45);
    assert.equal(audit.restockedQty, 40);
    assert.equal(audit.actualUnitsOut, 45); // 10 + 40 - 5
    assert.equal(audit.auditSpeedflow, 1);
    assert.equal(audit.weightedAverageUnitCost, 11_000);
    assert.equal(audit.actualCOGS, 495_000);
    assert.equal(audit.hasCountDiscrepancy, false);
  });

  test("Carries postEventStock from inline restock into the next audit interval", () => {
    const s1 = snapshot("s-1", "2026-11-01", 5, 15, {
      source: "INLINE_RESTOCK",
      receiptLineId: "l-1",
    });
    const s2 = snapshot("s-2", "2026-11-06", 5, 25, {
      source: "INLINE_RESTOCK",
      receiptLineId: "l-2",
    });
    const s3 = snapshot("s-3", "2026-11-11", 5, 5);
    const restocks = [
      restock("l-1", "2026-11-01", 10, 100_000),
      restock("l-2", "2026-11-06", 20, 200_000),
    ];

    const history = calculateOpnameAuditHistory([s3, s1, s2], restocks);
    assert.equal(history.length, 2);
    // Newest first: [s2 -> s3] then [s1 -> s2]
    assert.equal(history[0].actualUnitsOut, 20); // 25 + 0 - 5
    assert.equal(history[0].auditSpeedflow, 4);
    assert.equal(history[1].actualUnitsOut, 10); // 15 + 0 - 5 (l-2 excluded!)
    assert.equal(history[1].auditSpeedflow, 2);
  });
});
