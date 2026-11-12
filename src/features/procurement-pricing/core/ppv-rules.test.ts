import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPriceSeries,
  calculateItemPriceDetail,
  calculateNextEmaUnitPrice,
  calculateNormalizedUnitPrice,
  calculatePriceVariancePercent,
  classifyPriceAlertLevel,
} from "./ppv-rules";
import type { ItemPriceHistoryRecord, ReceiptLinePriceInput } from "../types/pricing";

describe("procurement-pricing core PPV rules", () => {
  it("normalizes unit price using baseQuantity when available", () => {
    const bulkLine: ReceiptLinePriceInput = {
      receiptLineId: "l-1",
      receiptDate: "2026-10-01",
      supplierId: "s-1",
      supplierName: "Grosir A",
      quantity: 2,
      unit: "karton (12L)",
      unitPrice: 216000,
      lineTotal: 432000,
      baseQuantity: 24,
      baseUnit: "LITER",
    };

    const result = calculateNormalizedUnitPrice(bulkLine, "LITER");
    assert.ok(result);
    assert.equal(result.unitPrice, 18000); // 432000 / 24
    assert.equal(result.normalizedQuantity, 24);
    assert.equal(result.normalizedUnit, "LITER");
    assert.equal(result.isBaseUnitNormalized, true);
  });

  it("falls back to raw quantity when baseQuantity is null", () => {
    const rawLine: ReceiptLinePriceInput = {
      receiptLineId: "l-2",
      receiptDate: "2026-10-01",
      supplierId: "s-1",
      supplierName: "Toko B",
      quantity: 4,
      unit: "kaleng",
      unitPrice: 25000,
      lineTotal: 100000,
      baseQuantity: null,
      baseUnit: null,
    };

    const result = calculateNormalizedUnitPrice(rawLine, "KG");
    assert.ok(result);
    assert.equal(result.unitPrice, 25000);
    assert.equal(result.normalizedQuantity, 4);
    assert.equal(result.normalizedUnit, "kaleng");
    assert.equal(result.isBaseUnitNormalized, false);
  });

  it("calculates EMA and variance against Previous_EMA_Unit_Price before blending", () => {
    // Purchase 1: 100,000 -> EMA = 100,000, variance = 0%
    // Purchase 2: 112,000 -> Variance against 100,000 = +12% (CRITICAL), New EMA = 112,000*0.25 + 100,000*0.75 = 103,000
    const lines: ReceiptLinePriceInput[] = [
      {
        receiptLineId: "1",
        receiptDate: "2026-09-01",
        supplierId: "s-1",
        supplierName: "Supplier A",
        quantity: 1,
        unit: "kg",
        unitPrice: 100000,
        lineTotal: 100000,
        baseQuantity: 1,
        baseUnit: "KG",
      },
      {
        receiptLineId: "2",
        receiptDate: "2026-10-01",
        supplierId: "s-1",
        supplierName: "Supplier A",
        quantity: 1,
        unit: "kg",
        unitPrice: 112000,
        lineTotal: 112000,
        baseQuantity: 1,
        baseUnit: "KG",
      },
    ];

    const series = buildPriceSeries(lines, "KG", {
      alpha: 0.25,
      warningThresholdPercent: 5,
      criticalThresholdPercent: 10,
    });

    assert.equal(series.length, 2);
    assert.equal(series[0].emaUnitPrice, 100000);
    assert.equal(series[0].variancePercent, 0);

    assert.equal(series[1].previousEmaUnitPrice, 100000);
    assert.equal(series[1].variancePercent, 12);
    assert.equal(series[1].emaUnitPrice, 103000);
    assert.equal(series[1].alertLevel, "CRITICAL");
  });

  it("recommends the cheapest alternative supplier when a supplier spikes", () => {
    const record: ItemPriceHistoryRecord = {
      itemId: "item-1",
      name: "Kopi Arabika",
      baseUnit: "KG",
      lines: [
        {
          receiptLineId: "1",
          receiptDate: "2026-09-01",
          supplierId: "sup-cheap",
          supplierName: "Koperasi Gayo",
          quantity: 5,
          unit: "kg",
          unitPrice: 135000,
          lineTotal: 675000,
          baseQuantity: 5,
          baseUnit: "KG",
        },
        {
          receiptLineId: "2",
          receiptDate: "2026-10-01",
          supplierId: "sup-expensive",
          supplierName: "Roastery Kota",
          quantity: 5,
          unit: "kg",
          unitPrice: 150000,
          lineTotal: 750000,
          baseQuantity: 5,
          baseUnit: "KG",
        },
      ],
    };

    const detail = calculateItemPriceDetail(record, {
      warningThresholdPercent: 5,
    });

    assert.equal(detail.alertLevel, "CRITICAL"); // +11.1% over 135,000
    assert.ok(detail.cheapestAlternative);
    assert.equal(
      detail.cheapestAlternative.recommendedSupplierName,
      "Koperasi Gayo",
    );
    assert.equal(detail.cheapestAlternative.recommendedLatestUnitPrice, 135000);
    assert.equal(detail.cheapestAlternative.savingsPerUnit, 15000);
  });

  it("classifies alert levels accurately", () => {
    assert.equal(classifyPriceAlertLevel(10, 5, 10), "CRITICAL");
    assert.equal(classifyPriceAlertLevel(6.5, 5, 10), "WARNING");
    assert.equal(classifyPriceAlertLevel(2.1, 5, 10), "NORMAL");
    assert.equal(classifyPriceAlertLevel(-6.0, 5, 10), "PRICE_DROP");
    assert.equal(calculateNextEmaUnitPrice(120, 100, 0.25), 105);
    assert.equal(calculatePriceVariancePercent(108, 100), 8);
  });
});

