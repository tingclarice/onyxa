import { Award, Sparkles, Store } from "lucide-react";
import { formatDate, formatRupiah } from "@/lib/utils/format";
import type {
  ItemPriceDetail,
  PriceSeriesPoint,
  SupplierPriceSummary,
} from "../types/pricing";
import {
  formatSignedPercent,
  PriceVarianceBadge,
} from "./price-variance-badge";

/**
 * Full Procurement Pricing & Purchase Price Variance (PPV) analysis section
 * displayed on the Item Detail page (/barang/[id]).
 */
export function ItemPriceAnalysis({ detail }: { detail: ItemPriceDetail }) {
  const unitDisplay = detail.normalizedUnit.toLowerCase();
  const alt = detail.cheapestAlternative;

  return (
    <div className="space-y-6">
      {/* 1. Summary Card: Current Normalized Unit Price vs. EMA Baseline Cost */}
      <section
        aria-labelledby="pricing-summary-heading"
        className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="pricing-summary-heading"
              className="text-lg font-semibold"
            >
              Analisis Harga Beli & Baseline EMA
            </h2>
            <p className="text-sm text-muted-foreground">
              Perbandingan harga beli per {unitDisplay} terhadap rata-rata
              bergerak eksponensial (EMA α = 0,25)
            </p>
          </div>
          <PriceVarianceBadge
            alertLevel={detail.alertLevel}
            variancePercent={detail.latestVariancePercent}
            purchaseCount={detail.purchaseCount}
          />
        </div>

        {detail.latestUnitPrice === null ? (
          <p className="text-sm text-muted-foreground">
            Belum ada riwayat harga dari nota yang disimpan.
          </p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/40 p-4">
              <dt className="text-sm text-muted-foreground">
                Harga Satuan Terakhir
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {formatRupiah(detail.latestUnitPrice)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  /{unitDisplay}
                </span>
              </dd>
              {detail.latestSupplierName && detail.latestPurchaseDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {detail.latestSupplierName} ·{" "}
                  {formatDate(detail.latestPurchaseDate)}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-muted/40 p-4">
              <dt className="text-sm text-muted-foreground">
                Baseline EMA Sebelumnya
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {detail.previousEmaUnitPrice !== null
                  ? formatRupiah(detail.previousEmaUnitPrice)
                  : "-"}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  /{unitDisplay}
                </span>
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                Acuan deteksi lonjakan harga (PPV)
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-4">
              <dt className="text-sm text-muted-foreground">
                Selisih Varians (PPV)
              </dt>
              <dd
                className={`mt-1 text-xl font-bold tabular-nums ${
                  detail.alertLevel === "CRITICAL"
                    ? "text-red-700 dark:text-red-400"
                    : detail.alertLevel === "WARNING"
                      ? "text-amber-700 dark:text-amber-400"
                      : detail.alertLevel === "PRICE_DROP"
                        ? "text-green-700 dark:text-green-400"
                        : ""
                }`}
              >
                {detail.purchaseCount < 2
                  ? "Data awal"
                  : formatSignedPercent(detail.latestVariancePercent)}
              </dd>
              {detail.currentEmaUnitPrice !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  EMA terbaru: {formatRupiah(detail.currentEmaUnitPrice)}/
                  {unitDisplay}
                </p>
              )}
            </div>
          </dl>
        )}

        {/* Substitution Recommendation Banner */}
        {alt && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <Sparkles
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
            />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                Rekomendasi Substitusi Supplier: {alt.recommendedSupplierName}
              </p>
              <p className="text-amber-900/90 dark:text-amber-200/90">
                Harga terakhir di{" "}
                <span className="font-medium">{alt.currentSupplierName}</span>{" "}
                adalah {formatRupiah(alt.currentUnitPrice)}/{unitDisplay}. Berdasarkan
                riwayat belanjamu,{" "}
                <span className="font-medium">
                  {alt.recommendedSupplierName}
                </span>{" "}
                menawarkan{" "}
                <span className="font-semibold">
                  {formatRupiah(alt.recommendedLatestUnitPrice)}/{unitDisplay}
                </span>{" "}
                (hemat{" "}
                <span className="font-semibold">
                  {formatRupiah(alt.savingsPerUnit)}/{unitDisplay}
                </span>{" "}
                atau {formatSignedPercent(-alt.savingsPercent)}).
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 2. Trend Chart & Chronological Table: Actual Unit Price vs. EMA Baseline */}
      {detail.series.length > 0 && (
        <PriceTrendSection
          series={detail.series}
          unitDisplay={unitDisplay}
        />
      )}

      {/* 3. Cross-Supplier Price Comparison Card */}
      {detail.suppliers.length > 0 && (
        <SupplierPriceComparisonCard
          suppliers={detail.suppliers}
          unitDisplay={unitDisplay}
        />
      )}
    </div>
  );
}

function PriceTrendSection({
  series,
  unitDisplay,
}: {
  series: PriceSeriesPoint[];
  unitDisplay: string;
}) {
  return (
    <section
      aria-labelledby="price-trend-heading"
      className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="price-trend-heading" className="text-lg font-semibold">
            Tren Harga Satuan vs. Baseline EMA
          </h2>
          <p className="text-sm text-muted-foreground">
            Grafik dan riwayat perubahan harga per {unitDisplay} dari waktu ke
            waktu (kiri: pembelian terlama → kanan: terbaru). Garis putus-putus
            oranye adalah baseline EMA sebagai acuan kewajaran harga.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" />
            Harga Aktual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            Baseline EMA
          </span>
        </div>
      </div>

      {series.length >= 2 && <PriceTrendSvgChart series={series} />}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="pb-2.5 pr-4">Tanggal</th>
              <th className="pb-2.5 pr-4">Supplier</th>
              <th className="pb-2.5 pr-4 text-right">
                Harga/{unitDisplay}
              </th>
              <th className="pb-2.5 pr-4 text-right">EMA Sebelum</th>
              <th className="pb-2.5 pr-4 text-right">EMA Baru</th>
              <th className="pb-2.5 text-right">Varians (PPV)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...series].reverse().map((pt, idx) => {
              const isFirstEver = idx === series.length - 1;
              return (
                <tr key={pt.receiptLineId} className="tabular-nums">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {formatDate(pt.date)}
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    {pt.supplierName}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold">
                    {formatRupiah(pt.unitPrice)}
                  </td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">
                    {formatRupiah(pt.previousEmaUnitPrice)}
                  </td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">
                    {formatRupiah(pt.emaUnitPrice)}
                  </td>
                  <td className="py-3 text-right">
                    {isFirstEver ? (
                      <span className="text-xs text-muted-foreground">
                        Baseline awal
                      </span>
                    ) : (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          pt.alertLevel === "CRITICAL"
                            ? "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200"
                            : pt.alertLevel === "WARNING"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                              : pt.alertLevel === "PRICE_DROP"
                                ? "bg-green-100 text-green-900 dark:bg-green-950/60 dark:text-green-200"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {formatSignedPercent(pt.variancePercent)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function PriceTrendSvgChart({ series }: { series: PriceSeriesPoint[] }) {
  const width = 680;
  const height = 210;
  const padLeft = 72;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 38;

  const allValues = series.flatMap((s) => [s.unitPrice, s.emaUnitPrice]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const midVal = Math.round((minVal + maxVal) / 2);
  const range = maxVal - minVal > 0 ? maxVal - minVal : Math.max(1, maxVal * 0.1);

  const minPoint = series.reduce((best, cur) =>
    cur.unitPrice < best.unitPrice ? cur : best,
  );
  const maxPoint = series.reduce((best, cur) =>
    cur.unitPrice > best.unitPrice ? cur : best,
  );

  const toX = (index: number) =>
    series.length === 1
      ? (padLeft + (width - padRight)) / 2
      : padLeft +
        (index / (series.length - 1)) * (width - padLeft - padRight);

  const toY = (value: number) =>
    height - padBottom - ((value - minVal) / range) * (height - padTop - padBottom);

  const actualPoints = series
    .map((pt, idx) => `${toX(idx)},${toY(pt.unitPrice)}`)
    .join(" ");
  const emaPoints = series
    .map((pt, idx) => `${toX(idx)},${toY(pt.emaUnitPrice)}`)
    .join(" ");

  // Pick up to 6 evenly spaced X-axis labels so dates don't overlap on long series
  const maxLabels = 6;
  const labelStep = Math.max(1, Math.ceil(series.length / maxLabels));

  return (
    <div className="rounded-xl bg-muted/30 p-3 sm:p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Grafik tren harga aktual dibandingkan baseline EMA"
        className="h-52 w-full overflow-visible"
      >
        {[
          { value: maxVal, y: toY(maxVal) },
          { value: midVal, y: toY(midVal) },
          { value: minVal, y: toY(minVal) },
        ].map((tick, i) => (
          <g key={`${tick.value}-${i}`}>
            <line
              x1={padLeft}
              y1={tick.y}
              x2={width - padRight}
              y2={tick.y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="4 4"
            />
            <text
              x={padLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {formatRupiah(tick.value)}
            </text>
          </g>
        ))}

        {/* EMA Baseline polyline */}
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          points={emaPoints}
        />

        {/* Actual Unit Price polyline */}
        <polyline
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2.5"
          points={actualPoints}
        />

        {series.map((pt, idx) => {
          const cx = toX(idx);
          const showXLabel =
            idx === 0 ||
            idx === series.length - 1 ||
            idx % labelStep === 0;
          return (
            <g key={pt.receiptLineId}>
              <circle
                cx={cx}
                cy={toY(pt.emaUnitPrice)}
                r="3.5"
                fill="#f59e0b"
              >
                <title>
                  {`${formatDate(pt.date)} · Baseline EMA: ${formatRupiah(pt.emaUnitPrice)}`}
                </title>
              </circle>
              <circle
                cx={cx}
                cy={toY(pt.unitPrice)}
                r="5"
                fill="currentColor"
                className={
                  pt.alertLevel === "CRITICAL"
                    ? "text-red-600"
                    : pt.alertLevel === "WARNING"
                      ? "text-amber-600"
                      : pt.alertLevel === "PRICE_DROP"
                        ? "text-green-600"
                        : "text-primary"
                }
              >
                <title>
                  {`${formatDate(pt.date)} · ${pt.supplierName}\nHarga: ${formatRupiah(pt.unitPrice)}\nEMA: ${formatRupiah(pt.emaUnitPrice)}\nVarians: ${formatSignedPercent(pt.variancePercent)}`}
                </title>
              </circle>
              {showXLabel && (
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor={
                    idx === 0
                      ? "start"
                      : idx === series.length - 1
                        ? "end"
                        : "middle"
                  }
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {formatShortDate(pt.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-between gap-2 border-t pt-2 text-xs text-muted-foreground tabular-nums">
        <span>
          Periode: {formatDate(series[0].date)} –{" "}
          {formatDate(series[series.length - 1].date)} ({series.length} transaksi)
        </span>
        <span>
          Terendah: {formatRupiah(minPoint.unitPrice)} (
          {formatDate(minPoint.date)}) · Tertinggi:{" "}
          {formatRupiah(maxPoint.unitPrice)} ({formatDate(maxPoint.date)})
        </span>
      </div>
    </div>
  );
}

function SupplierPriceComparisonCard({
  suppliers,
  unitDisplay,
}: {
  suppliers: SupplierPriceSummary[];
  unitDisplay: string;
}) {
  const cheapestPrice = suppliers[0]?.latestUnitPrice ?? null;

  return (
    <section
      aria-labelledby="supplier-comparison-heading"
      className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6"
    >
      <div>
        <h2
          id="supplier-comparison-heading"
          className="text-lg font-semibold"
        >
          Perbandingan Harga Supplier
        </h2>
        <p className="text-sm text-muted-foreground">
          Diurutkan dari harga satuan ternormalisasi (/{unitDisplay}) paling
          hemat
        </p>
      </div>

      <ul className="divide-y">
        {suppliers.map((sup, idx) => {
          const isCheapest =
            suppliers.length > 1 &&
            idx === 0 &&
            cheapestPrice !== null &&
            sup.latestUnitPrice === cheapestPrice;

          return (
            <li
              key={sup.supplierKey}
              className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Store
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                  <span className="font-semibold">{sup.supplierName}</span>
                  {isCheapest && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900 dark:bg-green-950/60 dark:text-green-200">
                      <Award aria-hidden="true" className="size-3.5" />
                      Termurah
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sup.purchaseCount}x pembelian · terakhir{" "}
                  {formatDate(sup.lastPurchaseDate)} · rentang{" "}
                  {formatRupiah(sup.minUnitPrice)} –{" "}
                  {formatRupiah(sup.maxUnitPrice)}
                </p>
              </div>

              <div className="text-left tabular-nums sm:text-right">
                <p className="text-base font-bold">
                  {formatRupiah(sup.latestUnitPrice)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    /{sup.normalizedUnit.toLowerCase()}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Rata-rata EMA: {formatRupiah(sup.emaUnitPrice)}/
                  {sup.normalizedUnit.toLowerCase()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

