"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addItemAlias,
  getItem,
  removeItemAlias,
} from "@/lib/api/items";
import { formatDate, formatRupiah } from "@/lib/utils/format";

function ItemDetailSkeleton() {
  return (
    <div aria-label="Memuat detail barang" className="mx-auto max-w-5xl animate-pulse space-y-5 px-4 py-6 sm:px-6 md:py-10">
      <div className="h-5 w-28 rounded bg-muted" />
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
      <div className="h-48 rounded-2xl bg-muted" />
    </div>
  );
}

export function ItemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: itemId } = use(params);
  const queryClient = useQueryClient();
  const [newAlias, setNewAlias] = useState("");
  const itemQuery = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => getItem(itemId),
  });
  const addAliasMutation = useMutation({
    mutationFn: (alias: string) => addItemAlias(itemId, alias),
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(["item", itemId], updatedItem);
      void queryClient.invalidateQueries({ queryKey: ["items"] });
      setNewAlias("");
      toast.success("Alias berhasil ditambahkan.");
    },
    onError: (error) => {
      toast.error(error.message || "Alias belum bisa ditambahkan.");
    },
  });
  const removeAliasMutation = useMutation({
    mutationFn: (alias: string) => removeItemAlias(itemId, alias),
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(["item", itemId], updatedItem);
      void queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Alias berhasil dihapus.");
    },
    onError: (error) => {
      toast.error(error.message || "Alias belum bisa dihapus.");
    },
  });

  if (itemQuery.isPending) return <ItemDetailSkeleton />;

  if (itemQuery.isError) {
    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center"
      >
        <p className="text-base text-muted-foreground">
          Detail barang belum bisa dimuat.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void itemQuery.refetch()}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  const item = itemQuery.data;
  if (!item) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base text-muted-foreground">
          Barang ini tidak ditemukan.
        </p>
        <Button asChild variant="outline">
          <Link href="/barang">Kembali ke daftar barang</Link>
        </Button>
      </div>
    );
  }

  const itemName = item.name;

  function submitAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addAliasMutation.mutate(newAlias);
  }

  function confirmRemoveAlias(alias: string) {
    const confirmed = window.confirm(
      `Hapus alias "${alias}" dari ${itemName}?`,
    );
    if (confirmed) removeAliasMutation.mutate(alias);
  }

  const chartData = item.price_history.map((point) => ({
    ...point,
    dateLabel: new Intl.DateTimeFormat("id-ID", {
      month: "short",
    }).format(new Date(`${point.date}T00:00:00`)),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-6 sm:px-6 md:py-10">
      <header className="space-y-4">
        <Link
          href="/barang"
          className="inline-flex min-h-12 items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          Kembali ke barang
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {item.name}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Harga per {item.base_unit}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="price-history-title"
        className="rounded-2xl border bg-card p-4 sm:p-6"
      >
        <div className="mb-5">
          <h2 id="price-history-title" className="text-lg font-semibold">
            Riwayat harga
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Perubahan harga {item.name.toLocaleLowerCase("id-ID")} dari waktu ke
            waktu.
          </p>
        </div>
        {chartData.length > 0 ? (
          <ChartContainer
            config={{
              price: {
                label: `Harga per ${item.base_unit}`,
                color: "var(--color-accent)",
              },
            }}
            className="h-64 w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  domain={["dataMin - 500", "dataMax + 500"]}
                  tickFormatter={(value: number) =>
                    `${Math.round(value / 1000)} rb`
                  }
                />
                <Tooltip
                  labelFormatter={(_label, payload) => {
                    const date = payload[0]?.payload?.date;
                    return date ? formatDate(String(date)) : "";
                  }}
                  formatter={(value) => [
                    formatRupiah(Number(value)),
                    `Harga / ${item.base_unit}`,
                  ]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    borderColor: "var(--border)",
                    backgroundColor: "var(--card)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-price)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--color-price)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-base text-muted-foreground">
            Belum ada riwayat harga.
          </p>
        )}
      </section>

      <section
        aria-labelledby="supplier-prices-title"
        className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
      >
        <div>
          <h2 id="supplier-prices-title" className="text-lg font-semibold">
            Harga dari pemasok
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Harga terakhir untuk satuan dasar {item.base_unit}.
          </p>
        </div>
        {item.suppliers.length === 0 ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-base text-muted-foreground">
            Belum ada catatan harga dari pemasok.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th scope="col" className="px-3 py-3 font-medium">
                    Pemasok
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Harga per {item.base_unit}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Terakhir dibeli
                  </th>
                </tr>
              </thead>
              <tbody>
                {item.suppliers.map((supplier) => (
                  <tr
                    key={supplier.supplier}
                    className="border-b last:border-0"
                  >
                    <th
                      scope="row"
                      className="px-3 py-4 text-base font-medium"
                    >
                      {supplier.supplier}
                    </th>
                    <td className="px-3 py-4 text-base font-semibold tabular-nums">
                      {formatRupiah(supplier.latest_price)}
                    </td>
                    <td className="px-3 py-4 text-base text-muted-foreground">
                      {formatDate(supplier.last_purchase_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        aria-labelledby="aliases-title"
        className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
      >
        <div>
          <h2 id="aliases-title" className="text-lg font-semibold">
            Alias
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Nama barang yang pernah terbaca di nota dan cocok dengan{" "}
            {item.name}.
          </p>
        </div>

        <ul className="space-y-2">
          {item.aliases.map((alias) => (
            <li
              key={alias}
              className="flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0 break-words text-base">{alias}</span>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Hapus alias ${alias}`}
                className="size-12 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                disabled={removeAliasMutation.isPending}
                onClick={() => confirmRemoveAlias(alias)}
              >
                {removeAliasMutation.isPending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
              </Button>
            </li>
          ))}
          {item.aliases.length === 0 && (
            <li className="rounded-lg border border-dashed p-4 text-base text-muted-foreground">
              Belum ada alias untuk barang ini.
            </li>
          )}
        </ul>

        <form
          onSubmit={submitAlias}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input
            aria-label="Alias baru"
            value={newAlias}
            onChange={(event) => setNewAlias(event.currentTarget.value)}
            placeholder="Contoh: GULA PASIR 50KG"
            className="sm:flex-1"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!newAlias.trim() || addAliasMutation.isPending}
            className="w-full sm:w-auto"
          >
            {addAliasMutation.isPending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            Tambah alias
          </Button>
        </form>
      </section>
    </div>
  );
}
