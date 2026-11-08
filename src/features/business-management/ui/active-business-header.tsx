import type { Membership } from "../types/business";

/** Page title for the home screen: the business name and the user's role. */
export function ActiveBusinessHeader({ membership }: { membership: Membership }) {
  return (
    <header className="space-y-2">
      <p className="text-sm font-medium text-accent">Usaha aktif</p>
      <h1 className="break-words text-2xl font-bold tracking-tight">
        {membership.business.name}
      </h1>
      <p className="text-sm text-muted-foreground">
        Anda masuk sebagai {membership.role === "OWNER" ? "pemilik" : "staf"}.
      </p>
    </header>
  );
}
