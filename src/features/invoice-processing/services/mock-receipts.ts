import {
  ScanReceiptSchema,
  type ScanReceipt,
} from "@/features/invoice-processing/types/scan";

const receipts: ScanReceipt[] = [
  {
    supplier_name: "Pasar Segar Bu Rina",
    date: "2026-11-05",
    items: [
      {
        raw_name: "Telur ayam",
        qty: 2,
        unit: "kg",
        unit_price: 28000,
        line_total: 56000,
        confidence: 0.98,
        matched_item: "Telur ayam",
      },
      {
        raw_name: "Ayam potong",
        qty: 3,
        unit: "kg",
        unit_price: 38000,
        line_total: 114000,
        confidence: 0.96,
        matched_item: "Ayam potong",
      },
      {
        raw_name: "Minyak goreng",
        qty: 2,
        unit: "liter",
        unit_price: 18500,
        line_total: 37000,
        confidence: 0.97,
        matched_item: "Minyak goreng",
      },
    ],
    total: 207000,
    overall_confidence: 0.97,
  },
  {
    supplier_name: "Berkah Frozen Food",
    date: "2026-11-04",
    items: [
      {
        raw_name: "Ayam fillet 5k",
        qty: 5,
        unit: "kg",
        unit_price: 42000,
        line_total: 210000,
        confidence: 0.72,
        matched_item: "Ayam fillet",
      },
      {
        raw_name: "Sosis sapi isi 10",
        qty: 3,
        unit: "pack",
        unit_price: 32000,
        line_total: 96000,
        confidence: 0.64,
        matched_item: "Sosis sapi",
      },
      {
        raw_name: "Nugget ayam 500 gr",
        qty: 2,
        unit: "pack",
        unit_price: 45000,
        line_total: 90000,
        confidence: 0.76,
        matched_item: "Nugget ayam",
      },
      {
        raw_name: "Telur 1 krat",
        qty: 1,
        unit: "krat",
        unit_price: 30000,
        line_total: 30000,
        confidence: 0.91,
        matched_item: "Telur ayam",
      },
    ],
    total: 426000,
    overall_confidence: 0.73,
  },
  {
    supplier_name: "Toko Grosir Jaya",
    date: "2026-11-03",
    items: [
      {
        raw_name: "Gula pasir",
        qty: 10,
        unit: "kg",
        unit_price: 17000,
        line_total: 170000,
        confidence: 0.95,
        matched_item: "Gula pasir",
      },
      {
        raw_name: "Kopi bubuk",
        qty: 4,
        unit: "pack",
        unit_price: 28000,
        line_total: 112000,
        confidence: 0.94,
        matched_item: "Kopi bubuk",
      },
      {
        raw_name: "Tepung terigu",
        qty: 5,
        unit: "kg",
        unit_price: 13000,
        line_total: 65000,
        confidence: 0.96,
        matched_item: "Tepung terigu",
      },
    ],
    total: 350000,
    overall_confidence: 0.94,
  },
].map((receipt) => ScanReceiptSchema.parse(receipt));

export async function getMockReceipt(): Promise<ScanReceipt> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const receipt = receipts[Math.floor(Math.random() * receipts.length)];
  if (!receipt) {
    throw new Error("Contoh struk tidak tersedia.");
  }

  return ScanReceiptSchema.parse(receipt);
}
