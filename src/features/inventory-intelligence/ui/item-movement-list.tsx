"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate, formatRupiah } from "@/lib/utils/format";
import type { ItemMovement } from "../types/inventory";
import { MovementBadge } from "./movement-badge";
import { describeMovement, unitLabel } from "./movement-format";

/** Searchable list of items, each with its movement badge. Slowing items come first. */
export function ItemMovementList({ items }: { items: ItemMovement[] }) {
  const [search, setSearch] = useState("");
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
          Belum ada barang. Barang akan muncul otomatis setelah kamu menyimpan
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
              <ItemMovementCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ItemMovementCard({ item }: { item: ItemMovement }) {
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
          <p className="text-base tabular-nums">
            <span className="font-bold">{formatRupiah(last.unitPrice)}</span>
            <span className="ml-1 text-sm text-muted-foreground">
              / {last.unit} · dibeli {formatDate(last.date)}
            </span>
          </p>
        )}

        <div className="space-y-2">
          <MovementBadge status={item.status} />
          <p className="text-sm leading-6 text-muted-foreground">
            {describeMovement(item.status)}
          </p>
        </div>
      </article>
    </Link>
  );
}
