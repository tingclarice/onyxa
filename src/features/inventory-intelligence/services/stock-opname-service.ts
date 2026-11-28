import {
  StockOpnameError,
  type CreateStockOpnameInput,
  type OpnameAuditResult,
  type StockSnapshotRecord,
} from "../types/inventory";
import {
  calculateOpnameAudit,
  sortSnapshotsChronologically,
} from "../core/speedflow-rules";
import { findItemPurchaseHistory } from "../repository/purchase-history-repository";
import {
  activeItemExists,
  createStandaloneStockSnapshot,
  listStockSnapshotsForItem,
} from "../repository/stock-snapshot-repository";

export interface StockOpnameActor {
  businessId: string;
  memberId: string;
}

/**
 * Records a standalone physical shelf count (Stock Opname) for an item.
 * Creates an anchor snapshot with countedQty = postEventStock = input.countedQty,
 * and returns the resulting anchor-to-anchor audit if a prior anchor exists.
 */
export async function recordStandaloneStockOpname(
  actor: StockOpnameActor,
  input: CreateStockOpnameInput,
): Promise<{ snapshot: StockSnapshotRecord; audit: OpnameAuditResult | null }> {
  const exists = await activeItemExists(actor.businessId, input.itemId);
  if (!exists) {
    throw new StockOpnameError("Barang tidak ditemukan di katalog usaha aktif.");
  }

  const recordedAt = new Date(`${input.recordedAt}T00:00:00.000Z`);
  const snapshot = await createStandaloneStockSnapshot({
    businessId: actor.businessId,
    itemId: input.itemId,
    recordedByMemberId: actor.memberId,
    countedQty: input.countedQty,
    recordedAt,
  });

  const [snapshots, history] = await Promise.all([
    listStockSnapshotsForItem(actor.businessId, input.itemId),
    findItemPurchaseHistory(actor.businessId, input.itemId),
  ]);

  const sorted = sortSnapshotsChronologically(snapshots);
  const index = sorted.findIndex((entry) => entry.id === snapshot.id);
  const previous = index > 0 ? sorted[index - 1] : null;
  const audit =
    previous !== null
      ? calculateOpnameAudit(previous, snapshot, history?.restocks ?? [])
      : null;

  return { snapshot, audit };
}
