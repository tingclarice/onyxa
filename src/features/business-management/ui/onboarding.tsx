"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreateBusinessForm } from "./business-forms";

export function BusinessWorkspace({
  businessReady,
  email,
  children,
}: {
  businessReady: boolean;
  email: string | null;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  if (businessReady || pathname === "/inbox" || pathname === "/bisnis/baru")
    return children;
  return <BusinessOnboarding email={email} />;
}

export function BusinessOnboarding({ email }: { email: string | null }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <header className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-accent">Akun Anda sudah siap</p>
        <h1 className="text-2xl font-bold tracking-tight">
          Bagaimana Anda ingin bergabung?
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Buat usaha sendiri atau bergabung melalui undangan di inbox Anda.
        </p>
      </header>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <section
          className="space-y-5 rounded-2xl border p-5 sm:p-6"
          aria-labelledby="create-business-title"
        >
          <div>
            <h2 id="create-business-title" className="text-lg font-semibold">
              Buat usaha sendiri
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Anda menjadi pemilik dan bisa mengundang staf setelah usaha
              dibuat.
            </p>
          </div>
          <CreateBusinessForm />
        </section>
        <section
          className="space-y-5 rounded-2xl bg-muted/50 p-5 sm:p-6"
          aria-labelledby="join-business-title"
        >
          <div>
            <h2 id="join-business-title" className="text-lg font-semibold">
              Bergabung lewat undangan
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Undangan untuk akun Anda akan muncul di inbox. Buka undangan lalu
              pilih Yes atau No.
            </p>
            <p className="mt-3 break-all text-sm font-medium">{email}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/inbox">View Inbox</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
