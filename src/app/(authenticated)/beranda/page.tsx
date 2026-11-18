import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  getActiveBusinessSettings,
  getBusinessWorkspace,
} from "@/features/business-management/server";
import { ActiveBusinessHeader } from "@/features/business-management/ui/active-business-header";
import { TeamSummaryCard } from "@/features/business-management/ui/team-summary-card";
import { getActiveBusinessSlowMovingWarnings } from "@/features/inventory-intelligence/server";
import { SlowMovingWarningCard } from "@/features/inventory-intelligence/ui/slow-moving-warning-card";
import { getActiveBusinessPriceFluctuationAlerts } from "@/features/procurement-pricing/server";
import { PriceFluctuationAlertCard } from "@/features/procurement-pricing/ui/price-fluctuation-alert-card";

export const instant = true;

/** /beranda — home screen of the active business. */
export default function BerandaPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <ActiveDashboard />
    </Suspense>
  );
}

async function ActiveDashboard() {
  const { active } = await getBusinessWorkspace();
  if (!active) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <ActiveBusinessHeader membership={active} />

      <Suspense fallback={<DashboardCardLoading title="Fluktuasi Harga Supplier (PPV)" />}>
        <DashboardPriceAlerts />
      </Suspense>

      <Suspense fallback={<DashboardCardLoading title="Peringatan" />}>
        <DashboardInventoryWarnings />
      </Suspense>

      <section className="grid items-start gap-6 lg:grid-cols-2">
        <Suspense fallback={<DashboardCardLoading title="Tim usaha" />}>
          <DashboardTeam />
        </Suspense>

        <div className="space-y-4 rounded-2xl bg-muted/50 p-6">
          <h2 className="text-lg font-semibold">Catat belanja</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Scan nota belanja lalu simpan. Barang dan peringatan melambat
            dihitung dari nota yang sudah disimpan.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/scan">Scan nota</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/scan/review?mode=manual">Catat manual</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Beranda</h1>
      <div aria-hidden="true" className="min-h-32 rounded-2xl border border-border" />
    </div>
  );
}

async function DashboardPriceAlerts() {
  const alerts = await getActiveBusinessPriceFluctuationAlerts();
  return <PriceFluctuationAlertCard alerts={alerts} />;
}

async function DashboardInventoryWarnings() {
  const warnings = await getActiveBusinessSlowMovingWarnings();
  return <SlowMovingWarningCard warnings={warnings} />;
}

async function DashboardTeam() {
  const { members, invitations, canManage } = await getActiveBusinessSettings();
  return (
    <TeamSummaryCard
      members={members}
      pendingInvitations={invitations}
      canManage={canManage}
    />
  );
}

function DashboardCardLoading({ title }: { title: string }) {
  return (
    <section aria-busy="true" className="space-y-4 rounded-2xl border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div aria-hidden="true" className="h-6 w-40 max-w-full rounded bg-muted" />
    </section>
  );
}
