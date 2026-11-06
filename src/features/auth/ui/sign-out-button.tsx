"use client";

import { useActionState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/services/actions";
import type { AuthResult } from "@/features/auth/types/auth";

export function SignOutButton() {
  const queryClient = useQueryClient();
  const [state, action, isPending] = useActionState<AuthResult | null>(signOutAction, null);
  return (
    <form action={action} onSubmit={() => queryClient.clear()} className="flex flex-col items-end gap-2">
      <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
        {isPending ? "Keluar..." : "Keluar"}
      </Button>
      {state?.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    </form>
  );
}
