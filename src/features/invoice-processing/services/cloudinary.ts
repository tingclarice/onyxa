import "server-only";

import { z } from "zod";
import {
  MAX_RECEIPT_IMAGE_BYTES,
  SUPPORTED_RECEIPT_IMAGE_TYPES,
} from "@/features/invoice-processing/types/scan";

const CloudinaryUploadResponseSchema = z.object({
  resource_type: z.literal("image"),
  secure_url: z.url(),
});

export class CloudinaryUploadError extends Error {
  constructor(
    message: string,
    readonly code: "cloudinary_not_configured" | "cloudinary_upload_failed",
  ) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

export async function uploadReceiptImage(file: File): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new CloudinaryUploadError(
      "Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME dan CLOUDINARY_UPLOAD_PRESET di environment server.",
      "cloudinary_not_configured",
    );
  }

  if (!/^[a-z0-9-]+$/i.test(cloudName)) {
    throw new CloudinaryUploadError(
      "Nama cloud Cloudinary tidak valid.",
      "cloudinary_not_configured",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData },
    );
  } catch {
    throw new CloudinaryUploadError(
      "Foto belum berhasil dikirim ke Cloudinary. Periksa koneksi lalu coba lagi.",
      "cloudinary_upload_failed",
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = getCloudinaryErrorMessage(body);
    throw new CloudinaryUploadError(
      message
        ? `Cloudinary menolak foto: ${message}`
        : "Cloudinary belum menerima foto. Periksa upload preset lalu coba lagi.",
      "cloudinary_upload_failed",
    );
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new CloudinaryUploadError(
      "Respons Cloudinary tidak terbaca. Coba unggah lagi.",
      "cloudinary_upload_failed",
    );
  }

  const result = CloudinaryUploadResponseSchema.safeParse(responseBody);
  if (!result.success) {
    throw new CloudinaryUploadError(
      "Respons Cloudinary tidak dikenali. Coba unggah lagi.",
      "cloudinary_upload_failed",
    );
  }

  const imageUrl = new URL(result.data.secure_url);
  if (
    imageUrl.protocol !== "https:" ||
    imageUrl.hostname !== "res.cloudinary.com" ||
    imageUrl.pathname.split("/")[1] !== cloudName
  ) {
    throw new CloudinaryUploadError(
      "Cloudinary memberi alamat foto yang tidak valid.",
      "cloudinary_upload_failed",
    );
  }

  return result.data.secure_url;
}

export function isCloudinaryReceiptUrl(imageUrl: string): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return false;

  try {
    const url = new URL(imageUrl);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.split("/")[1] === cloudName &&
      url.pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

export function validateReceiptImage(file: File):
  | { ok: true }
  | {
      ok: false;
      code: "unreadable_image" | "file_too_large";
      message: string;
    } {
  if (
    !SUPPORTED_RECEIPT_IMAGE_TYPES.some((type) => type === file.type) ||
    file.size === 0 ||
    file.size > MAX_RECEIPT_IMAGE_BYTES
  ) {
    return file.size > MAX_RECEIPT_IMAGE_BYTES
      ? {
          ok: false,
          code: "file_too_large",
          message: "Ukuran foto maksimal 8 MB. Pilih foto yang lebih kecil.",
        }
      : {
          ok: false,
          code: "unreadable_image",
          message:
            "Format foto belum didukung. Gunakan JPG, PNG, WebP, atau HEIC.",
        };
  }

  return { ok: true };
}

function getCloudinaryErrorMessage(body: unknown): string | undefined {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
  ) {
    return body.error.message;
  }

  return undefined;
}
