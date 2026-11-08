"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/session-cookies";
import { createAuthSchema, type AuthResult } from "../types/auth";
import { registerAccount } from "../services/account-service";
import { signIn, signOut } from "./authjs";
import { toAuthErrorResult } from "./auth-error-messages";

const SUCCESS: AuthResult = {
  status: "authenticated",
  message: "Anda berhasil masuk.",
};

export async function loginAction(input: unknown): Promise<AuthResult> {
  try {
    const credentials = createAuthSchema("login").parse(input);
    // Auth.js calls loginWithPassword() (see authjs.ts) and sets the session cookie.
    await startSession(credentials);
  } catch (error) {
    return toAuthErrorResult(error);
  }

  await forgetPreviouslySelectedBusiness();
  return SUCCESS;
}

export async function signupAction(input: unknown): Promise<AuthResult> {
  try {
    const credentials = createAuthSchema("signup").parse(input);
    await registerAccount(credentials);
    await startSession(credentials);
  } catch (error) {
    return toAuthErrorResult(error);
  }

  await forgetPreviouslySelectedBusiness();
  return SUCCESS;
}

export async function signOutAction(): Promise<AuthResult> {
  try {
    const response: unknown = await signOut({ redirect: false });
    if (!response) throw new Error("signout_failed");
  } catch (error) {
    return toAuthErrorResult(error);
  }

  await forgetPreviouslySelectedBusiness();
  redirect("/masuk");
}

// ---- helpers used only by the actions above ----

async function startSession(credentials: { email: string; password: string }) {
  const response: unknown = await signIn("credentials", {
    email: credentials.email,
    password: credentials.password,
    redirect: false,
    redirectTo: "/beranda",
  });
  if (typeof response !== "string") throw new Error("missing_session");
}

/** A new login must not reuse the business picked by a previous account. */
async function forgetPreviouslySelectedBusiness() {
  (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
  revalidatePath("/", "layout");
}
