import type { Membership } from "../types/business";

/** Everyone with access to the business, with their role. */
export function MemberList({ members }: { members: Membership[] }) {
  return (
    <ul className="divide-y rounded-xl border px-4">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-3 text-sm"
        >
          <span className="min-w-0 break-all">{member.email}</span>
          <span className="text-xs text-muted-foreground">
            {member.role === "OWNER" ? "Pemilik" : "Staf"}
          </span>
        </li>
      ))}
    </ul>
  );
}
