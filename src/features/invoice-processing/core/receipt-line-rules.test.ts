import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chooseItemName,
  convertToBaseUnit,
  normalizeNameKey,
  quantityInItemUnit,
  shouldSaveAlias,
} from "./receipt-line-rules";

const line = {
  raw_name: "Gula",
  qty: 500,
  unit: "g",
  unit_price: 18,
  line_total: 9000,
  confidence: 0.9,
  matched_item: "Gula pasir",
};

test("weights and volumes convert to KG and LITER; other units count as PCS", () => {
  assert.deepEqual(convertToBaseUnit(500, "g"), { baseUnit: "KG", baseQuantity: 0.5 });
  assert.deepEqual(convertToBaseUnit(2, " Kg "), { baseUnit: "KG", baseQuantity: 2 });
  assert.deepEqual(convertToBaseUnit(3, "ons"), { baseUnit: "KG", baseQuantity: 0.3 });
  assert.deepEqual(convertToBaseUnit(750, "ml"), { baseUnit: "LITER", baseQuantity: 0.75 });
  assert.deepEqual(convertToBaseUnit(4, "pack"), { baseUnit: "PCS", baseQuantity: 4 });
  assert.deepEqual(convertToBaseUnit(1, "ikat"), { baseUnit: "PCS", baseQuantity: 1 });
});

test("a unit that does not fit the item's base unit is not used for burn rate", () => {
  assert.equal(quantityInItemUnit(500, "g", "KG"), 0.5);
  assert.equal(quantityInItemUnit(3, "pack", "KG"), null);
  assert.equal(quantityInItemUnit(2, "kg", "PCS"), null);
});

test("the matched name wins; the receipt name becomes an alias only when different", () => {
  assert.equal(chooseItemName(line), "Gula pasir");
  assert.equal(chooseItemName({ ...line, matched_item: null }), "Gula");
  assert.equal(shouldSaveAlias("Gula", "Gula pasir"), true);
  assert.equal(shouldSaveAlias(" gula  PASIR ", "Gula pasir"), false);
  assert.equal(normalizeNameKey("  Tepung   Terigu "), "tepung terigu");
});
