import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPostgres } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import { ScanReceiptSchema, ReceiptDraftError, type DraftOwner, type ScanReceipt } from "../types/scan";

const draftFields = { id: true, imageUrl: true, extraction: true } as const;

function toDraft(row: { id: string; imageUrl: string; extraction: Prisma.JsonValue }) {
  return { draftId: row.id, imageUrl: row.imageUrl, receipt: ScanReceiptSchema.parse(row.extraction) };
}

export async function findOwnedDraft(owner: DraftOwner, id: string, db: DatabaseClient = getPostgres()) {
  const row = await db.receiptDraft.findFirst({ where: { ...owner, id }, select: draftFields });
  return row ? toDraft(row) : null;
}

export async function findDraftBySource(owner: DraftOwner, sourceKey: string, db: DatabaseClient = getPostgres()) {
  const row = await db.receiptDraft.findUnique({
    where: { businessId_memberId_sourceKey: { ...owner, sourceKey } }, select: draftFields,
  });
  return row ? toDraft(row) : null;
}

export async function listOwnedDrafts(owner: DraftOwner, db: DatabaseClient = getPostgres()) {
  return db.receiptDraft.findMany({
    where: owner, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, imageUrl: true, name: true },
  });
}

export async function storeExtractedDraft(owner: DraftOwner,
  data: { sourceKey: string; name: string; extraction: ScanReceipt; imageUrl: string },
  replace: { id: string; previousImageUrl: string } | undefined,
  db: DatabaseClient = getPostgres()) {
  if (replace) {
    const changed = await db.receiptDraft.updateMany({
      where: { ...owner, id: replace.id, imageUrl: replace.previousImageUrl }, data,
    });
    if (!changed.count) throw new ReceiptDraftError("Draf sudah berubah. Muat ulang halaman review.");
    return { draftId: replace.id, imageUrl: data.imageUrl, receipt: data.extraction };
  }
  try {
    return toDraft(await db.receiptDraft.create({ data: { ...owner, ...data }, select: draftFields }));
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const existing = await findDraftBySource(owner, data.sourceKey, db);
    if (existing) return existing;
    throw error;
  }
}

export async function discardOwnedDraft(owner: DraftOwner, id: string, db: DatabaseClient = getPostgres()) {
  return db.receiptDraft.deleteMany({ where: { ...owner, id } });
}

export async function takeDraftForApproval(owner: DraftOwner, id: string, imageUrl: string, db: DatabaseClient) {
  const taken = await db.receiptDraft.deleteMany({ where: { ...owner, id, imageUrl } });
  return taken.count === 1;
}

export async function findPreviouslyApprovedDraft(owner: DraftOwner, id: string, db: DatabaseClient) {
  const saved = await db.receipt.findFirst({
    where: { id, businessId: owner.businessId, createdByMemberId: owner.memberId, status: "SAVED" },
    select: { lines: { select: { itemId: true } } },
  });
  if (!saved) return null;
  return { receiptId: id, itemCount: new Set(saved.lines.map((line) => line.itemId)).size };
}
