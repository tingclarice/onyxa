import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getActiveBusinessSettings,
  getBusinessWorkspace,
} from "@/features/business-management/server";
import { ActiveBusinessHeader } from "@/features/business-management/ui/active-business-header";
import { TeamSummaryCard } from "@/features/business-management/ui/team-summary-card";

// The layout shows onboarding instead of this page until a business is selected.
export const instant = false;

/** /beranda — home screen of the active business. */
export default async function BerandaPage() {
  const { active } = await getBusinessWorkspace();
  if (!active) return null;

  const { members, invitations, canManage } = await getActiveBusinessSettings();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <ActiveBusinessHeader membership={active} />

      <section className="grid items-start gap-6 lg:grid-cols-2">
        <TeamSummaryCard
          members={members}
          pendingInvitations={invitations}
          canManage={canManage}
        />

        {/* Placeholder until purchases are saved per business. */}
        <div className="space-y-4 rounded-2xl bg-muted/50 p-6">
          <h2 className="text-lg font-semibold">Catatan usaha</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Pencatatan transaksi belum terhubung ke usaha Anda. Halaman scan,
            barang, dan transaksi saat ini menyediakan contoh untuk mencoba
            alurnya.
          </p>
          <Button asChild variant="outline">
            <Link href="/scan">Coba alur scan</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
