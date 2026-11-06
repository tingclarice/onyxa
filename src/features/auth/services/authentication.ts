import { z } from "zod";
import { createAuthSchema, type AuthGateway, type AuthResult } from "@/features/auth/types/auth";

function authError(code: string): AuthResult {
  let message = "Autentikasi gagal. Silakan coba lagi.";
  if (code === "invalid_credentials") message = "Email atau password salah.";
  if (code === "email_not_confirmed") message = "Konfirmasi email Anda sebelum masuk.";
  if (code === "weak_password") message = "Password belum memenuhi ketentuan keamanan.";
  if (code === "otp_expired") message = "Tautan konfirmasi tidak valid atau sudah kedaluwarsa.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    message = "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.";
  }
  return { status: "error", message };
}

export async function login(input: unknown, gateway: AuthGateway): Promise<AuthResult> {
  const parsed = createAuthSchema("login").safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const result = await gateway.signIn({ email: parsed.data.email, password: parsed.data.password });
  if (result.errorCode || !result.hasSession) return authError(result.errorCode ?? "missing_session");
  return { status: "authenticated", message: "Berhasil masuk." };
}

export async function signup(input: unknown, gateway: AuthGateway): Promise<AuthResult> {
  const parsed = createAuthSchema("signup").safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { name, businessName, email, password } = parsed.data;
  if (!name || !businessName) return { status: "error", message: "Nama dan nama usaha harus diisi." };
  const result = await gateway.signUp({ name, businessName, email, password });
  if (result.errorCode) return authError(result.errorCode);
  return result.hasSession
    ? { status: "authenticated", message: "Akun berhasil dibuat." }
    : { status: "confirmation-required", message: "Periksa email Anda untuk mengonfirmasi akun, lalu masuk." };
}

export async function confirmEmail(input: unknown, gateway: AuthGateway): Promise<AuthResult> {
  const parsed = z.string().min(1).max(2048).safeParse(input);
  if (!parsed.success) return authError("otp_expired");
  const result = await gateway.confirmEmail(parsed.data);
  if (result.errorCode || !result.hasSession) return authError(result.errorCode ?? "otp_expired");
  return { status: "authenticated", message: "Email berhasil dikonfirmasi." };
}

export async function signout(gateway: AuthGateway): Promise<AuthResult> {
  const result = await gateway.signOut();
  return result.errorCode
    ? authError(result.errorCode)
    : { status: "signed-out", message: "Berhasil keluar." };
}
