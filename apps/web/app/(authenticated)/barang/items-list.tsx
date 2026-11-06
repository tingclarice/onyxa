"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getItems } from "@/lib/api/items";
import { formatDate, formatRupiah } from "@/lib/format";

const noItems: Awaited<ReturnType<typeof getItems>> = [];

function ItemCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border bg-card p-4 sm:p-5"
    >
      <div className="h-6 w-2/3 rounded bg-muted" />
      <div className="mt-5 h-5 w-1/2 rounded bg-muted" />
      <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
    </div>
  );
}

export function ItemsList() {
  const [search, setSearch] = useState("");
  const itemsQuery = useQuery({
    queryKey: ["items"],
    queryFn: getItems,
  });
  const items = itemsQuery.data ?? noItems;
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return items;
    return items.filter((item) =>
      item.name.toLocaleLowerCase("id-ID").includes(query),
    );
  }, [items, search]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Barang
        </h1>
        <p className="text-base text-muted-foreground">
          Barang dari nota yang sudah kamu simpan.
        </p>
      </header>

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

      {itemsQuery.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <ItemCardSkeleton />
          <ItemCardSkeleton />
          <ItemCardSkeleton />
          <ItemCardSkeleton />
        </div>
      ) : itemsQuery.isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-dashed px-5 py-10 text-center"
        >
          <p className="text-base text-muted-foreground">
            Daftar barang belum bisa dimuat. Coba lagi sebentar lagi.
          </p>
          <button
            type="button"
            className="mt-3 min-h-12 text-base font-semibold text-accent underline"
            onClick={() => void itemsQuery.refetch()}
          >
            Coba lagi
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-5 py-10 text-center">
          <p className="text-base text-muted-foreground">
            {items.length === 0
              ? "Belum ada barang. Barang akan muncul otomatis setelah kamu menyimpan nota."
              : "Barang tidak ditemukan. Coba kata lain."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map((item) => (
            <li key={item.id}>
              <Link
                href={`/barang/${item.id}`}
                className="block h-full rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5"
              >
                <article className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-semibold">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-base text-muted-foreground">
                        Satuan dasar: {item.base_unit}
                      </p>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </div>

                  <div>
                    <p className="text-xl font-bold tabular-nums">
                      {formatRupiah(item.latest_price)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        / {item.base_unit}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        Terakhir dibeli {formatDate(item.last_purchase_date)}
                      </p>
                      {item.price_rose &&
                        item.price_change_percent !== undefined && (
                          <Badge variant="warning">
                            Naik {item.price_change_percent}%
                          </Badge>
                        )}
                    </div>
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
