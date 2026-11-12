"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate, formatRupiah } from "@/lib/utils/format";
import type { ItemMovement } from "../types/inventory";
import type { ItemPriceSummary } from "@/features/procurement-pricing/types/pricing";
import { PriceVarianceBadge } from "@/features/procurement-pricing/ui/price-variance-badge";
import { MovementBadge } from "./movement-badge";
import { describeMovement, unitLabel } from "./movement-format";

/** Searchable list of items, each with its movement badge and price variance badge. */
export function ItemMovementList({
  items,
  priceSummaries = [],
}: {
  items: ItemMovement[];
  priceSummaries?: ItemPriceSummary[];
}) {
  const [search, setSearch] = useState("");
  const priceById = useMemo(
    () => new Map(priceSummaries.map((p) => [p.itemId, p])),
    [priceSummaries],
  );
  const shownItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return items;
    return items.filter((item) =>
      item.name.toLocaleLowerCase("id-ID").includes(query),
    );
  }, [items, search]);

  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-dashed px-5 py-10 text-center">
        <p className="text-base text-muted-foreground">
          Belum ada barang. Barang akan muncul otomatis setelah Anda menyimpan
          nota.
        </p>
      </div>
    );

  return (
    <>
      <div className="relative mb-6">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Cari barang"
          placeholder="Cari nama barang"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          className="pl-10"
        />
      </div>

      {shownItems.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-5 py-10 text-center text-base text-muted-foreground">
          Barang tidak ditemukan. Coba kata lain.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shownItems.map((item) => (
            <li key={item.itemId}>
              <ItemMovementCard
                item={item}
                priceSummary={priceById.get(item.itemId)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ItemMovementCard({
  item,
  priceSummary,
}: {
  item: ItemMovement;
  priceSummary?: ItemPriceSummary;
}) {
  const last = item.lastPurchase;
  return (
    <Link
      href={`/barang/${item.itemId}`}
      className="block h-full rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5"
    >
      <article className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold">{item.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Satuan dasar: {unitLabel(item.baseUnit)}
            </p>
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
          />
        </div>

        {last && (
          <div className="space-y-0.5 tabular-nums">
            <p className="text-base">
              <span className="font-bold">{formatRupiah(last.unitPrice)}</span>
              <span className="ml-1 text-sm text-muted-foreground">
                / {last.unit} · dibeli {formatDate(last.date)}
              </span>
            </p>
            {priceSummary && priceSummary.previousEmaUnitPrice !== null && (
              <p className="text-xs text-muted-foreground">
                Baseline EMA: {formatRupiah(priceSummary.previousEmaUnitPrice)}/
                {priceSummary.normalizedUnit.toLowerCase()}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <MovementBadge status={item.status} />
            {priceSummary && priceSummary.purchaseCount > 0 && (
              <PriceVarianceBadge
                alertLevel={priceSummary.alertLevel}
                variancePercent={priceSummary.latestVariancePercent}
                purchaseCount={priceSummary.purchaseCount}
              />
            )}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {describeMovement(item.status)}
          </p>
          {priceSummary?.cheapestAlternative && (
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Alternatif lebih murah:{" "}
              {priceSummary.cheapestAlternative.recommendedSupplierName} (
              {formatRupiah(
                priceSummary.cheapestAlternative.recommendedLatestUnitPrice,
              )}
              /
              {priceSummary.cheapestAlternative.normalizedUnit.toLowerCase()})
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
