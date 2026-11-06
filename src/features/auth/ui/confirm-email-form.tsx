"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { confirmEmailAction } from "@/features/auth/services/actions";

export function ConfirmEmailForm({ tokenHash }: { tokenHash: string }) {
  const [state, action, isPending] = useActionState(confirmEmailAction, null);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-8">
      <h1 className="text-2xl font-bold">Konfirmasi email</h1>
      {tokenHash ? (
        <form action={action} className="space-y-4">
          <p>Konfirmasi email Anda untuk mulai menggunakan Onyxa.</p>
          <input type="hidden" name="token_hash" value={tokenHash} />
          {state?.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Mengonfirmasi..." : "Konfirmasi email"}
          </Button>
        </form>
      ) : (
        <p role="alert">Tautan konfirmasi tidak lengkap. Buka tautan dari email pendaftaran Anda.</p>
      )}
      <Link href="/masuk" className="text-accent underline underline-offset-4">Kembali ke halaman masuk</Link>
    </div>
  );
}
