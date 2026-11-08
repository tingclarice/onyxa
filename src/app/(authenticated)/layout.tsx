import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { requireUser } from "@/features/auth/server";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { QueryProvider } from "@/components/query-provider";
import { DemoNotice } from "@/components/demo-notice";
import { getBusinessWorkspace } from "@/features/business-management/server";
import { InboxLink } from "@/features/business-management/ui/inbox-link";
import { BusinessWorkspace } from "@/features/business-management/ui/onboarding";
import { BusinessUnavailable } from "@/features/business-management/ui/business-unavailable";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6">
          Memeriksa sesi...
        </p>
      }
    >
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </Suspense>
  );
}

async function AuthenticatedContent({ children }: { children: ReactNode }) {
  await requireUser();
  let workspace;
  try {
    workspace = await getBusinessWorkspace();
  } catch {
    console.error("[business] workspace could not be loaded");
    return <BusinessUnavailable accountActions={<SignOutButton />} />;
  }
  return (
    <QueryProvider
      key={`${workspace.actor.id}:${workspace.active?.businessId ?? "none"}`}
    >
      <div className="min-h-dvh md:flex">
        {workspace.active && (
          <Suspense
            fallback={
              <aside
                aria-hidden="true"
                className="hidden w-64 shrink-0 border-r border-sidebar-border md:block"
              />
            }
          >
            <AppNavigation />
          </Suspense>
        )}
        <div
          className={`min-w-0 flex-1 ${workspace.active ? "pb-20 md:pb-0" : ""}`}
        >
          <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 py-2 sm:px-8">
            <Link
              href="/beranda"
              className="min-w-0 truncate text-sm font-semibold"
            >
              {workspace.active?.business.name ?? "Onyxa"}
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <InboxLink pendingCount={workspace.invitations.length} />
              <SignOutButton />
            </div>
          </header>
          <main>
            <BusinessWorkspace businessReady={Boolean(workspace.active)}>
              <>
                {workspace.active && <DemoNotice />}
                {children}
              </>
            </BusinessWorkspace>
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
