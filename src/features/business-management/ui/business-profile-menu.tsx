"use client";

import Link from "next/link";
import { ChevronDown, Settings } from "lucide-react";
import { Popover } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BusinessAvatar } from "./business-avatar";

export function BusinessProfileMenu({
  name,
  imageUrl,
  accountActions,
}: {
  name: string;
  imageUrl: string | null;
  accountActions: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          className="h-auto min-h-12 min-w-0 max-w-64 gap-2 px-2"
          aria-label={`Menu usaha ${name}`}
        >
          <BusinessAvatar imageUrl={imageUrl} size={32} />
          <span className="truncate">{name}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label="Menu usaha"
          className="z-50 w-48 space-y-1 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-md"
        >
          <Popover.Close asChild>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/pengaturan">
                <Settings aria-hidden="true" />
                Pengaturan
              </Link>
            </Button>
          </Popover.Close>
          {accountActions}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
