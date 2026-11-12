import type {
  ItemPriceDetail,
  ItemPriceSummary,
} from "../types/pricing";
import {
  calculateItemPriceDetail,
  calculateItemPriceSummary,
  compareByPriceVarianceUrgency,
} from "../core/ppv-rules";
import {
  findItemPriceHistory,
  listItemPriceHistories,
} from "../repository/price-history-repository";

/** Owner settings that configure price variance thresholds. */
export interface PricingSettings {
  /** From Pengaturan: % increase over EMA baseline that triggers a WARNING alert. */
  warningThresholdPercent: number;
}

/** Every item of the business with its EMA baseline and variance summary, highest spikes first. */
export async function getItemPriceSummaries(
  businessId: string,
  settings: PricingSettings,
): Promise<ItemPriceSummary[]> {
  const histories = await listItemPriceHistories(businessId);
  const summaries = histories.map((history) =>
    calculateItemPriceSummary(history, {
      warningThresholdPercent: settings.warningThresholdPercent,
    }),
  );
  return summaries.sort(compareByPriceVarianceUrgency);
}

/** Only items with CRITICAL or WARNING price variance alerts (for the home-screen alert card). */
export async function getPriceSpikeItems(
  businessId: string,
  settings: PricingSettings,
): Promise<ItemPriceSummary[]> {
  const summaries = await getItemPriceSummaries(businessId, settings);
  return summaries.filter(
    (item) => item.alertLevel === "CRITICAL" || item.alertLevel === "WARNING",
  );
}

/** Full pricing detail for a single item (EMA series, variance, and supplier comparison). */
export async function getItemPriceDetail(
  businessId: string,
  itemId: string,
  settings: PricingSettings,
): Promise<ItemPriceDetail | null> {
  const history = await findItemPriceHistory(businessId, itemId);
  if (!history) return null;

  return calculateItemPriceDetail(history, {
    warningThresholdPercent: settings.warningThresholdPercent,
  });
}

