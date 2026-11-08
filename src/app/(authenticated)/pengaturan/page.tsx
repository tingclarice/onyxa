import { SettingsSection } from "@/components/settings-section";
import {
  getActiveBusinessSettings,
  getBusinessWorkspace,
} from "@/features/business-management/server";
import {
  AlertPreferencesForm,
  BusinessProfileForm,
  BusinessSwitcher,
  InviteMemberForm,
} from "@/features/business-management/ui/business-forms";
import { MemberList } from "@/features/business-management/ui/member-list";
import { PendingInvitationList } from "@/features/business-management/ui/pending-invitation-list";

// Workspace identity and membership must resolve before this page is shown.
export const instant = false;

/** /pengaturan — business profile, team, invitations and alert settings. */
export default async function PengaturanPage() {
  const workspace = await getBusinessWorkspace();
  if (!workspace.active) return null;

  const { membership, members, invitations, canManage } =
    await getActiveBusinessSettings();
  const business = membership.business;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan usaha</h1>
        <p className="text-sm text-muted-foreground">
          {business.name} · {canManage ? "Pemilik" : "Staf"}
        </p>
      </header>

      <BusinessSwitcher
        memberships={workspace.memberships}
        activeBusinessId={membership.businessId}
      />

      {!canManage && (
        <p className="rounded-xl border p-4 text-sm">
          Hanya pemilik yang dapat mengubah profil, peringatan, dan undangan
          tim.
        </p>
      )}

      <SettingsSection
        id="profile-heading"
        title="Profil usaha"
        description="Informasi ini dibagikan kepada anggota usaha Anda."
      >
        <div className="rounded-2xl bg-muted/50 p-5">
          <BusinessProfileForm business={business} owner={canManage} />
        </div>
      </SettingsSection>

      <SettingsSection
        id="team-heading"
        title="Anggota usaha"
        description={`${members.length} anggota memiliki akses. Undangan tidak memberi akses sebelum diterima.`}
      >
        <MemberList members={members} />
        {canManage && (
          <>
            <div className="rounded-2xl bg-muted/50 p-5">
              <h3 className="mb-4 font-semibold">Undang staf</h3>
              <InviteMemberForm businessId={membership.businessId} />
            </div>
            <PendingInvitationList invitations={invitations} />
          </>
        )}
      </SettingsSection>

      <SettingsSection
        id="alerts-heading"
        title="Peringatan"
        description="Simpan preferensi harga dan pola pembelian untuk usaha ini."
        last
      >
        <div className="rounded-2xl bg-muted/50 p-5">
          <AlertPreferencesForm business={business} owner={canManage} />
        </div>
      </SettingsSection>
    </div>
  );
}
