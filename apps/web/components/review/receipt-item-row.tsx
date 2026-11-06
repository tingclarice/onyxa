"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfidenceField } from "@/components/review/confidence-field";
import { CurrencyInput } from "@/components/review/currency-input";
import type { ScanReceiptItem } from "@/lib/contracts/scan";

type ReceiptItemRowProps = {
  item: ScanReceiptItem;
  onChange: (item: ScanReceiptItem) => void;
  onChangeMatchedItem: () => void;
};

function ReceiptItemRow({
  item,
  onChange,
  onChangeMatchedItem,
}: ReceiptItemRowProps) {
  const rowId = useId();

  return (
    <section
      aria-label={`Barang: ${item.raw_name}`}
      className="min-w-0 space-y-4 rounded-xl border bg-card p-4"
    >
      <ConfidenceField
        id={`${rowId}-name`}
        label="Nama barang"
        value={item.raw_name}
        confidence={item.confidence}
        onChange={(event) =>
          onChange({ ...item, raw_name: event.currentTarget.value })
        }
      />

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
            value={item.qty}
            onChange={(event) =>
              onChange({
                ...item,
                qty: Number(event.currentTarget.value),
              })
            }
          />
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
            onChange={(event) =>
              onChange({ ...item, unit: event.currentTarget.value })
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <CurrencyInput
          id={`${rowId}-unit-price`}
          label="Harga satuan"
          value={item.unit_price}
          onValueChange={(unit_price) => onChange({ ...item, unit_price })}
        />
        <CurrencyInput
          id={`${rowId}-line-total`}
          label="Jumlah harga"
          value={item.line_total}
          onValueChange={(line_total) => onChange({ ...item, line_total })}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="flex min-w-0 items-center gap-2 text-base">
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            →
          </span>
          <span className="truncate font-medium">
            {item.matched_item ?? "Belum dicocokkan"}
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-w-20"
          onClick={onChangeMatchedItem}
        >
          Ubah
        </Button>
      </div>
    </section>
  );
}

export { ReceiptItemRow };
