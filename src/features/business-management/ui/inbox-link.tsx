"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InboxLink({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative size-11 shrink-0"
    >
      <Link
        href="/inbox"
        aria-label={pendingCount ? `Inbox, ${pendingCount} undangan` : "Inbox"}
      >
        <Inbox aria-hidden="true" className="size-5" />
        {pendingCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1 text-xs font-semibold text-emerald-900"
          >
            {pendingCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
