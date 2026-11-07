import "server-only";
import type { CookieOptions } from "@supabase/ssr";
import { z } from "zod";

// This client is auth-only. Application tables are accessed through Prisma adapters.
export type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export function getSupabaseConfig() {
  const parsed = z.object({
    url: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)),
    publishableKey: z.string().min(1),
  }).safeParse({
    url: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) throw new Error("Konfigurasi autentikasi belum tersedia.");
  return parsed.data;
}
