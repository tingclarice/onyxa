import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/features/auth/types/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readAuthUser } from "../repository/supabase-auth";

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  return readAuthUser(supabase);
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  return user;
}
