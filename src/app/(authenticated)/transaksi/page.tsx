"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileText, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getTransactions,
  type TransactionStatus,
} from "@/lib/api/transactions";
import { formatDate, formatRupiah } from "@/lib/utils/format";

const statusOptions: {
  value: "all" | TransactionStatus;
  label: string;
}[] = [
    { value: "all", label: "Semua status" },
    { value: "needs-check", label: "Perlu dicek" },
    { value: "saved", label: "Tersimpan" },
  ];
const noTransactions: Awaited<ReturnType<typeof getTransactions>> = [];

function TransactionSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-3">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
        </div>
        <div className="h-8 w-24 rounded-full bg-muted" />
      </div>
      <div className="mt-6 h-6 w-1/2 rounded bg-muted" />
    </div>
  );
}

export default function TransaksiPage() {
  const [supplierFilter, setSupplierFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | TransactionStatus
  >("all");
  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: getTransactions,
  });

  const transactions = transactionsQuery.data ?? noTransactions;
  const filteredTransactions = useMemo(() => {
    const normalizedSupplier = supplierFilter.trim().toLocaleLowerCase("id-ID");

    return transactions.filter((transaction) => {
      const matchesSupplier =
        !normalizedSupplier ||
        transaction.supplier_name
          .toLocaleLowerCase("id-ID")
          .includes(normalizedSupplier);
      const matchesStart = !startDate || transaction.date >= startDate;
      const matchesEnd = !endDate || transaction.date <= endDate;
      const matchesStatus =
        statusFilter === "all" || transaction.status === statusFilter;
      return matchesSupplier && matchesStart && matchesEnd && matchesStatus;
    });
  }, [endDate, startDate, statusFilter, supplierFilter, transactions]);

  function resetFilters() {
    setSupplierFilter("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Transaksi
        </h1>
        <p className="text-base text-muted-foreground">
          Semua nota belanja yang sudah kamu unggah.
        </p>
      </header>

      <section
        aria-label="Filter transaksi"
        className="mb-6 grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="min-w-0 space-y-2">
          <label htmlFor="supplier-filter" className="text-base font-medium">
            Pemasok
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="supplier-filter"
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.currentTarget.value)}
              placeholder="Cari nama pemasok"
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <label htmlFor="start-date" className="text-base font-medium">
            Dari tanggal
          </label>
          <div className="relative">
            <CalendarDays
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="start-date"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.currentTarget.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <label htmlFor="end-date" className="text-base font-medium">
            Sampai tanggal
          </label>
          <div className="relative">
            <CalendarDays
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.currentTarget.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <label htmlFor="status-filter" className="text-base font-medium">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => {
              const selectedOption = statusOptions.find(
                (option) => option.value === event.currentTarget.value,
              );
              setStatusFilter(selectedOption?.value ?? "all");
            }}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {transactionsQuery.isPending ? (
        <div
          aria-label="Memuat transaksi"
          className="grid gap-3 sm:grid-cols-2"
        >
          <TransactionSkeleton />
          <TransactionSkeleton />
          <TransactionSkeleton />
          <TransactionSkeleton />
        </div>
      ) : transactionsQuery.isError ? (
        <section
          role="alert"
          className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-5 py-10 text-center"
        >
          <p className="text-base text-muted-foreground">
            Nota belum bisa dimuat. Periksa koneksi lalu coba lagi.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void transactionsQuery.refetch()}
          >
            Coba lagi
          </Button>
        </section>
      ) : filteredTransactions.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-10 text-center">
          <FileText
            aria-hidden="true"
            className="size-9 text-muted-foreground"
          />
          <h2 className="text-lg font-semibold">
            Belum ada nota. Yuk, unggah yang pertama!
          </h2>
          <p className="max-w-md text-base text-muted-foreground">
            Nota yang kamu unggah akan tersimpan di sini supaya mudah dicari
            lagi.
          </p>
          <Button asChild className="mt-2">
            <Link href="/scan">Unggah nota</Link>
          </Button>
          {transactions.length > 0 && (
            <Button
              type="button"
              variant="link"
              className="h-12"
              onClick={resetFilters}
            >
              Hapus filter
            </Button>
          )}
        </section>
      ) : (
        <section aria-label="Daftar transaksi" className="space-y-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {filteredTransactions.length} nota
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {filteredTransactions.map((transaction) => (
              <li
                key={transaction.id}
                className="rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40 sm:p-5"
              >
                <article className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-semibold">
                        {transaction.supplier_name}
                      </h2>
                      <p className="mt-1 text-base text-muted-foreground">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <StatusBadge status={transaction.status} />
                  </div>
                  <p className="text-xl font-bold tabular-nums">
                    {formatRupiah(transaction.total)}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
