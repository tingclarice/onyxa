import { formatDate } from "@/lib/utils/format";
import type { ItemMovementDetail } from "../types/inventory";
import { MovementBadge } from "./movement-badge";
import { formatDays, formatPerDay } from "./movement-format";

/** Item page: the burn-rate numbers behind the badge, in plain words. */
export function MovementExplanation({ item }: { item: ItemMovementDetail }) {
  const status = item.status;

  return (
    <section
      aria-labelledby="movement-title"
      className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="movement-title" className="text-lg font-semibold">
          Kecepatan habis
        </h2>
        <MovementBadge status={status} />
      </div>

      {status.kind === "not_enough_data" ? (
        <p className="text-base leading-7 text-muted-foreground">
          Barang ini baru tercatat di {status.purchaseDays} tanggal pembelian.
          Setelah 3 tanggal pembelian berbeda, Onyxa bisa menghitung berapa
          cepat barang ini habis.
        </p>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Biasanya terpakai" value={formatPerDay(status.usualBurnRatePerDay, item.baseUnit)} />
          <Fact
            label="Pembelian terakhir cukup untuk"
            value={`±${formatDays(status.expectedDaysToRunOut)} (habis ${formatDate(status.expectedRunOutDate)})`}
          />
          <Fact label="Sejak pembelian terakhir" value={formatDays(status.daysSinceLastPurchase)} />
          {status.kind === "slowing" ? (
            <>
              <Fact
                label="Kecepatan habis turun"
                value={`${status.burnRateDropPercent}% (sekarang maks. ${formatPerDay(status.currentBurnRatePerDay, item.baseUnit)})`}
                highlight
              />
              <Fact
                label="Restock terlambat"
                value={formatDays(status.restockDelayDays)}
                highlight
              />
            </>
          ) : (
            <Fact label="Status" value="Masih sesuai perkiraan" />
          )}
        </dl>
      )}
    </section>
  );
}

function Fact({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`text-base font-semibold tabular-nums ${highlight ? "text-amber-800 dark:text-amber-200" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
