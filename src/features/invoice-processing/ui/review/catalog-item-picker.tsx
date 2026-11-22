"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { isLowConfidence } from "../../core/receipt-review-rules";
import { findCatalogName } from "../../core/receipt-catalog-rules";
import { normalizeNameKey } from "../../core/receipt-line-rules";
import type { ReceiptCatalogItem, ScanReceiptItem } from "../../types/scan";

export function CatalogItemPicker({ id, item, catalog, error, onChange }: {
  id: string;
  item: ScanReceiptItem;
  catalog: ReceiptCatalogItem[];
  error?: string;
  onChange: (line: ScanReceiptItem) => void;
}) {
  const [printed] = useState(item.raw_name);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const selected = item.catalog_item_id ? catalog.find((entry) => entry.id === item.catalog_item_id) : undefined;
  const value = item.proposed_name ?? selected?.name ?? item.matched_item ?? item.raw_name;
  const query = normalizeNameKey(value);
  const options = catalog.filter((entry) =>
    [entry.name, ...entry.aliases].some((name) => normalizeNameKey(name).includes(query)),
  );
  const expanded = open && options.length > 0;
  const hasMatch = selected ?? findCatalogName(catalog, value);
  const warning = item.catalog_item_id && !selected ? "Pilihan lama sudah tidak tersedia. Pilih ulang barang."
    : query && !hasMatch ? "Belum ada di katalog aktif. Barang ini akan ditambahkan saat nota disimpan." : "";

  function changeName(name: string, match?: ReceiptCatalogItem) {
    onChange({
      ...item,
      raw_name: printed || name,
      proposed_name: name,
      matched_item: match?.name ?? null,
      catalog_item_id: match?.id,
      unit: !printed && match && (item.unit === "pcs" || item.unit === selected?.baseUnit.toLowerCase())
        ? match.baseUnit.toLowerCase() : item.unit,
    });
  }

  function choose(entry: ReceiptCatalogItem) {
    changeName(entry.name, entry);
    setOpen(false);
    setActive(-1);
  }

  function highlight(index: number) {
    setActive(index);
    document.getElementById(id + "-option-" + index)?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium">Nama barang</label>
      {warning && <p id={id + "-warning"} role="status" className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{warning}
      </p>}
      <div className="relative">
        <Input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
          aria-controls={expanded ? id + "-list" : undefined} aria-activedescendant={expanded && options[active] ? id + "-option-" + active : undefined}
          aria-invalid={Boolean(error) || undefined} aria-describedby={warning ? id + "-warning" : undefined}
          autoComplete="off" placeholder="Cari atau ketik nama barang" value={value}
          onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
          onChange={(event) => {
            const name = event.currentTarget.value;
            changeName(name, findCatalogName(catalog, name));
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setOpen(false); setActive(-1); return; }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (options.length) highlight(event.key === "ArrowDown" ? (active + 1) % options.length : (active <= 0 ? options.length - 1 : active - 1));
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (options[active]) choose(options[active]);
              else setOpen(false);
            }
          }} />
        {expanded && (
          <ul id={id + "-list"} role="listbox" aria-label="Barang katalog"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background p-1 shadow-md">
            {options.map((entry, index) => (
              <li key={entry.id} id={id + "-option-" + index} role="option" aria-selected={entry.id === selected?.id}
                className={`flex cursor-pointer justify-between gap-3 rounded px-3 py-2 hover:bg-muted ${active === index ? "bg-muted" : ""}`}
                onMouseDown={(event) => event.preventDefault()} onClick={() => choose(entry)}>
                {entry.name}<span className="text-muted-foreground">{entry.baseUnit.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {printed && printed !== value && <p className="text-sm text-muted-foreground">Tertulis di nota: {printed}</p>}
      {isLowConfidence(item.confidence) && <p className="text-sm text-amber-800 dark:text-amber-300">Perlu dicek</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
