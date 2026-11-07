import "server-only";
import { getBusinessWorkspace, getSettings } from "./queries";
import {
  AlertPreferencesForm,
  BusinessProfileForm,
  BusinessSwitcher,
  InviteMemberForm,
  RevokeInvitationForm,
} from "./business-forms";

export async function BusinessSettingsPage() {
  const workspace = await getBusinessWorkspace();
  if (!workspace.active) return null;
  const { membership, members, invitations } = await getSettings();
  const owner = membership.role === "OWNER";
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan usaha</h1>
        <p className="text-sm text-muted-foreground">
          {membership.business.name} · {owner ? "Pemilik" : "Staf"}
        </p>
      </header>
      <BusinessSwitcher
        memberships={workspace.memberships}
        activeBusinessId={membership.businessId}
      />
      {!owner && (
        <p className="rounded-xl border p-4 text-sm">
          Hanya pemilik yang dapat mengubah profil, peringatan, dan undangan
          tim.
        </p>
      )}
      <section
        className="grid items-start gap-6 border-b pb-8 lg:grid-cols-[1fr_1.4fr]"
        aria-labelledby="profile-heading"
      >
        <div className="space-y-2">
          <h2 id="profile-heading" className="text-lg font-semibold">
            Profil usaha
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Informasi ini dibagikan kepada anggota usaha Anda.
          </p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-5">
          <BusinessProfileForm business={membership.business} owner={owner} />
        </div>
      </section>
      <section
        className="grid items-start gap-6 border-b pb-8 lg:grid-cols-[1fr_1.4fr]"
        aria-labelledby="team-heading"
      >
        <div className="space-y-2">
          <h2 id="team-heading" className="text-lg font-semibold">
            Anggota usaha
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {members.length} anggota memiliki akses. Undangan tidak memberi
            akses sebelum diterima.
          </p>
        </div>
        <div className="space-y-6">
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
          {owner && (
            <div className="rounded-2xl bg-muted/50 p-5">
              <h3 className="mb-4 font-semibold">Undang staf</h3>
              <InviteMemberForm businessId={membership.businessId} />
            </div>
          )}
          {owner && (
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
          )}
        </div>
      </section>
      <section
        className="grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]"
        aria-labelledby="alerts-heading"
      >
        <div className="space-y-2">
          <h2 id="alerts-heading" className="text-lg font-semibold">
            Peringatan
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Simpan preferensi harga dan pola pembelian untuk usaha ini.
          </p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-5">
          <AlertPreferencesForm business={membership.business} owner={owner} />
        </div>
      </section>
    </div>
  );
}
