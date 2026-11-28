import {
  findTransactionForBusiness,
  listReceiptsForBusiness,
  markReceiptPaidForBusiness,
} from "../repository/receipt-transaction-repository";
import { TransactionError } from "../types/transactions";

export async function getBusinessTransactions(businessId: string) {
  return listReceiptsForBusiness(businessId);
}

export async function getBusinessTransaction(businessId: string, id: string) {
  return findTransactionForBusiness(businessId, id);
}

export async function payBusinessTransaction(
  businessId: string,
  id: string,
  now: Date = new Date(),
) {
  const outcome = await markReceiptPaidForBusiness(businessId, id, now);
  if (outcome === "not-found") {
    throw new TransactionError("Nota tidak ditemukan.");
  }
}
