import "server-only";
import { z } from "zod";
import {
  BusinessError,
  type ActionResult,
  type BusinessErrorCode,
} from "../types/business";

const MESSAGES: Record<BusinessErrorCode, string> = {
  not_member: "Anda tidak memiliki akses ke usaha ini.",
  owner_required: "Hanya pemilik usaha yang dapat melakukan tindakan ini.",
  missing_email: "Email akun tidak tersedia. Silakan masuk kembali.",
  invite_unavailable:
    "Undangan tidak tersedia, sudah diproses, atau sudah kedaluwarsa.",
  already_member: "Email ini sudah menjadi anggota usaha.",
  already_invited: "Undangan aktif untuk email ini sudah ada.",
  cannot_invite_self: "Anda sudah menjadi pemilik usaha ini.",
  conflict: "Data baru saja berubah. Muat ulang halaman lalu coba lagi.",
};

/**
 * Turns any error thrown by a business service into a safe message.
 * - BusinessError → its known Indonesian message
 * - invalid form  → the first validation message
 * - anything else → a generic message (details stay in the server log only)
 */
export function toErrorResult(error: unknown): ActionResult {
  if (error instanceof BusinessError)
    return { status: "error", message: MESSAGES[error.code] };

  if (error instanceof z.ZodError)
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Periksa data formulir.",
    };

  console.error("[business] request failed", { code: safeErrorCode(error) });
  return {
    status: "error",
    message: "Data usaha belum dapat disimpan. Periksa koneksi lalu coba lagi.",
  };
}

/** Logs only a short error code like "P2002", never the message (it may hold secrets). */
function safeErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9_]{1,40}$/.test(error.code)
  )
    return error.code;
  return "UNEXPECTED";
}
