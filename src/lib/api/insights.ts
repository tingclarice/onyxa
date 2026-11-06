export type InsightType =
  | "price-increase"
  | "slow-moving"
  | "needs-review";

export type InsightSeverity = "warning" | "attention";

export type Insight = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  explanation: string;
};

const mockInsights: Insight[] = [
  {
    id: "insight-sugar-price",
    type: "price-increase",
    severity: "warning",
    title: "Gula naik 8% dari bulan lalu",
    explanation:
      "Harga gula dari Toko Grosir Jaya naik dibanding pembelian sebelumnya.",
  },
  {
    id: "insight-flour-slow",
    type: "slow-moving",
    severity: "warning",
    title: "Tepung belum dibeli 75 hari",
    explanation:
      "Sudah cukup lama tepung tidak muncul di nota belanja usaha.",
  },
  {
    id: "insight-duplicate-receipt",
    type: "needs-review",
    severity: "attention",
    title: "Nota mirip sudah pernah diunggah",
    explanation:
      "Tanggal, pemasok, dan jumlahnya mirip dengan nota yang sudah tersimpan.",
  },
];

export async function getInsights(): Promise<Insight[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockInsights.map((insight) => ({ ...insight }));
}
