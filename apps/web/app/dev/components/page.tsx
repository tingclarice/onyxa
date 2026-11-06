"use client";

import { useState } from "react";
import {
  ConfidenceField,
  CurrencyInput,
  ReceiptItemRow,
  StatusBadge,
} from "@/components/review";
import type { ScanReceiptItem } from "@/lib/contracts/scan";

const initialItems: ScanReceiptItem[] = [
  {
    raw_name: "Gula pasir",
    qty: 5,
    unit: "kg",
    unit_price: 17000,
    line_total: 85000,
    confidence: 0.68,
    matched_item: "Gula Pasir",
  },
  {
    raw_name: "Minyak goreng",
    qty: 2,
    unit: "liter",
    unit_price: 18500,
    line_total: 37000,
    confidence: 0.94,
    matched_item: "Minyak Goreng",
  },
];

export default function ComponentsPreviewPage() {
  const [amount, setAmount] = useState(1300000);
  const [items, setItems] = useState(initialItems);

  function updateItem(index: number, updatedItem: ScanReceiptItem) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? updatedItem : item,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Pratinjau komponen
        </h1>
        <p className="text-base text-muted-foreground">
          Contoh komponen untuk memeriksa struk belanja.
        </p>
      </header>

      <section aria-labelledby="status-title" className="space-y-3">
        <h2 id="status-title" className="text-lg font-semibold">
          Status
        </h2>
        <div className="flex flex-wrap gap-3">
          <StatusBadge status="needs-check" />
          <StatusBadge status="saved" />
        </div>
      </section>

      <section aria-labelledby="field-title" className="space-y-4">
        <h2 id="field-title" className="text-lg font-semibold">
          Kolom isian
        </h2>
        <ConfidenceField
          label="Nama pemasok"
          defaultValue="Pasar Segar Bu Rina"
          confidence={0.67}
        />
        <CurrencyInput
          label="Total belanja"
          value={amount}
          onValueChange={setAmount}
        />
      </section>

      <section aria-labelledby="items-title" className="space-y-4">
        <h2 id="items-title" className="text-lg font-semibold">
          Barang di struk
        </h2>
        {items.map((item, index) => (
          <ReceiptItemRow
            key={index}
            item={item}
            onChange={(updatedItem) => updateItem(index, updatedItem)}
            onChangeMatchedItem={() =>
              updateItem(index, {
                ...item,
                matched_item:
                  item.matched_item === "Gula Pasir"
                    ? "Gula Kristal"
                    : "Gula Pasir",
              })
            }
          />
        ))}
      </section>
    </div>
  );
}
