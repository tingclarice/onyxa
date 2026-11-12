import Link from "next/link";
import { AlertTriangle, CircleCheck, TrendingUp } from "lucide-react";
import { formatRupiah } from "@/lib/utils/format";
import type { PriceFluctuationAlerts } from "../types/pricing";
import { formatSignedPercent } from "./price-variance-badge";

const ITEMS_SHOWN = 5;

/**
 * Home-screen card (/beranda) showing items whose latest purchase price spiked
 * above the business's EMA threshold, plus supplier substitution hints.
 */
export function PriceFluctuationAlertCard({
  alerts,
}: {
  alerts: PriceFluctuationAlerts;
}) {
  const { enabled, thresholdPercent, alertItems } = alerts;

  return (
    <section
      aria-labelledby="price-alerts-title"
      className="space-y-4 rounded-2xl border p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="price-alerts-title" className="text-lg font-semibold">
            Fluktuasi Harga Supplier (PPV)
          </h2>
          <p className="text-xs text-muted-foreground">
            Membandingkan harga beli terakhir terhadap rata-rata bergerak (EMA · batas peringatan +{thresholdPercent}%)
          </p>
        </div>
        {enabled && alertItems.length > 0 && (
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {alertItems.length} barang naik harga
          </p>
        )}
      </div>

      {!enabled ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Peringatan kenaikan harga supplier sedang dimatikan.{" "}
          <Link
            href="/pengaturan"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Ubah di Pengaturan
          </Link>
        </p>
      ) : alertItems.length === 0 ? (
        <p className="flex items-center gap-2 text-base text-green-800 dark:text-green-200">
          <CircleCheck aria-hidden="true" className="size-5" />
          Semua harga bahan baku stabil di kisaran baseline EMA
        </p>
      ) : (
        <>
          <ul className="divide-y">
            {alertItems.slice(0, ITEMS_SHOWN).map((item) => {
              const isCritical = item.alertLevel === "CRITICAL";
              const alt = item.cheapestAlternative;

              return (
                <li key={item.itemId}>
                  <Link
                    href={`/barang/${item.itemId}`}
                    className="flex min-h-14 flex-col justify-between gap-2 py-3 hover:text-accent sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        {isCritical ? (
                          <AlertTriangle
                            aria-hidden="true"
                            className="size-4 shrink-0 text-red-600 dark:text-red-400"
                          />
                        ) : (
                          <TrendingUp
                            aria-hidden="true"
                            className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
                          />
                        )}
                        <span>{item.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isCritical
                              ? "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200"
                              : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                          }`}
                        >
                          {formatSignedPercent(item.latestVariancePercent)}
                        </span>
                      </div>
                      {alt && (
                        <p className="text-xs text-muted-foreground">
                          Rekomendasi substitusi:{" "}
                          <span className="font-medium text-foreground">
                            {alt.recommendedSupplierName}
                          </span>{" "}
                          ({formatRupiah(alt.recommendedLatestUnitPrice)}/
                          {alt.normalizedUnit.toLowerCase()} · hemat{" "}
                          {formatRupiah(alt.savingsPerUnit)})
                        </p>
                      )}
                    </div>

                    <div className="text-left text-sm tabular-nums text-muted-foreground sm:text-right">
                      {item.latestUnitPrice !== null && (
                        <p className="font-medium text-foreground">
                          {formatRupiah(item.latestUnitPrice)}/
                          {item.normalizedUnit.toLowerCase()}
                        </p>
                      )}
                      {item.previousEmaUnitPrice !== null && (
                        <p className="text-xs">
                          Baseline EMA:{" "}
                          {formatRupiah(item.previousEmaUnitPrice)} ·{" "}
                          {item.latestSupplierName}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {alertItems.length > ITEMS_SHOWN && (
            <Link
              href="/barang"
              className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Lihat {alertItems.length - ITEMS_SHOWN} barang lainnya
            </Link>
          )}
        </>
      )}
    </section>
  );
}

