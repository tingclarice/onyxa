"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openInvitationAction } from "./actions";
import { ActionMessage } from "./business-forms";

export function InvitationCodeForm({
  readLink = false,
}: {
  readLink?: boolean;
}) {
  const [result, action, pending] = useActionState(openInvitationAction, null);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!readLink) return;
    const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
    if (code && input.current) input.current.value = code;
    // Fragments never reach the server; remove the secret before navigation.
    window.history.replaceState(null, "", window.location.pathname);
  }, [readLink]);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium">
        Kode undangan
      </label>
      <Input
        ref={input}
        id={id}
        name="code"
        required
        minLength={64}
        maxLength={64}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Tempel kode dari pemilik usaha"
        disabled={pending}
      />
      <ActionMessage result={result} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Memeriksa..." : "Buka undangan"}
      </Button>
    </form>
  );
}
