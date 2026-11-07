"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthResult } from "@/features/auth/types/auth";
import {
  login,
  signup,
  confirmEmail,
  signout,
} from "@/features/auth/services/authentication";
import { cookies } from "next/headers";
import { runAuth } from "./action-runtime";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/session-cookies";

export async function loginAction(input: unknown): Promise<AuthResult> {
  const result = await runAuth((gateway) => login(input, gateway));
  if (result.status === "authenticated") {
    (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
    revalidatePath("/", "layout");
  }
  return result;
}

export async function signupAction(input: unknown): Promise<AuthResult> {
  const result = await runAuth((gateway) => signup(input, gateway));
  if (result.status === "authenticated") {
    (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
    revalidatePath("/", "layout");
  }
  return result;
}

export async function confirmEmailAction(
  _state: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const tokenHash =
    formData instanceof FormData ? formData.get("token_hash") : null;
  const result = await runAuth((gateway) => confirmEmail(tokenHash, gateway));
  if (result.status === "authenticated") {
    (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
    revalidatePath("/", "layout");
    redirect("/beranda");
  }
  return result;
}

export async function signOutAction(): Promise<AuthResult> {
  const result = await runAuth(signout);
  if (result.status === "signed-out") {
    (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
    revalidatePath("/", "layout");
    redirect("/masuk");
  }
  return result;
}
