import type { BaseUnit, ScanReceiptItem } from "../types/scan";

// Rules for turning a reviewed receipt line into a stored purchase.
// Purchases are compared in three base units: KG, LITER and PCS.

/** How each written unit converts to a base unit. Anything not listed counts as PCS. */
const UNIT_CONVERSIONS: Record<string, { baseUnit: BaseUnit; factor: number }> = {
  kg: { baseUnit: "KG", factor: 1 },
  kilo: { baseUnit: "KG", factor: 1 },
  kilogram: { baseUnit: "KG", factor: 1 },
  g: { baseUnit: "KG", factor: 0.001 },
  gr: { baseUnit: "KG", factor: 0.001 },
  gram: { baseUnit: "KG", factor: 0.001 },
  ons: { baseUnit: "KG", factor: 0.1 },
  l: { baseUnit: "LITER", factor: 1 },
  lt: { baseUnit: "LITER", factor: 1 },
  ltr: { baseUnit: "LITER", factor: 1 },
  liter: { baseUnit: "LITER", factor: 1 },
  litre: { baseUnit: "LITER", factor: 1 },
  ml: { baseUnit: "LITER", factor: 0.001 },
};

/** Names are matched lowercased, trimmed, with single spaces. */
export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The catalog item name for a line: the matched name, otherwise the name on the receipt. */
export function chooseItemName(line: ScanReceiptItem): string {
  return (line.matched_item ?? line.raw_name).trim() || line.raw_name.trim();
}

/**
 * Converts a quantity to its base unit.
 * "500 g" → 0.5 KG, "2 liter" → 2 LITER, "3 pack" → 3 PCS.
 */
export function convertToBaseUnit(
  quantity: number,
  unit: string,
): { baseUnit: BaseUnit; baseQuantity: number } {
  const conversion = UNIT_CONVERSIONS[normalizeNameKey(unit)];
  if (!conversion) return { baseUnit: "PCS", baseQuantity: quantity };
  return {
    baseUnit: conversion.baseUnit,
    baseQuantity: roundQuantity(quantity * conversion.factor),
  };
}

/**
 * The quantity to use for burn rate, in the item's base unit.
 * Returns null when the units do not fit (e.g. an item counted in KG
 * bought in "pack"): the line is still saved, but not used for burn rate.
 */
export function quantityInItemUnit(
  quantity: number,
  unit: string,
  itemBaseUnit: BaseUnit,
): number | null {
  const converted = convertToBaseUnit(quantity, unit);
  return converted.baseUnit === itemBaseUnit ? converted.baseQuantity : null;
}

/** True when the receipt name should be remembered as another name for the item. */
export function shouldSaveAlias(rawName: string, itemName: string): boolean {
  const rawKey = normalizeNameKey(rawName);
  return rawKey !== "" && rawKey !== normalizeNameKey(itemName);
}

/** Avoids floating-point noise such as 0.30000000000000004. */
function roundQuantity(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
