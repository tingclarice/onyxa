import { z } from "zod";

export type AuthMode = "login" | "signup";
export function createAuthSchema(mode: AuthMode) {
  return z
    .object({
      name: z.string().trim().max(100).optional(),
      email: z
        .string({ error: "Email harus diisi." })
        .trim()
        .min(1, "Email harus diisi.")
        .max(254)
        .email("Masukkan alamat email yang benar."),
      password: z
        .string({ error: "Kata sandi harus diisi." })
        .min(
          mode === "signup" ? 8 : 1,
          mode === "signup"
            ? "Kata sandi minimal 8 karakter."
            : "Kata sandi harus diisi.",
        )
        .max(128, "Kata sandi maksimal 128 karakter."),
    })
    .superRefine((values, context) => {
      if (mode === "signup" && !values.name)
        context.addIssue({
          code: "custom",
          path: ["name"],
          message: "Nama harus diisi.",
        });
    });
}
export type AuthFormValues = z.infer<ReturnType<typeof createAuthSchema>>;
export type LoginCredentials = Pick<AuthFormValues, "email" | "password">;
export interface AuthResult {
  status: "authenticated" | "signed-out" | "error";
  message: string;
  code?:
    | "invalid_credentials"
    | "account_exists"
    | "validation_failed"
    | "auth_unavailable";
}
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}
export interface LoginState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}
export interface CredentialAccount extends AuthUser, LoginState {
  passwordHash: string;
  loginVersion: number;
}
export class AccountExistsError extends Error {
  constructor() {
    super("account_exists");
    this.name = "AccountExistsError";
  }
}
