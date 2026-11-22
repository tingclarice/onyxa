import { runInPostgresTransaction } from "@/lib/database-transaction";
import { buildMonthlyDashboard, businessDate, checkSettlementDate } from "../core/finance-rules";
import { findFinanceMembership, listPeriodPurchases, listPeriodSettlements, listSettlementHistory, recordSettlement } from "../repository/finance-repository";
import { SettlementError, settlementSchema, type SettlementInput } from "../types/finance";

export async function saveIncomeSettlement(businessId: string, userId: string, input: SettlementInput, now = new Date()) {
  const entry = settlementSchema.parse(input);
  checkSettlementDate(entry.date, businessDate(now));
  await runInPostgresTransaction(async (db) => {
    const member = await findFinanceMembership(businessId, userId, db);
    if (!member) throw new SettlementError("Akses ke usaha ini sudah berakhir.");
    if (!await recordSettlement(businessId, member.id, entry, db)) throw new SettlementError("Setoran ini sudah diproses. Muat ulang riwayat.");
  });
}

export async function getIncomeHistory(businessId: string, userId: string, page: number, now = new Date()) {
  if (!await findFinanceMembership(businessId, userId)) throw new SettlementError("Akses ke usaha ini sudah berakhir.");
  const size = 30;
  const rows = await listSettlementHistory(businessId, page, size);
  return { entries: rows.slice(0, size), hasNext: rows.length > size, today: businessDate(now) };
}

export async function getMonthlyDashboard(businessId: string, userId: string, now = new Date()) {
  const member = await findFinanceMembership(businessId, userId);
  if (member?.role !== "OWNER") throw new SettlementError("Beranda hanya tersedia untuk Owner.");
  const last = businessDate(now);
  const first = last.slice(0, 7) + "-01";
  const [settlements, purchases] = await Promise.all([
    listPeriodSettlements(businessId, first, last), listPeriodPurchases(businessId, first, last),
  ]);
  return buildMonthlyDashboard(last, settlements, purchases);
}
