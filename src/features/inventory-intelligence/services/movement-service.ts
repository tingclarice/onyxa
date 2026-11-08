import type {
  ItemMovement,
  ItemMovementDetail,
  ItemPurchaseHistory,
} from "../types/inventory";
import {
  calculateItemMovement,
  combineSameDayPurchases,
  compareByUrgency,
  toLocalDateKey,
} from "../core/burn-rate-rules";
import {
  findItemPurchaseHistory,
  listItemPurchaseHistories,
} from "../repository/purchase-history-repository";

/** Owner settings that change how items are judged. */
export interface MovementSettings {
  /** From Pengaturan: grace % before an item counts as slowing. */
  gracePercent: number;
}

/** Every item of the business with its movement status, slowing items first. */
export async function getItemMovements(
  businessId: string,
  settings: MovementSettings,
  now: Date = new Date(),
): Promise<ItemMovement[]> {
  const histories = await listItemPurchaseHistories(businessId);
  const today = toLocalDateKey(now);

  const movements = histories.map((history) =>
    toItemMovement(history, today, settings.gracePercent),
  );
  return movements.sort(compareByUrgency);
}

/** Only the items that are slowing down (for the home-screen warning card). */
export async function getSlowingItems(
  businessId: string,
  settings: MovementSettings,
  now: Date = new Date(),
): Promise<ItemMovement[]> {
  const movements = await getItemMovements(businessId, settings, now);
  return movements.filter((movement) => movement.status.kind === "slowing");
}

/** One item with its movement and purchase days (for the item page). Null if not found. */
export async function getItemMovementDetail(
  businessId: string,
  itemId: string,
  settings: MovementSettings,
  now: Date = new Date(),
): Promise<ItemMovementDetail | null> {
  const history = await findItemPurchaseHistory(businessId, itemId);
  if (!history) return null;

  const movement = toItemMovement(history, toLocalDateKey(now), settings.gracePercent);
  const purchases = combineSameDayPurchases(history.purchases).reverse();
  return { ...movement, purchases };
}

function toItemMovement(
  history: ItemPurchaseHistory,
  today: string,
  gracePercent: number,
): ItemMovement {
  return {
    itemId: history.itemId,
    name: history.name,
    baseUnit: history.baseUnit,
    lastPurchase: history.lastPurchase,
    status: calculateItemMovement(history, today, gracePercent),
  };
}
