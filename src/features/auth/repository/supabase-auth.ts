import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthGateway, AuthUser } from "../types/auth";
import type { SupabaseDatabase } from "@/lib/supabase/config";

function errorCode(
  error: { code?: string; status?: number; name: string } | null,
  operation: "login" | "signup" | "confirm" | "logout",
): string | null {
  if (!error) return null;
  const code =
    error.code ??
    (error.name === "AuthRetryableFetchError"
      ? "network_error"
      : "auth_failed");
  // Only provider codes/statuses are logged; messages can contain private details.
  console.error("[auth] provider request failed", {
    operation,
    code,
    status: error.status,
  });
  return code;
}

export async function readAuthUser(
  supabase: SupabaseClient<SupabaseDatabase>,
): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    emailVerified: Boolean(data.user.email_confirmed_at),
  };
}

export function createAuthGateway(
  supabase: SupabaseClient<SupabaseDatabase>,
): AuthGateway {
  return {
    async signIn(credentials) {
      const { data, error } =
        await supabase.auth.signInWithPassword(credentials);
      return {
        errorCode: errorCode(error, "login"),
        hasSession: Boolean(data.session),
      };
    },
    async signUp({ email, password, name }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      return {
        errorCode: errorCode(error, "signup"),
        hasSession: Boolean(data.session),
      };
    },
    async confirmEmail(tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      return {
        errorCode: errorCode(error, "confirm"),
        hasSession: Boolean(data.session),
      };
    },
    async signOut() {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      return { errorCode: errorCode(error, "logout") };
    },
  };
}
