import "server-only";
import type { AuthGateway, AuthResult } from "../types/auth";
import { createAuthGateway } from "../repository/supabase-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function runAuth(
  operation: (gateway: AuthGateway) => Promise<AuthResult>,
): Promise<AuthResult> {
  try {
    return await operation(
      createAuthGateway(await createSupabaseServerClient(true)),
    );
  } catch {
    console.error(
      "[auth] authentication service could not complete the request",
    );
    return {
      status: "error",
      message: "Layanan autentikasi belum dapat dihubungi. Silakan coba lagi.",
    };
  }
}
