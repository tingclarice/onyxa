import assert from "node:assert/strict";
import { test } from "node:test";
import { findCatalogName, matchExtractedItem } from "./receipt-catalog-rules";
import type { ExtractedReceiptItem, ReceiptCatalogItem } from "../types/scan";

const generic: ReceiptCatalogItem = { id: "generic", name: "Minyak Goreng", baseUnit: "LITER", aliases: [] };
const sunco = { ...generic, id: "sunco", name: "Minyak Goreng Sunco" };
const bimoli = { ...generic, id: "bimoli", name: "Minyak Goreng Bimoli" };
const oil: ExtractedReceiptItem = {
  raw_name: "SUNCO 2L", product_name: "Minyak Goreng", brand: "Sunco", package_size: 2, package_unit: "liter",
  matched_item: "Minyak Goreng", qty: 3, unit: "pouch", unit_price: 35000, line_total: 105000,
  discount: 1000, confidence: 0.9,
};

test("specific brand wins over generic and a conflicting brand cannot be selected by the model", () => {
  assert.equal(matchExtractedItem(oil, [generic, bimoli, sunco]).catalog_item_id, sunco.id);
  const wrongHint = { ...oil, matched_item: bimoli.name };
  assert.equal(matchExtractedItem(wrongHint, [bimoli, generic]).catalog_item_id, generic.id);
  const otherProduct = { ...sunco, name: "Margarin Sunco" };
  assert.equal(matchExtractedItem({ ...oil, matched_item: otherProduct.name }, [otherProduct]).matched_item, null);
  const unmatched = matchExtractedItem(wrongHint, [bimoli]);
  assert.equal(unmatched.catalog_item_id, undefined);
  assert.equal(unmatched.proposed_name, "Minyak Goreng Sunco");
  assert.equal(unmatched.raw_name, "SUNCO 2L");
  assert.equal(matchExtractedItem({ ...oil, raw_name: "M GRG", brand: "" }, [sunco]).matched_item, null);
});

test("printed pack count, unit price and discount keep the same monetary amounts when buying by volume", () => {
  const measured = matchExtractedItem(oil, [generic]);
  assert.deepEqual([measured.qty, measured.unit, measured.unit_price, measured.line_total, measured.discount],
    [6, "liter", 17500, 105000, 1000]);
  const piece = matchExtractedItem(oil, [{ ...generic, baseUnit: "PCS" }]);
  assert.deepEqual([piece.qty, piece.unit, piece.unit_price], [3, "pouch", 35000]);
  const byVolume = matchExtractedItem({ ...oil, unit: "liter" }, [generic]);
  assert.equal(byVolume.qty, 3);
});

test("manual exact names and previously confirmed aliases resolve to the same catalog record", () => {
  const catalog = [{ ...generic, aliases: ["M GRG"] }];
  assert.equal(findCatalogName(catalog, "  MINYAK   goreng "), catalog[0]);
  assert.equal(findCatalogName(catalog, "m grg"), catalog[0]);
  assert.equal(findCatalogName(catalog, "Mi"), undefined);
});
