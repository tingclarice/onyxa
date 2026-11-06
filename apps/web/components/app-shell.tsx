"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/masuk" || pathname === "/daftar";

  if (isAuthPage) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="min-h-dvh md:flex">
      <AppNavigation />
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
