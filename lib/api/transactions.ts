export type TransactionStatus = "needs-check" | "saved";

export type Transaction = {
  id: string;
  supplier_name: string;
  date: string;
  total: number;
  status: TransactionStatus;
};

const mockTransactions: Transaction[] = [
  {
    id: "trx-001",
    supplier_name: "Pasar Segar Bu Rina",
    date: "2026-11-05",
    total: 207000,
    status: "saved",
  },
  {
    id: "trx-002",
    supplier_name: "Berkah Frozen Food",
    date: "2026-11-04",
    total: 426000,
    status: "needs-check",
  },
  {
    id: "trx-003",
    supplier_name: "Toko Grosir Jaya",
    date: "2026-11-03",
    total: 350000,
    status: "saved",
  },
  {
    id: "trx-004",
    supplier_name: "Pasar Segar Bu Rina",
    date: "2026-11-01",
    total: 183500,
    status: "saved",
  },
  {
    id: "trx-005",
    supplier_name: "Aneka Bahan Kue",
    date: "2026-10-30",
    total: 298000,
    status: "needs-check",
  },
];

export async function getTransactions(): Promise<Transaction[]> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  return mockTransactions.map((transaction) => ({ ...transaction }));
}
