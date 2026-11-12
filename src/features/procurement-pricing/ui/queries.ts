import "server-only";
import { requireActiveBusiness } from "@/features/business-management/server";
import type {
  ItemPriceDetail,
  ItemPriceSummary,
  PriceFluctuationAlerts,
} from "../types/pricing";
import {
  getItemPriceDetail,
  getItemPriceSummaries,
  getPriceSpikeItems,
} from "../services/pricing-service";

// Reads for app/ pages. The business and its price alert threshold come from the trusted session.

/** All items of the active business with their EMA baseline & variance summary (for /barang). */
export async function getActiveBusinessItemPrices(): Promise<ItemPriceSummary[]> {
  const { membership } = await requireActiveBusiness();
  return getItemPriceSummaries(membership.businessId, {
    warningThresholdPercent:
      membership.business.priceIncreaseThresholdPercent,
  });
}

/** One item's full pricing detail (series + supplier comparison) for /barang/[id]. */
export async function getActiveBusinessItemPriceDetail(
  itemId: string,
): Promise<ItemPriceDetail | null> {
  const { membership } = await requireActiveBusiness();
  return getItemPriceDetail(membership.businessId, itemId, {
    warningThresholdPercent:
      membership.business.priceIncreaseThresholdPercent,
  });
}

/** Price spike alerts for the home-screen warning card (/beranda), respecting the business toggle. */
export async function getActiveBusinessPriceFluctuationAlerts(): Promise<PriceFluctuationAlerts> {
  const { membership } = await requireActiveBusiness();
  const business = membership.business;

  if (!business.priceIncreaseAlertsEnabled) {
    return {
      enabled: false,
      thresholdPercent: business.priceIncreaseThresholdPercent,
      alertItems: [],
    };
  }

  const alertItems = await getPriceSpikeItems(business.id, {
    warningThresholdPercent: business.priceIncreaseThresholdPercent,
  });

  return {
    enabled: true,
    thresholdPercent: business.priceIncreaseThresholdPercent,
    alertItems,
  };
}

