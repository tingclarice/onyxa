import "server-only";

import { requireActiveBusiness } from "@/features/business-management/server";
import { getBusinessTransaction, getBusinessTransactions } from "../services/transaction-service";

export async function getActiveBusinessTransaction(id: string) {
  const { membership } = await requireActiveBusiness();
  return getBusinessTransaction(membership.businessId, id);
}

export async function getActiveBusinessTransactions() {
  const { membership } = await requireActiveBusiness();
  try {
    return await getBusinessTransactions(membership.businessId);
  } catch {
    console.error("[receipt] transactions could not be loaded");
    return null;
  }
}
