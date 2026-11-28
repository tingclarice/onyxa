"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock, FileText, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { payTransactionAction } from "./actions";
import type { ReceiptTransaction, TransactionStatus } from "../types/transactions";
import { formatDate, formatRupiah } from "@/lib/utils/format";

type StatusFilter = "all" | TransactionStatus | "unpaid" | "paid";

const statusOptions: {
  value: StatusFilter;
  label: string;
}[] = [
    { value: "all", label: "Semua status" },
    { value: "unpaid", label: "Belum dibayar" },
    { value: "paid", label: "Sudah dibayar" },
    { value: "needs-check", label: "Perlu dicek" },
  ];
const noTransactions: ReceiptTransaction[] = [];

export function ReceiptTransactions({ receipts }: { receipts: ReceiptTransaction[] | null }) {
  const router = useRouter();
  const [supplierFilter, setSupplierFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [optimisticPaidIds, setOptimisticPaidIds] = useState<Record<string, true>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const transactions = useMemo(
    () => (receipts ?? noTransactions).map((item) => (
      optimisticPaidIds[item.id] ? { ...item, isPaid: true } : item
    )),
    [optimisticPaidIds, receipts],
  );
  const filteredTransactions = useMemo(() => {
    const normalizedSupplier = supplierFilter.trim().toLocaleLowerCase("id-ID");

    return transactions.filter((transaction) => {
      const matchesSupplier =
        !normalizedSupplier ||
        transaction.supplierName
          .toLocaleLowerCase("id-ID")
          .includes(normalizedSupplier);
      const matchesStart = !startDate || transaction.date >= startDate;
      const matchesEnd = !endDate || transaction.date <= endDate;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "unpaid" && !transaction.isPaid) ||
        (statusFilter === "paid" && transaction.isPaid) ||
        (statusFilter === "needs-check" && transaction.status === "needs-check");
      return matchesSupplier && matchesStart && matchesEnd && matchesStatus;
    });
  }, [endDate, startDate, statusFilter, supplierFilter, transactions]);

  async function handlePay(id: string) {
    setActionError(null);
    setPendingId(id);
    try {
      const result = await payTransactionAction(id);
      if (!result.ok) {
        setActionError(result.message);
        return;
      }
      setOptimisticPaidIds((prev) => ({ ...prev, [id]: true }));
      router.refresh();
    } catch {
      setActionError("Status pembayaran belum bisa diperbarui. Coba lagi.");
    } finally {
      setPendingId(null);
    }
  }

  function resetFilters() {
    setSupplierFilter("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
  }

  return (
    <>
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

      {receipts === null ? (
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
            onClick={() => router.refresh()}
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
          {transactions.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold">
                Tidak ada transaksi yang sesuai dengan filter
              </h2>
              <p className="max-w-md text-base text-muted-foreground">
                Coba ubah kata kunci pencarian, rentang tanggal, atau status
                filter Anda.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={resetFilters}
              >
                Hapus filter
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">
                Belum ada nota. Yuk, unggah yang pertama!
              </h2>
              <p className="max-w-md text-base text-muted-foreground">
                Nota yang Anda unggah akan tersimpan di sini supaya mudah dicari
                lagi.
              </p>
              <Button asChild className="mt-2">
                <Link href="/scan">Unggah nota</Link>
              </Button>
            </>
          )}
        </section>
      ) : (
        <section aria-label="Daftar transaksi" className="space-y-3">
          {actionError ? (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {actionError}
            </p>
          ) : null}
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {filteredTransactions.length} nota
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full border-collapse text-left text-sm sm:text-base">
              <caption className="sr-only">Nota pembelian untuk bisnis aktif</caption>
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-3 font-medium sm:px-5">Tanggal</th>
                  <th scope="col" className="px-3 py-3 font-medium sm:px-5">Pemasok</th>
                  <th scope="col" className="px-3 py-3 font-medium sm:px-5">Status</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium sm:px-5">Total bayar</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium sm:px-5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="relative hover:bg-muted/40 focus-within:bg-muted/40">
                    <td className="px-3 py-4 text-muted-foreground sm:px-5">{formatDate(transaction.date)}</td>
                    <td className="break-words px-3 py-4 sm:px-5">
                      <Link href={`/transaksi/${transaction.id}`}
                        className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:underline">
                        {transaction.supplierName}
                        <span className="sr-only">, {formatDate(transaction.date)}, {formatRupiah(transaction.total)}</span>
                      </Link>
                      {transaction.status === "needs-check" && <div className="mt-1"><StatusBadge status="needs-check" /></div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 sm:px-5">
                      {transaction.isPaid ? (
                        <Badge variant="success">
                          <Check aria-hidden="true" />
                          Sudah dibayar
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <Clock aria-hidden="true" />
                          Belum dibayar
                        </Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right font-semibold tabular-nums sm:px-5">
                      {formatRupiah(transaction.total)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right sm:px-5">
                      {transaction.isPaid ? (
                        <span className="text-xs text-muted-foreground">Lunas</span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="relative z-10"
                          disabled={pendingId === transaction.id}
                          onClick={() => void handlePay(transaction.id)}
                        >
                          {pendingId === transaction.id ? "Menyimpan..." : "PAY"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
