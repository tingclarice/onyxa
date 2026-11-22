"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Dialog, DropdownMenu } from "radix-ui";
import { Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ItemMovement } from "../types/inventory";
import { deleteItemAction, saveCatalogItemAction } from "./actions";

type Mode = "add" | "edit" | "delete";
const menuItemClass = "flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none data-highlighted:bg-muted";

export function CatalogItemControls({ item, onAdded }: { item?: ItemMovement; onAdded?: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const deleting = mode === "delete";

  function openDialog(next: Mode) {
    openingDialog.current = true;
    setError("");
    setMode(next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const result = deleting && item
          ? await deleteItemAction(item.itemId, "catalog")
          : await saveCatalogItemAction(item?.itemId ?? null, form);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setMode(null);
        if (mode === "add") onAdded?.();
      } catch {
        setError("Koneksi terputus. Periksa daftar barang sebelum mencoba lagi.");
      }
    });
  }

  return (
    <>
      {item ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button ref={trigger} variant="ghost" size="icon" aria-label={`Aksi untuk ${item.name}`}>
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4}
              className="z-50 min-w-36 rounded-md border bg-background p-1 shadow-md"
              onCloseAutoFocus={(event) => {
                if (openingDialog.current) event.preventDefault();
              }}>
              <DropdownMenu.Item className={menuItemClass} onSelect={() => openDialog("edit")}>
                <Pencil className="size-4" /> Edit barang
              </DropdownMenu.Item>
              <DropdownMenu.Item className={menuItemClass + " text-destructive"} onSelect={() => openDialog("delete")}>
                <Trash2 className="size-4" /> Hapus barang
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : (
        <Button ref={trigger} onClick={() => openDialog("add")}><Plus /> Tambah barang</Button>
      )}

      <Dialog.Root open={mode !== null} onOpenChange={(open) => { if (!open && !pending) setMode(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background p-6 shadow-lg"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              openingDialog.current = false;
              trigger.current?.focus();
            }}>
            <Dialog.Title className="text-xl font-semibold">
              {deleting ? "Hapus barang?" : item ? "Edit barang" : "Tambah barang"}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              {deleting ? `“${item?.name}” akan dihapus dari katalog aktif. Riwayat nota tetap tersedia.`
                : item ? "Perbarui informasi barang di katalog usaha." : "Masukkan nama dan satuan yang digunakan untuk barang ini."}
            </Dialog.Description>
            <form onSubmit={submit} className="mt-5 space-y-4">
              {!deleting && (
                <>
                  <label className="grid gap-2 text-sm font-medium">
                    Nama barang
                    <Input name="name" required defaultValue={item?.name} placeholder="Contoh: Susu cokelat" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Kategori barang (opsional)
                    <Input name="category" maxLength={80} defaultValue={item?.category ?? ""} placeholder="Contoh: Minuman" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Satuan dasar
                    <select name="baseUnit" defaultValue={item?.baseUnit ?? "PCS"}
                      className="h-12 rounded-md border border-input bg-background px-3 text-base">
                      <option value="PCS">pcs</option>
                      <option value="KG">kg</option>
                      <option value="LITER">liter</option>
                    </select>
                  </label>
                </>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild><Button type="button" variant="outline" disabled={pending}>Batal</Button></Dialog.Close>
                <Button type="submit" variant={deleting ? "destructive" : "default"} disabled={pending}>
                  {deleting ? (pending ? "Menghapus…" : "Hapus barang") : (pending ? "Menyimpan…" : "Simpan barang")}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
