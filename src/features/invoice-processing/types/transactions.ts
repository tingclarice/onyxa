export type TransactionStatus = "needs-check" | "saved";

export interface ReceiptTransaction {
  id: string;
  supplierName: string;
  date: string;
  status: TransactionStatus;
  total: number;
}
