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
      if (mode === "signup" && !values.name) {
        context.addIssue({
          code: "custom",
          path: ["name"],
          message: "Nama harus diisi.",
        });
      }
    });
}

export type AuthFormValues = z.infer<ReturnType<typeof createAuthSchema>>;
export type LoginCredentials = Pick<AuthFormValues, "email" | "password">;
export type SignupCredentials = LoginCredentials & { name: string };

export interface AuthAttempt {
  errorCode: string | null;
  hasSession: boolean;
}

export interface AuthGateway {
  signIn(credentials: LoginCredentials): Promise<AuthAttempt>;
  signUp(credentials: SignupCredentials): Promise<AuthAttempt>;
  confirmEmail(tokenHash: string): Promise<AuthAttempt>;
  signOut(): Promise<{ errorCode: string | null }>;
}

export type AuthFailureCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "weak_password"
  | "otp_expired"
  | "over_email_send_rate_limit"
  | "over_request_rate_limit"
  | "signup_disabled"
  | "email_provider_disabled"
  | "user_banned"
  | "network_error"
  | "auth_failed"
  | "missing_session"
  | "email_address_not_authorized"
  | "email_address_invalid"
  | "email_exists"
  | "user_already_exists"
  | "captcha_failed"
  | "unexpected_failure"
  | "validation_failed"
  | "request_timeout";

export interface AuthResult {
  status: "authenticated" | "confirmation-required" | "signed-out" | "error";
  message: string;
  code?: AuthFailureCode | "unknown_auth_error";
}

export interface AuthUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
}
