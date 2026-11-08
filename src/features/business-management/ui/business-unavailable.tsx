"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function BusinessUnavailable({
  accountActions,
}: {
  accountActions?: ReactNode;
}) {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-16">
      <h1 className="text-2xl font-semibold">Data usaha belum dapat dimuat</h1>
      <p className="leading-7 text-muted-foreground">
        Akun Anda tetap masuk. Data usaha belum tersedia. Coba lagi dalam
        beberapa saat.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => router.refresh()}>Coba lagi</Button>
        {accountActions}
      </div>
    </main>
  );
}
