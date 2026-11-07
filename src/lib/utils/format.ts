const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount).replace(/\u00a0/g, "");
}

export function formatDate(date: Date | string | number): string {
  return dateFormatter.format(date instanceof Date ? date : new Date(date));
}
