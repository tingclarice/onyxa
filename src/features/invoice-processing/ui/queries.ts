import "server-only";

import { requireActiveBusiness } from "@/features/business-management/server";
import { getBusinessTransaction, getBusinessTransactions } from "../services/transaction-service";

import { getScanDraft, getScanDrafts } from "../services/receipt-draft-service";

export async function getMyScanDrafts() {
  const { membership } = await requireActiveBusiness();
  const drafts = await getScanDrafts({ businessId: membership.businessId, memberId: membership.id });
  return { memberId: membership.id, drafts };
}

export async function getMyScanDraft(id: string) {
  const { membership } = await requireActiveBusiness();
  return getScanDraft({ businessId: membership.businessId, memberId: membership.id }, id);
}

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
