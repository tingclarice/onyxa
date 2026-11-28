"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate, formatRupiah } from "@/lib/utils/format";
import type { ItemMovement } from "../types/inventory";
import { CatalogItemControls } from "./catalog-item-controls";
import { MovementBadge } from "./movement-badge";
import { SpeedflowBadge } from "./speedflow-badge";
import { describeMovement, unitLabel } from "./movement-format";

export function ItemMovementList({ items, priceCells, canOpenDetail }: {
  canOpenDetail: boolean;
  items: ItemMovement[];
  priceCells: Record<string, ReactNode>;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("id-ID");
  const visibleItems = items.filter((item) => item.name.toLocaleLowerCase("id-ID").includes(query));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Cari barang" placeholder="Cari nama barang" value={search}
            onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <CatalogItemControls onAdded={() => setSearch("")} />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <caption className="sr-only">Katalog barang usaha aktif</caption>
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              {["Barang", "Pembelian terakhir", "Pergerakan", "Tren harga", "Aksi"].map((label) => (
                <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibleItems.map((item) => (
              <tr key={item.itemId} className="relative hover:bg-muted/35 focus-within:bg-muted/35">
                <th scope="row" className="px-4 py-4 font-semibold">
                  {canOpenDetail ? <Link href={`/barang/${item.itemId}`}
                    className="after:absolute after:inset-0 hover:underline focus-visible:underline">
                    {item.name}
                  </Link> : item.name}
                  <div className="mt-1 text-xs font-normal text-muted-foreground">{unitLabel(item.baseUnit)}</div>
                </th>
                <td className="px-4 py-3 tabular-nums">
                  {item.lastPurchase ? (
                    <>
                      <span className="whitespace-nowrap">{formatRupiah(item.lastPurchase.unitPrice)} / {item.lastPurchase.unit}</span>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.lastPurchase.date)}</div>
                    </>
                  ) : <span className="text-muted-foreground">Belum ada pembelian</span>}
                </td>
                <td className="px-4 py-3" title={describeMovement(item.status)}>
                  <div className="space-y-1.5">
                    <MovementBadge status={item.status} />
                    <SpeedflowBadge speedflow={item.speedflow} baseUnit={item.baseUnit} />
                  </div>
                </td>
                <td className="px-4 py-3">{priceCells[item.itemId] ?? "—"}</td>
                <td className="px-3 py-3"><div className="relative z-10 w-fit"><CatalogItemControls item={item} /></div></td>
              </tr>
            ))}
            {!visibleItems.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                {items.length ? "Barang tidak ditemukan. Coba nama lain." : "Belum ada barang. Tambahkan barang atau simpan nota pembelian."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
