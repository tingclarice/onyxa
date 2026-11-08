import { formatDate } from "@/lib/utils/format";
import type { BaseUnit, ItemPurchase } from "../types/inventory";
import { formatQuantity, unitLabel } from "./movement-format";

/** Item page: the purchases the burn rate is calculated from, newest first. */
export function PurchaseHistoryList({
  purchases,
  baseUnit,
}: {
  purchases: ItemPurchase[];
  baseUnit: BaseUnit;
}) {
  return (
    <section
      aria-labelledby="purchases-title"
      className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
    >
      <h2 id="purchases-title" className="text-lg font-semibold">
        Riwayat pembelian
      </h2>
      {purchases.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Belum ada pembelian dalam satuan {unitLabel(baseUnit)}.
        </p>
      ) : (
        <ul className="divide-y">
          {purchases.map((purchase) => (
            <li
              key={purchase.date}
              className="flex min-h-12 items-center justify-between gap-4 py-2 text-base"
            >
              <span>{formatDate(purchase.date)}</span>
              <span className="font-medium tabular-nums">
                {formatQuantity(purchase.quantity, baseUnit)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
