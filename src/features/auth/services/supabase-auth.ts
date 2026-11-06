import "server-only";
import type { AuthGateway } from "@/features/auth/types/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createAuthGateway(): Promise<AuthGateway> {
  const supabase = await createSupabaseServerClient(true);
  return {
    async signIn(credentials) {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      return { errorCode: error?.code ?? (error ? "auth_failed" : null), hasSession: Boolean(data.session) };
    },
    async signUp({ email, password, name, businessName }) {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name, business_name: businessName } },
      });
      return { errorCode: error?.code ?? (error ? "auth_failed" : null), hasSession: Boolean(data.session) };
    },
    async confirmEmail(tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      return { errorCode: error?.code ?? (error ? "auth_failed" : null), hasSession: Boolean(data.session) };
    },
    async signOut() {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      return { errorCode: error?.code ?? (error ? "auth_failed" : null) };
    },
  };
}
