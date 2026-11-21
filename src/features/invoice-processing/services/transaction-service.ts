import { findTransactionForBusiness, listReceiptsForBusiness } from "../repository/receipt-transaction-repository";

export async function getBusinessTransactions(businessId: string) {
  return listReceiptsForBusiness(businessId);
}

export async function getBusinessTransaction(businessId: string, id: string) {
  return findTransactionForBusiness(businessId, id);
}
