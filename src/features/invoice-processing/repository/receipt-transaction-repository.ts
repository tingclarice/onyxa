import "server-only";

import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type { ReceiptTransaction } from "../types/transactions";

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
