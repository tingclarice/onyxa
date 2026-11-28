import type {
  ItemMovement,
  ItemMovementDetail,
  ItemPurchaseHistory,
  RestockEvent,
  StockSnapshotRecord,
} from "../types/inventory";
import {
  calculateItemMovement,
  combineSameDayPurchases,
  compareByUrgency,
  toLocalDateKey,
} from "../core/burn-rate-rules";
import {
  calculateLiveSpeedflow,
  calculateOpnameAuditHistory,
  sortSnapshotsChronologically,
} from "../core/speedflow-rules";
import {
  archiveItem,
  findItemPurchaseHistory,
  listItemPurchaseHistories,
} from "../repository/purchase-history-repository";
import {
  listStockSnapshotsForBusiness,
  listStockSnapshotsForItem,
} from "../repository/stock-snapshot-repository";

/** Owner settings that change how items are judged. */
export interface MovementSettings {
  /** From Pengaturan: grace % before an item counts as slowing. */
  gracePercent: number;
}

/** Archives (deletes from active catalog) one item of the business. */
export async function deleteCatalogItem(
  businessId: string,
  itemId: string,
  now: Date = new Date(),
): Promise<boolean> {
  return archiveItem(businessId, itemId, now);
}

/** Every item of the business with its movement status and speedflow, slowing items first. */
export async function getItemMovements(
  businessId: string,
  settings: MovementSettings,
  now: Date = new Date(),
): Promise<ItemMovement[]> {
  const [histories, allSnapshots] = await Promise.all([
    listItemPurchaseHistories(businessId),
    listStockSnapshotsForBusiness(businessId),
  ]);
  const snapshotsByItem = new Map<string, StockSnapshotRecord[]>();
  for (const snapshot of allSnapshots) {
    const list = snapshotsByItem.get(snapshot.itemId) ?? [];
    list.push(snapshot);
    snapshotsByItem.set(snapshot.itemId, list);
  }
  const today = toLocalDateKey(now);

  const movements = histories.map((history) =>
    toItemMovement(
      history,
      snapshotsByItem.get(history.itemId) ?? [],
      today,
      settings.gracePercent,
      now,
    ),
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

/** One item with its movement, speedflow, opname history and audits (for the item page). Null if not found. */
export async function getItemMovementDetail(
  businessId: string,
  itemId: string,
  settings: MovementSettings,
  now: Date = new Date(),
): Promise<ItemMovementDetail | null> {
  const [history, snapshots] = await Promise.all([
    findItemPurchaseHistory(businessId, itemId),
    listStockSnapshotsForItem(businessId, itemId),
  ]);
  if (!history) return null;

  const restocks = resolveRestockEvents(history);
  const movement = toItemMovement(
    history,
    snapshots,
    toLocalDateKey(now),
    settings.gracePercent,
    now,
  );
  const purchases = combineSameDayPurchases(history.purchases).reverse();
  const sortedSnapshots = sortSnapshotsChronologically(snapshots);
  const audits = calculateOpnameAuditHistory(sortedSnapshots, restocks);
  return {
    ...movement,
    purchases,
    snapshots: [...sortedSnapshots].reverse(),
    audits,
  };
}

function resolveRestockEvents(history: ItemPurchaseHistory): RestockEvent[] {
  if (history.restocks) return history.restocks;
  return history.purchases.map((purchase, index) => ({
    receiptLineId: `legacy-${history.itemId}-${index}`,
    date: purchase.date,
    recordedAt: `${purchase.date}T00:00:00.000Z`,
    quantity: purchase.quantity,
    lineTotal: 0,
    createdAt: `${purchase.date}T00:00:00.000Z`,
  }));
}

function toItemMovement(
  history: ItemPurchaseHistory,
  snapshots: StockSnapshotRecord[],
  today: string,
  gracePercent: number,
  now: Date,
): ItemMovement {
  const restocks = resolveRestockEvents(history);
  return {
    itemId: history.itemId,
    name: history.name,
    category: history.category,
    baseUnit: history.baseUnit,
    lastPurchase: history.lastPurchase,
    status: calculateItemMovement(history, today, gracePercent),
    speedflow: calculateLiveSpeedflow(restocks, snapshots, now),
  };
}
