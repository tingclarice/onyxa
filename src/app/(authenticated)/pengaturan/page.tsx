import { SettingsSection } from "@/components/settings-section";
import { Suspense } from "react";
import { requireUser } from "@/features/auth/server";
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

export const instant = true;

/** /pengaturan — account photo and settings for the active business. */
export default function PengaturanPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
      </header>

      <SettingsSection
        id="account-photo-heading"
        title="Foto profil akun"
        description="Foto ini tampil di halaman utama saat Anda masuk."
      >
        <Suspense fallback={<div aria-busy="true" aria-label="Foto profil akun" className="h-24 rounded-2xl bg-muted/50" />}>
          <AccountPhotoSettings />
        </Suspense>
      </SettingsSection>

      <Suspense fallback={<section aria-busy="true" className="space-y-4">
        <h2 className="text-lg font-semibold">Pengaturan usaha</h2>
        <div aria-hidden="true" className="h-24 rounded-2xl bg-muted/50" />
      </section>}>
        <ActiveBusinessSettings />
      </Suspense>
    </div>
  );
}

async function AccountPhotoSettings() {
  const user = await requireUser();
  return (
    <div className="rounded-2xl bg-muted/50 p-5">
      <AccountProfilePhoto key={user.id} name={user.name} imageUrl={user.profileImageUrl} />
    </div>
  );
}

async function ActiveBusinessSettings() {
  const workspace = await getBusinessWorkspace();
  if (!workspace.active) return null;

  let settings: Awaited<ReturnType<typeof getActiveBusinessSettings>>;
  try {
    settings = await getActiveBusinessSettings();
  } catch {
    console.error("[business] settings could not be loaded");
    return (
      <p role="alert" className="rounded-xl border p-4 text-sm">
        Pengaturan usaha belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.
      </p>
    );
  }
  return <BusinessSettings settings={settings} memberships={workspace.memberships} />;
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
      <p className="text-sm text-muted-foreground">
        {business.name} · {canManage ? "Pemilik" : "Staf"}
      </p>
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
