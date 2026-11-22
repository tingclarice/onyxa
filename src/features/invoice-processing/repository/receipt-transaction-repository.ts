import "server-only";

import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type { ReceiptTransaction, TransactionDetail } from "../types/transactions";

const BATCH_SIZE = 100;

export async function listReceiptsForBusiness(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<ReceiptTransaction[]> {
  const receipts: ReceiptTransaction[] = [];

  for (let skip = 0; ; skip += BATCH_SIZE) {
    const rows = await db.receipt.findMany({
      where: { businessId },
      orderBy: [{ receiptDate: "desc" }, { id: "desc" }],
      skip,
      take: BATCH_SIZE,
      select: { id: true, receiptDate: true, supplierName: true, status: true, total: true },
    });

    for (const row of rows) {
      receipts.push({
        id: row.id,
        date: row.receiptDate.toISOString().slice(0, 10),
        supplierName: row.supplierName,
        status: row.status === "SAVED" ? "saved" : "needs-check",
        total: row.total.toNumber(),
      });
    }
    if (rows.length < BATCH_SIZE) return receipts;
  }
}

export async function findTransactionForBusiness(
  businessId: string,
  id: string,
  db: DatabaseClient = getPrisma(),
): Promise<TransactionDetail | null> {
  const row = await db.receipt.findUnique({
    where: { businessId_id: { businessId, id } },
    select: {
      supplierName: true, receiptDate: true, discount: true, total: true, imageUrl: true,
    },
  });
  if (!row) return null;
  const lines: TransactionDetail["lines"] = [];
  for (let skip = 0; ; skip += BATCH_SIZE) {
    const batch = await db.receiptLine.findMany({
      where: { businessId, receiptId: id },
      orderBy: { position: "asc" },
      skip,
      take: BATCH_SIZE,
      select: {
        position: true, rawName: true, item: { select: { name: true } }, quantity: true, unit: true,
        unitPrice: true, discount: true, lineTotal: true,
      },
    });
    for (const line of batch) {
      lines.push({
        position: line.position,
        name: line.item?.name ?? line.rawName,
        printedName: line.rawName,
        quantity: line.quantity.toNumber(),
        unit: line.unit,
        unitPrice: line.unitPrice.toNumber(),
        discount: Number(line.discount),
        lineTotal: line.lineTotal.toNumber(),
      });
    }
    if (batch.length < BATCH_SIZE) break;
  }
  return {
    supplierName: row.supplierName,
    date: row.receiptDate.toISOString().slice(0, 10),
    discount: Number(row.discount),
    total: row.total.toNumber(),
    subtotal: lines.reduce((sum, line) => sum + Math.round(line.lineTotal * 100), 0) / 100,
    imageUrl: row.imageUrl,
    lines,
  };
}
