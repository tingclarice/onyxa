import "server-only";
import { z } from "zod";
import { cookies } from "next/headers";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/session-cookies";
import {
  BusinessError,
  type ActionResult,
  type BusinessErrorCode,
} from "../types/business";

const messages: Record<BusinessErrorCode, string> = {
  not_member: "Anda tidak memiliki akses ke usaha ini.",
  owner_required: "Hanya pemilik usaha yang dapat melakukan tindakan ini.",
  verify_email: "Konfirmasi email akun Anda terlebih dahulu.",
  invite_unavailable:
    "Undangan tidak tersedia, sudah diproses, atau sudah kedaluwarsa.",
  already_member: "Email ini sudah menjadi anggota usaha.",
  already_invited: "Undangan aktif untuk email ini sudah ada.",
  cannot_invite_self: "Anda sudah menjadi pemilik usaha ini.",
  conflict: "Data baru saja berubah. Muat ulang halaman lalu coba lagi.",
};

export type CommandOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; result: ActionResult };

export async function perform<T>(
  operation: () => Promise<T>,
): Promise<CommandOutcome<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    if (error instanceof BusinessError)
      return {
        ok: false,
        result: { status: "error", message: messages[error.code] },
      };
    if (error instanceof z.ZodError)
      return {
        ok: false,
        result: {
          status: "error",
          message: error.issues[0]?.message ?? "Periksa data formulir.",
        },
      };
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      /^[A-Z0-9_]{1,40}$/.test(error.code)
        ? error.code
        : "UNEXPECTED";
    console.error("[business] request failed", { code });
    return {
      ok: false,
      result: {
        status: "error",
        message:
          "Data usaha belum dapat disimpan. Periksa koneksi lalu coba lagi.",
      },
    };
  }
}

export function fields(formData: FormData): Record<string, FormDataEntryValue> {
  return formData instanceof FormData ? Object.fromEntries(formData) : {};
}

export async function selectBusiness(userId: string, businessId: string) {
  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, `${userId}:${businessId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
