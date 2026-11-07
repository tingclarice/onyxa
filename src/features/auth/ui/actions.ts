"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ACTIVE_BUSINESS_COOKIE,
  INVITATION_COOKIE,
} from "@/lib/session-cookies";
import { createAuthSchema, type AuthResult } from "../types/auth";
import { signup } from "../services/authentication";
import { createAccountRepository } from "../repository/prisma-accounts";
import { passwords } from "../repository/passwords";
import { signIn, signOut } from "./authjs";
import { runAuth } from "./action-runtime";

export async function loginAction(input: unknown): Promise<AuthResult> {
  const result = await runAuth(async () => {
    const credentials = createAuthSchema("login").parse(input);
    const response: unknown = await signIn("credentials", {
      ...credentials,
      redirect: false,
      redirectTo: "/beranda",
    });
    if (typeof response !== "string") throw new Error("missing_session");
  });
  if (result.status === "authenticated") {
    (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
    revalidatePath("/", "layout");
  }
  return result;
}
export async function signupAction(input: unknown): Promise<AuthResult> {
  const result = await runAuth(async () => {
    const credentials = createAuthSchema("signup").parse(input);
    await signup(credentials, createAccountRepository(), passwords);
    const response: unknown = await signIn("credentials", {
      ...credentials,
      redirect: false,
      redirectTo: "/beranda",
    });
    if (typeof response !== "string") throw new Error("missing_session");
  });
  if (result.status === "authenticated") {
    (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
    revalidatePath("/", "layout");
  }
  return result;
}
export async function signOutAction(): Promise<AuthResult> {
  const result = await runAuth(async () => {
    const response: unknown = await signOut({ redirect: false });
    if (!response) throw new Error("signout_failed");
  });
  if (result.status === "error") return result;
  const jar = await cookies();
  jar.delete(ACTIVE_BUSINESS_COOKIE);
  jar.delete(INVITATION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/masuk");
}
