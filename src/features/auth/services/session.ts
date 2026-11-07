import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/features/auth/types/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const localDevelopmentUser: AuthUser = {
  id: "local-development-auth-bypass",
  email: "local-dev@onyxa.invalid",
};

export function isLocalAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS === "true"
  );
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

export async function requireUser(): Promise<AuthUser> {
  if (isLocalAuthBypassEnabled()) return localDevelopmentUser;

  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  return user;
}
