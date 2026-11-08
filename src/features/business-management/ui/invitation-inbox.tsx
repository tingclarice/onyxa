import type { Invitation } from "../types/business";
import { InvitationCard } from "./business-forms";

/** The recipient's invitations with Yes/No buttons, or an empty message. */
export function InvitationInbox({ invitations }: { invitations: Invitation[] }) {
  if (!invitations.length)
    return (
      <div className="space-y-2 rounded-xl border p-6">
        <h2 className="font-semibold">Belum ada undangan</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Undangan usaha Anda akan muncul di sini.
        </p>
      </div>
    );

  return (
    <ul aria-label="Undangan usaha" className="space-y-4">
      {invitations.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} />
      ))}
    </ul>
  );
}
