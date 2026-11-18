import { listReceiptsForBusiness } from "../repository/receipt-transaction-repository";

export async function getBusinessTransactions(businessId: string) {
  return listReceiptsForBusiness(businessId);
}
