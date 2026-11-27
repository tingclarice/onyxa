import assert from "node:assert/strict";
import { test } from "node:test";
import type { ScanReceipt } from "../types/scan";
import { getReceiptImageProblem } from "./receipt-image-rules";
import {
  countFieldsNeedingReview,
  createEmptyReceiptItem,
  hasTotalMismatch,
  hasUnsavedItemDraft,
  sumLineTotals,
  syncReceiptItemTotals,
  validateDraftReceiptItem,
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

test("syncReceiptItemTotals keeps unit price and line total aligned", () => {
  const base = createEmptyReceiptItem();
  const byLineTotal = syncReceiptItemTotals(base, { ...base, qty: 2, line_total: 30000 });
  assert.equal(byLineTotal.unit_price, 15000);

  const byUnitPrice = syncReceiptItemTotals(base, { ...base, qty: 3, unit_price: 4000 });
  assert.equal(byUnitPrice.line_total, 12000);
});

test("hasUnsavedItemDraft detects active edits and partial add-form input", () => {
  const empty = createEmptyReceiptItem();
  assert.equal(hasUnsavedItemDraft(empty, null), false);
  assert.equal(hasUnsavedItemDraft(empty, 0), true);
  assert.equal(hasUnsavedItemDraft({ ...empty, raw_name: "Gula" }, null), true);
  assert.equal(hasUnsavedItemDraft({ ...empty, line_total: 10000 }, null), true);
});

test("validateDraftReceiptItem checks required fields and line discounts", () => {
  const empty = createEmptyReceiptItem();
  const emptyErrors = validateDraftReceiptItem(empty);
  assert.ok(emptyErrors.raw_name);

  const badQtyErrors = validateDraftReceiptItem({ ...item, qty: 0, discount: 60000 });
  assert.ok(badQtyErrors.qty);
  assert.ok(badQtyErrors.discount);

  assert.deepEqual(validateDraftReceiptItem(item), {});
});
