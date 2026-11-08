import type { Invitation } from "../types/business";
import { RevokeInvitationForm } from "./business-forms";

/** Owner view: invitations not answered yet, each with a cancel button. */
export function PendingInvitationList({
  invitations,
}: {
  invitations: Invitation[];
}) {
  return (
    <section className="space-y-3" aria-labelledby="sent-invitations">
      <h3 id="sent-invitations" className="font-semibold">
        Undangan menunggu ({invitations.length})
      </h3>
      {invitations.length ? (
        <ul className="divide-y">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="space-y-3 py-4">
              <p className="break-all text-sm">{invitation.email}</p>
              <RevokeInvitationForm invitation={invitation} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tidak ada undangan yang menunggu.
        </p>
      )}
    </section>
  );
}
