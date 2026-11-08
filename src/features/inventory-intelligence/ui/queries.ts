import "server-only";
import { requireActiveBusiness } from "@/features/business-management/server";
import type {
  ItemMovement,
  ItemMovementDetail,
  SlowMovingWarnings,
} from "../types/inventory";
import {
  getItemMovementDetail,
  getItemMovements,
  getSlowingItems,
} from "../services/movement-service";

// Reads for app/ pages. The business and its grace % come from the trusted session.

/** All items of the active business with their status (for /barang). */
export async function getActiveBusinessItemMovements(): Promise<ItemMovement[]> {
  const { membership } = await requireActiveBusiness();
  return getItemMovements(membership.businessId, {
    gracePercent: membership.business.slowMovingGracePercent,
  });
}

/** One item of the active business (for /barang/[id]). Null when not found. */
export async function getActiveBusinessItemDetail(
  itemId: string,
): Promise<ItemMovementDetail | null> {
  const { membership } = await requireActiveBusiness();
  return getItemMovementDetail(membership.businessId, itemId, {
    gracePercent: membership.business.slowMovingGracePercent,
  });
}

/** Slowing items for the home-screen warning card, respecting the alert setting. */
export async function getActiveBusinessSlowMovingWarnings(): Promise<SlowMovingWarnings> {
  const { membership } = await requireActiveBusiness();
  const business = membership.business;
  if (!business.slowMovingAlertsEnabled) return { enabled: false, slowingItems: [] };

  const slowingItems = await getSlowingItems(business.id, {
    gracePercent: business.slowMovingGracePercent,
  });
  return { enabled: true, slowingItems };
}
