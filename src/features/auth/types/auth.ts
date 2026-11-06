import { z } from "zod";

export type AuthMode = "login" | "signup";

export function createAuthSchema(mode: AuthMode) {
  return z.object({
    name: z.string().trim().max(100).optional(),
    email: z.string({ error: "Email harus diisi." }).trim()
      .min(1, "Email harus diisi.").max(254)
      .email("Masukkan alamat email yang benar."),
    password: z.string({ error: "Kata sandi harus diisi." })
      .min(mode === "signup" ? 8 : 1, mode === "signup"
        ? "Kata sandi minimal 8 karakter." : "Kata sandi harus diisi.")
      .max(128, "Kata sandi maksimal 128 karakter."),
    businessName: z.string().trim().max(200).optional(),
  }).superRefine((values, context) => {
    if (mode === "signup" && !values.name) {
      context.addIssue({ code: "custom", path: ["name"], message: "Nama harus diisi." });
    }
    if (mode === "signup" && !values.businessName) {
      context.addIssue({ code: "custom", path: ["businessName"], message: "Nama usaha harus diisi." });
    }
  });
}

export type AuthFormValues = z.infer<ReturnType<typeof createAuthSchema>>;
export type LoginCredentials = Pick<AuthFormValues, "email" | "password">;
export type SignupCredentials = LoginCredentials & { name: string; businessName: string };

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

export interface AuthResult {
  status: "authenticated" | "confirmation-required" | "signed-out" | "error";
  message: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
}
