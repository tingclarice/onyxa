"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfidenceField } from "./confidence-field";
import { CurrencyInput } from "./currency-input";
import type { ScanReceiptItem } from "../../types/scan";

type ReceiptItemRowProps = {
  item: ScanReceiptItem;
  onChange: (item: ScanReceiptItem) => void;
  errors?: {
    raw_name?: string;
    qty?: string;
    unit?: string;
    unit_price?: string;
    line_total?: string;
  };
};

function ReceiptItemRow({
  item,
  onChange,
  errors,
}: ReceiptItemRowProps) {
  const rowId = useId();
  const [isEditingMatchedItem, setIsEditingMatchedItem] = useState(false);
  const [matchedItemDraft, setMatchedItemDraft] = useState("");

  function startEditingMatchedItem() {
    setMatchedItemDraft(item.matched_item ?? item.raw_name);
    setIsEditingMatchedItem(true);
  }

  function saveMatchedItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange({
      ...item,
      matched_item: matchedItemDraft.trim() || null,
    });
    setIsEditingMatchedItem(false);
  }

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
        error={errors?.raw_name}
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
          label="Jumlah harga"
          value={item.line_total}
          error={errors?.line_total}
          onValueChange={(line_total) => onChange({ ...item, line_total })}
        />
      </div>

      {isEditingMatchedItem ? (
        <form
          className="space-y-3 border-t pt-3"
          onSubmit={saveMatchedItem}
        >
          <label
            htmlFor={`${rowId}-matched-item`}
            className="block text-base font-medium"
          >
            Nama barang yang cocok
          </label>
          <Input
            id={`${rowId}-matched-item`}
            autoFocus
            value={matchedItemDraft}
            onChange={(event) => setMatchedItemDraft(event.currentTarget.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Simpan</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditingMatchedItem(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      ) : (
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
            onClick={startEditingMatchedItem}
          >
            Ubah
          </Button>
        </div>
      )}
    </section>
  );
}

export { ReceiptItemRow };
