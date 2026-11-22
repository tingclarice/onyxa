import "server-only";
import { requireActiveBusiness, requireBusinessOwner } from "@/features/business-management/server";
import { getIncomeHistory, getMonthlyDashboard } from "../services/finance-service";

export async function getDashboard() {
  const { actor, membership } = await requireBusinessOwner();
  return getMonthlyDashboard(membership.businessId, actor.id);
}

export async function getSettlementHistory(page: number) {
  const { actor, membership } = await requireActiveBusiness();
  return getIncomeHistory(membership.businessId, actor.id, page);
}
