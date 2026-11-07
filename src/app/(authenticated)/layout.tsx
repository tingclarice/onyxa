import { Suspense, type ReactNode } from "react";
import { AppNavigation } from "@/components/app-navigation";
import {
  isLocalAuthBypassEnabled,
  requireUser,
} from "@/features/auth/services/session";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<p role="status" className="p-6">Memeriksa sesi...</p>}>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </Suspense>
  );
}

async function AuthenticatedContent({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-dvh md:flex">
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
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        {isLocalAuthBypassEnabled() && (
          <p
            role="status"
            className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
          >
            Mode tes lokal: autentikasi Supabase dilewati. Jangan gunakan
            bypass ini di production.
          </p>
        )}
        <header className="flex justify-end border-b border-border px-4 py-2">
          <SignOutButton />
        </header>
        {children}
      </main>
    </div>
  );
}
