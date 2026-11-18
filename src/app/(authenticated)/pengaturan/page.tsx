import { SettingsSection } from "@/components/settings-section";
import { AccountProfilePhoto } from "@/features/auth/ui/account-profile-photo";
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

/** /pengaturan — account photo and settings for the active business. */
export default async function PengaturanPage() {
  const workspace = await getBusinessWorkspace();
  const businessSettings = workspace.active ? await getActiveBusinessSettings() : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        {businessSettings && (
          <p className="text-sm text-muted-foreground">
            {businessSettings.membership.business.name} · {businessSettings.canManage ? "Pemilik" : "Staf"}
          </p>
        )}
      </header>

      <SettingsSection
        id="account-photo-heading"
        title="Foto profil akun"
        description="Foto ini tampil di halaman utama saat Anda masuk."
        last={!businessSettings}
      >
        <div className="rounded-2xl bg-muted/50 p-5">
          <AccountProfilePhoto
            key={workspace.actor.id}
            name={workspace.actor.name}
            imageUrl={workspace.actor.profileImageUrl}
          />
        </div>
      </SettingsSection>

      {businessSettings && (
        <BusinessSettings
          settings={businessSettings}
          memberships={workspace.memberships}
        />
      )}
    </div>
  );
}

function BusinessSettings({
  settings,
  memberships,
}: {
  settings: Awaited<ReturnType<typeof getActiveBusinessSettings>>;
  memberships: Awaited<ReturnType<typeof getBusinessWorkspace>>["memberships"];
}) {
  const { membership, members, invitations, canManage } = settings;
  const business = membership.business;

  return (
    <>
      <BusinessSwitcher
        memberships={memberships}
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
          <BusinessProfileForm key={business.id} business={business} owner={canManage} />
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
              <InviteMemberForm
                key={invitations.length}
                businessId={membership.businessId}
              />
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
    </>
  );
}
