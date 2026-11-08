import Link from "next/link";
import { getBusinessWorkspace } from "@/features/business-management/server";
import { InvitationInbox } from "@/features/business-management/ui/invitation-inbox";

// Invitations belong to the account, so this works before a business is selected.
export const instant = false;

/** /inbox — business invitations sent to the logged-in user's email. */
export default async function InboxPage() {
  const { invitations } = await getBusinessWorkspace();

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
      </header>

      <InvitationInbox invitations={invitations} />

      <Link
        href="/beranda"
        className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
