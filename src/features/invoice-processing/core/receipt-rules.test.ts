import assert from "node:assert/strict";
import { test } from "node:test";
import type { ScanReceipt } from "../types/scan";
import { getReceiptImageProblem } from "./receipt-image-rules";
import {
  countFieldsNeedingReview,
  hasTotalMismatch,
  sumLineTotals,
} from "./receipt-review-rules";

const item = {
  raw_name: "Telur",
  qty: 2,
  unit: "kg",
  unit_price: 25000,
  line_total: 50000,
  confidence: 0.95,
  matched_item: null,
};
const receipt: ScanReceipt = {
  supplier_name: "Pasar",
  date: "2026-11-05",
  items: [item, { ...item, line_total: 30000 }],
  total: 80000,
  overall_confidence: 0.9,
};

test("line totals are summed, ignoring empty numbers", () => {
  assert.equal(sumLineTotals(receipt.items), 80000);
  assert.equal(sumLineTotals([item, { ...item, line_total: Number.NaN }]), 50000);
});

test("a clean receipt needs no review", () => {
  assert.equal(hasTotalMismatch(receipt), false);
  assert.equal(countFieldsNeedingReview(receipt), 0);
});

test("low header confidence adds 3, each unsure line adds 1, a wrong total adds 1", () => {
  const unsure: ScanReceipt = {
    ...receipt,
    overall_confidence: 0.5,
    items: [{ ...item, confidence: 0.79 }, { ...item, line_total: 30000 }],
    total: 99000,
  };
  assert.equal(hasTotalMismatch(unsure), true);
  assert.equal(countFieldsNeedingReview(unsure), 3 + 1 + 1);
});

test("photos must be a supported type, not empty, and at most 8 MB", () => {
  assert.equal(getReceiptImageProblem({ type: "image/jpeg", size: 1000 }), null);
  assert.equal(
    getReceiptImageProblem({ type: "application/pdf", size: 1000 })?.code,
    "unreadable_image",
  );
  assert.equal(
    getReceiptImageProblem({ type: "image/png", size: 0 })?.code,
    "unreadable_image",
  );
  assert.equal(
    getReceiptImageProblem({ type: "image/png", size: 9 * 1024 * 1024 })?.code,
    "file_too_large",
  );
});
