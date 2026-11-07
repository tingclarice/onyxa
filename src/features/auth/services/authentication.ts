import { z } from "zod";
import {
  createAuthSchema,
  type AuthGateway,
  type AuthResult,
} from "@/features/auth/types/auth";
import { authError } from "../core/auth-result";

export async function login(
  input: unknown,
  gateway: AuthGateway,
): Promise<AuthResult> {
  const parsed = createAuthSchema("login").safeParse(input);
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const result = await gateway.signIn({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (result.errorCode || !result.hasSession)
    return authError(result.errorCode ?? "missing_session");
  return { status: "authenticated", message: "Berhasil masuk." };
}

export async function signup(
  input: unknown,
  gateway: AuthGateway,
): Promise<AuthResult> {
  const parsed = createAuthSchema("signup").safeParse(input);
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  if (!name) return { status: "error", message: "Nama harus diisi." };
  const result = await gateway.signUp({ name, email, password });
  if (result.errorCode) return authError(result.errorCode);
  return result.hasSession
    ? { status: "authenticated", message: "Akun berhasil dibuat." }
    : {
        status: "confirmation-required",
        message: "Periksa email Anda untuk mengonfirmasi akun, lalu masuk.",
      };
}

export async function confirmEmail(
  input: unknown,
  gateway: AuthGateway,
): Promise<AuthResult> {
  const parsed = z.string().min(1).max(2048).safeParse(input);
  if (!parsed.success) return authError("otp_expired");
  const result = await gateway.confirmEmail(parsed.data);
  if (result.errorCode || !result.hasSession)
    return authError(result.errorCode ?? "otp_expired");
  return { status: "authenticated", message: "Email berhasil dikonfirmasi." };
}

export async function signout(gateway: AuthGateway): Promise<AuthResult> {
  const result = await gateway.signOut();
  return result.errorCode
    ? authError(result.errorCode)
    : { status: "signed-out", message: "Berhasil keluar." };
}
