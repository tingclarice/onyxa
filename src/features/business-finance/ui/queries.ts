import "server-only";
import { requireActiveBusiness, requireBusinessOwner } from "@/features/business-management/server";
import { getIncomeHistory, getDashboardReport } from "../services/finance-service";
import type { DashboardFilter } from "../types/finance";

export async function getDashboard(filter: DashboardFilter = {}) {
  const { actor, membership } = await requireBusinessOwner();
  return getDashboardReport(membership.businessId, actor.id, filter);
}

export async function getSettlementHistory(page: number) {
  const { actor, membership } = await requireActiveBusiness();
  return getIncomeHistory(membership.businessId, actor.id, page);
}
