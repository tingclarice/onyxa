import { Suspense, type ReactNode } from "react";
import { AppNavigation } from "@/components/app-navigation";
import { requireUser } from "@/features/auth/server";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { QueryProvider } from "@/components/query-provider";
import { DemoNotice } from "@/components/demo-notice";
import { getBusinessWorkspace } from "@/features/business-management/server";
import { BusinessMenu } from "@/features/business-management/ui/business-menu";
import { BusinessOnboarding } from "@/features/business-management/ui/onboarding";
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
        <Suspense
          fallback={
            <aside
              aria-hidden="true"
              className="hidden w-64 shrink-0 border-r border-sidebar-border md:block"
            />
          }
        >
          <AppNavigation businessReady={Boolean(workspace.active)} />
        </Suspense>
        <div className="min-w-0 flex-1 pb-20 md:pb-0">
          <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 py-2 sm:px-8">
            <p className="min-w-0 truncate text-sm font-medium">
              {workspace.active?.business.name ?? "Akun Onyxa"}
            </p>
            <BusinessMenu
              email={workspace.actor.email}
              memberships={workspace.memberships}
              activeBusinessId={workspace.active?.businessId}
              invitations={workspace.invitations}
              accountActions={<SignOutButton />}
            />
          </header>
          <main>
            {workspace.active ? (
              <>
                <DemoNotice />
                {children}
              </>
            ) : (
              <BusinessOnboarding
                invitations={workspace.invitations}
                email={workspace.actor.email}
              />
            )}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
