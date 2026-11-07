"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invitation, Membership } from "../types/business";
import { switchBusinessAction } from "./actions";
import { ActionMessage, InvitationCard } from "./business-forms";
import { InvitationCodeForm } from "./invitation-code-form";

export function BusinessMenu({
  email,
  memberships,
  activeBusinessId,
  invitations,
  accountActions,
}: {
  email: string | null;
  memberships: Membership[];
  activeBusinessId?: string;
  invitations: Invitation[];
  accountActions: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [result, action, pending] = useActionState(switchBusinessAction, null);
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) router.refresh();
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          variant="outline"
          className="relative shrink-0"
          aria-label={`Buka menu${invitations.length ? `, ${invitations.length} undangan` : ""}`}
        >
          <Menu aria-hidden="true" />
          Menu
          {invitations.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
              {invitations.length}
            </span>
          )}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-60 bg-black/25" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-70 flex w-full max-w-md flex-col border-l bg-background outline-none">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <Dialog.Title className="text-lg font-semibold">
              Menu Onyxa
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Tutup menu">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Pilih usaha dan kelola undangan untuk akun Anda.
          </Dialog.Description>
          <div className="flex-1 space-y-7 overflow-y-auto p-5">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Akun</p>
              <p className="break-all text-sm font-medium">{email}</p>
            </div>
            <section className="space-y-3" aria-labelledby="menu-businesses">
              <h2 id="menu-businesses" className="text-sm font-semibold">
                Usaha Anda
              </h2>
              {memberships.length ? (
                <form action={action} className="space-y-2">
                  {memberships.map((member) => (
                    <button
                      key={member.id}
                      type="submit"
                      name="businessId"
                      value={member.businessId}
                      disabled={
                        pending || member.businessId === activeBusinessId
                      }
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted disabled:bg-muted/60 disabled:opacity-80"
                    >
                      <span className="min-w-0 break-words font-medium">
                        {member.business.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {member.businessId === activeBusinessId
                          ? "Aktif"
                          : member.role === "OWNER"
                            ? "Pemilik"
                            : "Staf"}
                      </span>
                    </button>
                  ))}
                  <ActionMessage result={result} />
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Anda belum bergabung dengan usaha.
                </p>
              )}
              <Link
                href="/bisnis/baru"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
              >
                Buat usaha baru
              </Link>
            </section>
            <section className="space-y-3" aria-labelledby="menu-invitations">
              <h2 id="menu-invitations" className="text-sm font-semibold">
                Undangan ({invitations.length})
              </h2>
              {invitations.length ? (
                <ul className="space-y-3">
                  {invitations.map((invitation) => (
                    <InvitationCard
                      key={invitation.id}
                      invitation={invitation}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Minta kode atau tautan dari pemilik usaha. Undangan tampil
                  setelah kode diperiksa untuk akun Anda.
                </p>
              )}
              <InvitationCodeForm />
              <Button variant="outline" onClick={() => router.refresh()}>
                Perbarui undangan
              </Button>
            </section>
            {activeBusinessId && (
              <nav aria-label="Menu usaha" className="flex flex-col gap-1">
                {[
                  { href: "/beranda", label: "Beranda" },
                  { href: "/scan", label: "Scan nota" },
                  { href: "/transaksi", label: "Transaksi" },
                  { href: "/barang", label: "Barang" },
                  { href: "/pengaturan", label: "Pengaturan dan tim" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="border-t p-4">{accountActions}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
