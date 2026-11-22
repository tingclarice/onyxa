import { listActiveReceiptCatalog } from "../repository/receipt-catalog-repository";

export async function getReceiptCatalog(businessId: string) {
  return listActiveReceiptCatalog(businessId);
}
