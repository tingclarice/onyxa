export type TransactionStatus = "needs-check" | "saved";

export class TransactionError extends Error {}

export type PayTransactionResult =
  | { ok: true }
  | { ok: false; message: string };

export interface ReceiptTransaction {
  id: string;
  supplierName: string;
  date: string;
  status: TransactionStatus;
  isPaid: boolean;
  total: number;
}

export interface TransactionDetail {
  supplierName: string;
  date: string;
  discount: number;
  total: number;
  subtotal: number;
  imageUrl: string | null;
  lines: {
    position: number;
    name: string;
    printedName?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    lineTotal: number;
  }[];
}
