"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  Package,
  ScanLine,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/beranda", label: "Beranda", icon: LayoutDashboard },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/transaksi", label: "Transaksi", icon: ClipboardList },
  { href: "/barang", label: "Barang", icon: Package },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

export function AppNavigation({
  businessReady = true,
}: {
  businessReady?: boolean;
}) {
  const pathname = usePathname();
  if (!businessReady) return null;
  const items = navigationItems;

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <Link
          href="/"
          className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6 text-xl font-bold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            O
          </span>
          Onyxa
        </Link>
        <nav aria-label="Navigasi utama" className="flex flex-col gap-1 p-4">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium leading-none",
                  isActive ? "text-accent" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
