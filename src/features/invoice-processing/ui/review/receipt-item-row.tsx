"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { CatalogItemPicker } from "./catalog-item-picker";
import { CurrencyInput } from "./currency-input";
import { calculateNetLineTotal } from "../../core/receipt-review-rules";
import { formatRupiah } from "@/lib/utils/format";
import type { ReceiptCatalogItem, ScanReceiptItem } from "../../types/scan";

type ReceiptItemRowProps = {
  item: ScanReceiptItem;
  catalog: ReceiptCatalogItem[];
  onChange: (item: ScanReceiptItem) => void;
  errors?: {
    raw_name?: string;
    qty?: string;
    unit?: string;
    unit_price?: string;
    line_total?: string;
    discount?: string;
  };
};

function ReceiptItemRow({
  item,
  catalog,
  onChange,
  errors,
}: ReceiptItemRowProps) {
  const rowId = useId();

  return (
    <section
      aria-label={`Barang: ${item.raw_name}`}
      className="min-w-0 space-y-4 rounded-xl border bg-card p-4"
    >
      <CatalogItemPicker id={`${rowId}-name`} item={item} catalog={catalog} error={errors?.raw_name} onChange={onChange} />

      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <label
            htmlFor={`${rowId}-qty`}
            className="block text-base font-medium"
          >
            Jumlah
          </label>
          <Input
            id={`${rowId}-qty`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            aria-invalid={Boolean(errors?.qty) || undefined}
            value={item.qty}
            onChange={(event) =>
              onChange({
                ...item,
                qty: Number(event.currentTarget.value),
              })
            }
          />
          {errors?.qty && (
            <p className="text-sm font-medium text-destructive">{errors.qty}</p>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <label
            htmlFor={`${rowId}-unit`}
            className="block text-base font-medium"
          >
            Satuan
          </label>
          <Input
            id={`${rowId}-unit`}
            value={item.unit}
            aria-invalid={Boolean(errors?.unit) || undefined}
            onChange={(event) =>
              onChange({ ...item, unit: event.currentTarget.value })
            }
          />
          {errors?.unit && (
            <p className="text-sm font-medium text-destructive">{errors.unit}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <CurrencyInput
          id={`${rowId}-unit-price`}
          label="Harga satuan"
          value={item.unit_price}
          error={errors?.unit_price}
          onValueChange={(unit_price) => onChange({ ...item, unit_price })}
        />
        <CurrencyInput
          id={`${rowId}-line-total`}
          label="Jumlah sebelum potongan"
          value={item.line_total}
          error={errors?.line_total}
          onValueChange={(line_total) => onChange({ ...item, line_total })}
        />
        <CurrencyInput
          label="Potongan barang"
          value={item.discount ?? 0}
          error={errors?.discount}
          onValueChange={(discount) => onChange({ ...item, discount })}
        />
        <div className="flex justify-between gap-3 text-sm font-medium">
          <span>Jumlah setelah potongan</span>
          <span className="tabular-nums">{errors?.discount ? "—" : formatRupiah(calculateNetLineTotal(item))}</span>
        </div>
      </div>
    </section>
  );
}

export { ReceiptItemRow };
