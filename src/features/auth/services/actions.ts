"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthGateway, AuthResult } from "@/features/auth/types/auth";
import { login, signup, confirmEmail, signout } from "@/features/auth/services/authentication";
import { createAuthGateway } from "@/features/auth/services/supabase-auth";

async function runAuth(operation: (gateway: AuthGateway) => Promise<AuthResult>): Promise<AuthResult> {
  try {
    return await operation(await createAuthGateway());
  } catch {
    return { status: "error", message: "Layanan autentikasi belum dapat dihubungi. Silakan coba lagi." };
  }
}

export async function loginAction(input: unknown): Promise<AuthResult> {
  const result = await runAuth((gateway) => login(input, gateway));
  if (result.status === "authenticated") revalidatePath("/", "layout");
  return result;
}

export async function signupAction(input: unknown): Promise<AuthResult> {
  const result = await runAuth((gateway) => signup(input, gateway));
  if (result.status === "authenticated") revalidatePath("/", "layout");
  return result;
}

export async function confirmEmailAction(_state: AuthResult | null, formData: FormData): Promise<AuthResult> {
  const tokenHash = formData instanceof FormData ? formData.get("token_hash") : null;
  const result = await runAuth((gateway) => confirmEmail(tokenHash, gateway));
  if (result.status === "authenticated") {
    revalidatePath("/", "layout");
    redirect("/beranda");
  }
  return result;
}

export async function signOutAction(): Promise<AuthResult> {
  const result = await runAuth(signout);
  if (result.status === "signed-out") {
    revalidatePath("/", "layout");
    redirect("/masuk");
  }
  return result;
}
