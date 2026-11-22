import { runInPostgresTransaction } from "@/lib/database-transaction";
import { buildPeriodDashboard, businessDate, checkSettlementDate } from "../core/finance-rules";
import { resolveDashboardPeriod } from "../core/dashboard-period";
import { findFinanceMembership, listPeriodPurchases, listPeriodSettlements, listSettlementHistory, recordSettlement } from "../repository/finance-repository";
import { SettlementError, settlementSchema, type DashboardFilter, type SettlementInput } from "../types/finance";

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

export async function getDashboardReport(businessId: string, userId: string, filter: DashboardFilter = {}, now = new Date()) {
  const member = await findFinanceMembership(businessId, userId);
  if (member?.role !== "OWNER") throw new SettlementError("Beranda hanya tersedia untuk Owner.");
  const { period, error } = resolveDashboardPeriod(filter, businessDate(now));
  if (error) return { period, error, data: null };
  const [settlements, purchases] = await Promise.all([
    listPeriodSettlements(businessId, period.start, period.end),
    listPeriodPurchases(businessId, period.start, period.end),
  ]);
  return { period, error: null, data: buildPeriodDashboard(period, settlements, purchases) };
}
