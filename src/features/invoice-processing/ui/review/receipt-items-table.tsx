"use client";

import { CircleAlert, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/utils/format";
import { findCatalogName } from "../../core/receipt-catalog-rules";
import {
  calculateNetLineTotal,
  getLineDiscountError,
  isLowConfidence,
} from "../../core/receipt-review-rules";
import type { ReceiptCatalogItem, ScanReceiptItem } from "../../types/scan";

export type ReceiptTableItemError = {
  raw_name?: { message?: string };
  proposed_name?: { message?: string };
  qty?: { message?: string };
  unit?: { message?: string };
  unit_price?: { message?: string };
  line_total?: { message?: string };
  discount?: { message?: string };
};

type ReceiptItemsTableProps = {
  items: ScanReceiptItem[];
  catalog: ReceiptCatalogItem[];
  editingIndex: number | null;
  itemErrors?: readonly (ReceiptTableItemError | undefined)[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
};

function getRowMessages(
  item: ScanReceiptItem,
  catalog: ReceiptCatalogItem[],
  rowError?: ReceiptTableItemError,
) {
  const selected = item.catalog_item_id
    ? catalog.find((entry) => entry.id === item.catalog_item_id)
    : undefined;
  const displayName =
    item.proposed_name ??
    selected?.name ??
    item.matched_item ??
    item.raw_name;
  const hasMatch = selected ?? findCatalogName(catalog, displayName);
  const catalogWarning =
    item.catalog_item_id && !selected
      ? "Pilihan lama sudah tidak tersedia. Klik edit untuk pilih ulang."
      : displayName.trim() && !hasMatch
        ? "Belum ada di katalog aktif. Barang ini akan ditambahkan saat nota disimpan."
        : "";
  const discountError = getLineDiscountError(item);
  const errorMessages = [
    rowError?.proposed_name?.message ?? rowError?.raw_name?.message,
    rowError?.qty?.message,
    rowError?.unit?.message,
    rowError?.unit_price?.message,
    rowError?.line_total?.message,
    discountError ?? rowError?.discount?.message,
  ].filter((message): message is string => Boolean(message));

  return {
    displayName,
    catalogWarning,
    discountError,
    errorMessages,
  };
}

export function ReceiptItemsTable({
  items,
  catalog,
  editingIndex,
  itemErrors,
  onEdit,
  onRemove,
}: ReceiptItemsTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-center text-base text-muted-foreground">
        Belum ada barang di nota. Gunakan form di atas untuk menambahkan barang.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
        <caption className="sr-only">Daftar barang di nota</caption>
        <thead className="border-b bg-muted/50 text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium sm:px-4">
              Barang
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3 text-right font-medium sm:px-4">
              Jumlah
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3 text-right font-medium sm:px-4">
              Harga satuan
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3 text-right font-medium sm:px-4">
              Jumlah harga
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3 text-right font-medium sm:px-4">
              Potongan
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3 text-right font-medium sm:px-4">
              Subtotal
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3 text-right font-medium sm:px-4">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item, index) => {
            const isEditing = editingIndex === index;
            const { displayName, catalogWarning, discountError, errorMessages } =
              getRowMessages(item, catalog, itemErrors?.[index]);
            const needsCheck = isLowConfidence(item.confidence);
            const hasRowError = errorMessages.length > 0;
            const itemLabel = displayName || `barang ${index + 1}`;

            return (
              <tr
                key={`${index}-${item.raw_name}-${item.catalog_item_id ?? "new"}`}
                className={cn(
                  "align-top transition-colors hover:bg-muted/30",
                  isEditing && "bg-primary/5 hover:bg-primary/10",
                  hasRowError && "bg-destructive/5",
                )}
              >
                <td className="min-w-44 px-3 py-3 sm:px-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {displayName || "—"}
                      </span>
                      {isEditing && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          Sedang diedit
                        </span>
                      )}
                      {needsCheck && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                          <CircleAlert aria-hidden="true" className="size-3" />
                          Perlu dicek
                        </span>
                      )}
                    </div>
                    {item.raw_name && item.raw_name !== displayName && (
                      <p className="text-xs text-muted-foreground">
                        Tertulis di nota: {item.raw_name}
                      </p>
                    )}
                    {catalogWarning && (
                      <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                        <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                        <span>{catalogWarning}</span>
                      </p>
                    )}
                    {errorMessages.map((message) => (
                      <p
                        key={message}
                        role="alert"
                        className="text-xs font-medium text-destructive"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-4">
                  {item.qty} {item.unit}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-4">
                  {formatRupiah(item.unit_price)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-4">
                  {formatRupiah(item.line_total)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground sm:px-4">
                  {item.discount ? formatRupiah(item.discount) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums sm:px-4">
                  {discountError ? "—" : formatRupiah(calculateNetLineTotal(item))}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right sm:px-4">
                  <div className="inline-flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant={isEditing ? "secondary" : "ghost"}
                      size="icon"
                      aria-label={`Edit ${itemLabel}`}
                      aria-pressed={isEditing}
                      onClick={() => onEdit(index)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Hapus ${itemLabel}`}
                      onClick={() => onRemove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
