"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSettlementAction } from "./actions";

export function SettlementForm({ today }: { today: string }) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("id", id);
    setError("");
    startTransition(async () => {
      try {
        const result = await saveSettlementAction(form);
        if (!result.ok) { setError(result.message); return; }
        setId("");
        router.replace("/pemasukan");
      } catch {
        setError("Gagal menerima konfirmasi. Coba simpan lagi untuk memeriksa setoran yang sama.");
      }
    });
  }

  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => {
      if (pending) return;
      setError("");
      setId(open ? crypto.randomUUID() : "");
    }}>
      <Dialog.Trigger asChild><Button><Plus aria-hidden /> Tambah pemasukan</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold">Tambah pemasukan</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">Masukkan uang yang diterima pada tanggal setoran.</Dialog.Description>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="grid gap-2 text-sm font-medium">Tanggal setoran
              <Input required name="date" type="date" max={today} defaultValue={today} />
            </label>
            <label className="grid gap-2 text-sm font-medium">Cash (Rp)
              <Input name="cash" type="number" min="0" max="999999999999" step="0.01" placeholder="0" />
            </label>
            <label className="grid gap-2 text-sm font-medium">QRIS (Rp)
              <Input name="qris" type="number" min="0" max="999999999999" step="0.01" placeholder="0" />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild><Button type="button" variant="outline" disabled={pending}>Batal</Button></Dialog.Close>
              <Button disabled={pending} type="submit">{pending ? "Menyimpan…" : "Simpan setoran"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
