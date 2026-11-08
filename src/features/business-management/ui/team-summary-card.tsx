import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Invitation, Membership } from "../types/business";

const MEMBERS_SHOWN = 4;

/** Home-screen card: how many members, a few emails, and a link to settings. */
export function TeamSummaryCard({
  members,
  pendingInvitations,
  canManage,
}: {
  members: Membership[];
  pendingInvitations: Invitation[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-5 rounded-2xl border p-6">
      <h2 className="text-lg font-semibold">Tim usaha</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        {members.length} anggota bergabung
        {canManage ? ` · ${pendingInvitations.length} undangan menunggu` : ""}.
      </p>
      <ul className="space-y-3">
        {members.slice(0, MEMBERS_SHOWN).map((member) => (
          <li className="break-all text-sm" key={member.id}>
            {member.email}
          </li>
        ))}
      </ul>
      <Button asChild variant="outline">
        <Link href="/pengaturan">
          {canManage ? "Kelola tim dan undangan" : "Lihat pengaturan usaha"}
        </Link>
      </Button>
    </div>
  );
}
