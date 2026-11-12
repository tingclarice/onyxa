"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteItemAction } from "./actions";

export function DeleteItemButton({
  itemId,
  itemName,
}: {
  itemId: string;
  itemName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteItemAction(itemId);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-destructive">
          Hapus &ldquo;{itemName}&rdquo;?
        </span>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={handleDelete}
        >
          {isPending ? "Menghapus..." : "Ya, hapus"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setConfirming(false)}
        >
          Batal
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden="true" />
        Hapus barang
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

