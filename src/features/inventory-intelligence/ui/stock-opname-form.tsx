"use client";

import { useId, useState, useTransition } from "react";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BaseUnit } from "../types/inventory";
import { recordStockOpnameAction } from "./actions";
import { unitLabel } from "./movement-format";

interface StockOpnameFormProps {
  itemId: string;
  baseUnit: BaseUnit;
  defaultDate: string;
}

export function StockOpnameForm({
  itemId,
  baseUnit,
  defaultDate,
}: StockOpnameFormProps) {
  const formId = useId();
  const [countedQty, setCountedQty] = useState("");
  const [recordedAt, setRecordedAt] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const submitted = new FormData(event.currentTarget);
    const trimmed = String(submitted.get("countedQty") ?? countedQty).trim();
    const submittedDate = String(submitted.get("recordedAt") ?? recordedAt).trim();

    if (trimmed === "") {
      setError("Masukkan jumlah stok fisik (isi 0 jika rak kosong).");
      return;
    }
    if (!submittedDate) {
      setError("Pilih tanggal hitung terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("countedQty", trimmed);
    formData.set("recordedAt", submittedDate);

    startTransition(async () => {
      const result = await recordStockOpnameAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCountedQty("");
      setSuccess(
        result.audit
          ? "Stock opname tersimpan dan rekonsiliasi periode telah diperbarui."
          : "Stock opname pertama tersimpan sebagai titik awal kalibrasi.",
      );
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border bg-card p-4 shadow-xs sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck aria-hidden="true" className="size-5 text-primary" />
        <div>
          <h3 className="text-base font-semibold">Catat Stock Opname</h3>
          <p className="text-sm text-muted-foreground">
            Hitung stok fisik di rak (isi 0 jika rak kosong) untuk mengkalibrasi kecepatan jual.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-qty`}
            className="block text-sm font-medium"
          >
            Stok fisik ({unitLabel(baseUnit)})
          </label>
          <Input
            id={`${formId}-qty`}
            name="countedQty"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            required
            placeholder="Contoh: 0 atau 12.5"
            value={countedQty}
            onChange={(event) => setCountedQty(event.currentTarget.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-date`}
            className="block text-sm font-medium"
          >
            Tanggal hitung
          </label>
          <Input
            id={`${formId}-date`}
            name="recordedAt"
            type="date"
            required
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.currentTarget.value)}
            disabled={isPending}
          />
        </div>

        <Button type="submit" disabled={isPending} className="min-h-10">
          {isPending ? "Menyimpan..." : "Simpan opname"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {success}
        </p>
      )}
    </form>
  );
}
