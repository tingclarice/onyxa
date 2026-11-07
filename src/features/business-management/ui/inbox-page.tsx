import "server-only";

import Link from "next/link";
import { getBusinessWorkspace } from "./queries";
import { InvitationCard } from "./business-forms";

export async function InboxPage() {
  const { actor, invitations } = await getBusinessWorkspace();
  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <p className="break-all text-sm text-muted-foreground">
          Undangan usaha untuk {actor.email}
        </p>
      </header>
      {invitations.length ? (
        <ul aria-label="Undangan usaha" className="space-y-4">
          {invitations.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={invitation} />
          ))}
        </ul>
      ) : (
        <div className="space-y-2 rounded-xl border p-6">
          <h2 className="font-semibold">Belum ada undangan</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Undangan untuk email akun Anda akan muncul di sini.
          </p>
        </div>
      )}
      <Link
        href="/beranda"
        className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
