import type { ReactNode } from "react";
import { AppNavigation } from "@/components/app-navigation";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh md:flex">
      <AppNavigation />
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
