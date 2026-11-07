"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateBusinessForm, InvitationCard } from "./business-forms";
import type { Invitation } from "../types/business";
import { InvitationCodeForm } from "./invitation-code-form";

export function BusinessOnboarding({
  invitations,
  email,
}: {
  invitations: Invitation[];
  email: string | null;
}) {
  const [waiting, setWaiting] = useState(false);
  const createSection = (
    <section
      key="create-business"
      className="space-y-5 rounded-2xl border p-5 sm:p-6"
      aria-labelledby="create-business-title"
    >
      <div>
        <h2 id="create-business-title" className="text-lg font-semibold">
          Buat usaha sendiri
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Anda menjadi pemilik dan bisa mengundang staf setelah usaha dibuat.
        </p>
      </div>
      <CreateBusinessForm />
    </section>
  );
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <header className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-accent">Akun Anda sudah siap</p>
        <h1 className="text-2xl font-bold tracking-tight">
          Bagaimana Anda ingin bergabung?
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Buat usaha untuk mengelolanya sendiri, atau tunggu undangan dari
          pemilik usaha. Akun Anda tidak harus memiliki usaha.
        </p>
      </header>
      <div className="grid items-start gap-6 md:grid-cols-2">
        {!invitations.length && createSection}
        <section
          key="join-business"
          className="space-y-5 rounded-2xl bg-muted/50 p-5 sm:p-6"
          aria-labelledby="wait-invitation-title"
        >
          <div>
            <h2 id="wait-invitation-title" className="text-lg font-semibold">
              Bergabung lewat undangan
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {invitations.length
                ? "Undangan untuk email akun Anda:"
                : "Minta kode undangan dari pemilik usaha untuk email akun Anda:"}
            </p>
            <p className="mt-3 break-all text-sm font-medium">
              {email ?? "Email belum tersedia"}
            </p>
          </div>
          <InvitationCodeForm />
          {invitations.length ? (
            <section
              aria-labelledby="pending-invites-title"
              className="space-y-3"
            >
              <p id="pending-invites-title" className="text-sm font-semibold">
                Undangan untuk Anda ({invitations.length})
              </p>
              <ul className="space-y-3">
                {invitations.map((invitation) => (
                  <InvitationCard key={invitation.id} invitation={invitation} />
                ))}
              </ul>
            </section>
          ) : waiting ? (
            <p role="status" className="text-sm leading-6">
              Anda sedang menunggu undangan. Periksa bagian Undangan di menu
              kanan atas; Anda tetap bisa membuat usaha kapan saja.
            </p>
          ) : (
            <Button variant="outline" onClick={() => setWaiting(true)}>
              Saya menunggu undangan
            </Button>
          )}
          <p className="text-sm leading-6 text-muted-foreground">
            Pemilik membagikan kode atau tautan langsung, tanpa email otomatis.
          </p>
        </section>
        {invitations.length > 0 && createSection}
      </div>
    </div>
  );
}
