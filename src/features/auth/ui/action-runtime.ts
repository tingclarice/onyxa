import "server-only";
import { AuthError } from "next-auth";
import { z } from "zod";
import { AccountExistsError, type AuthResult } from "../types/auth";

export async function runAuth(
  operation: () => Promise<void>,
): Promise<AuthResult> {
  try {
    await operation();
    return { status: "authenticated", message: "Anda berhasil masuk." };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        status: "error",
        code: "validation_failed",
        message: error.issues[0]?.message ?? "Periksa data formulir.",
      };
    if (error instanceof AccountExistsError)
      return {
        status: "error",
        code: "account_exists",
        message: "Email ini sudah terdaftar. Silakan masuk.",
      };
    if (error instanceof AuthError && error.type === "CredentialsSignin")
      return {
        status: "error",
        code: "invalid_credentials",
        message:
          "Email atau kata sandi salah. Setelah 5 percobaan gagal, tunggu 15 menit.",
      };
    console.error("[auth] account request could not be completed");
    return {
      status: "error",
      code: "auth_unavailable",
      message: "Layanan autentikasi belum tersedia. Silakan coba lagi.",
    };
  }
}
