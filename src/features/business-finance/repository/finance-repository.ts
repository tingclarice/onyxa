import "server-only";
import { getPostgres } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type { HistoryEntry, Purchase, SettlementInput } from "../types/finance";

export async function findFinanceMembership(businessId: string, userId: string, db: DatabaseClient = getPostgres()) {
  return db.businessMember.findFirst({
    where: { businessId, userId, removedAt: null }, select: { id: true, role: true },
  });
}

export async function recordSettlement(businessId: string, memberId: string, input: SettlementInput, db: DatabaseClient = getPostgres()) {
  // Repeating the same submission retains the first entry.
  const result = await db.incomeSettlement.createMany({
    data: [{ ...input, date: new Date(input.date), businessId, memberId }], skipDuplicates: true,
  });
  if (result.count) return true;
  const previous = await db.incomeSettlement.findFirst({
    where: { id: input.id, businessId, memberId, date: new Date(input.date), cash: input.cash, qris: input.qris },
    select: { id: true },
  });
  return Boolean(previous);
}

export async function listSettlementHistory(businessId: string, page: number, size: number, db: DatabaseClient = getPostgres()): Promise<HistoryEntry[]> {
  const rows = await db.incomeSettlement.findMany({
    where: { businessId }, skip: (page - 1) * size, take: size + 1,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: { id: true, date: true, cash: true, qris: true, member: { select: { user: { select: { name: true } } } } },
  });
  return rows.map((row) => ({ id: row.id, date: row.date.toISOString().slice(0, 10),
    cash: Number(row.cash), qris: Number(row.qris), member: row.member.user.name }));
}

export async function listPeriodSettlements(businessId: string, first: string, last: string, db: DatabaseClient = getPostgres()) {
  const rows = await db.incomeSettlement.findMany({
    where: { businessId, date: { gte: new Date(first), lte: new Date(last) } },
    select: { date: true, cash: true, qris: true },
  });
  return rows.map((row) => ({ date: row.date.toISOString().slice(0, 10), cash: Number(row.cash), qris: Number(row.qris) }));
}

export async function listPeriodPurchases(businessId: string, first: string, last: string, db: DatabaseClient = getPostgres()): Promise<Purchase[]> {
  const rows = await db.receipt.findMany({
    where: { businessId, status: "SAVED", receiptDate: { gte: new Date(first), lte: new Date(last) } },
    select: { receiptDate: true, total: true, lines: {
      orderBy: { position: "asc" }, select: { itemId: true, rawName: true, unit: true, quantity: true,
        baseQuantity: true, baseUnit: true, lineTotal: true, item: { select: { name: true, category: true } } },
    } },
  });
  return rows.map((row) => ({
    date: row.receiptDate.toISOString().slice(0, 10), total: Number(row.total),
    lines: row.lines.map((line) => ({
      itemId: line.itemId, name: line.item?.name ?? line.rawName, category: line.item?.category ?? null,
      quantity: Number(line.baseQuantity ?? line.quantity),
      unit: (line.baseQuantity !== null && line.baseUnit ? line.baseUnit : line.unit).trim().toLowerCase(), amount: Number(line.lineTotal),
    })),
  }));
}
