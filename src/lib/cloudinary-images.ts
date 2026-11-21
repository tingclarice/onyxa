import "server-only";

import { getCloudinaryUploadSettings } from "./cloudinary-settings";
import { z } from "zod";
import { describeCloudinaryUploadError } from "./cloudinary-upload-error";

// Stores images in Cloudinary. Settings come from the server
// environment: CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.

export type ImageUploadResult =
  | { ok: true; imageUrl: string }
  | { ok: false; code: "cloudinary_not_configured" | "cloudinary_upload_failed"; message: string };

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

/** Uploads the photo and returns its https://res.cloudinary.com/... address. */
async function writeImageToCloudinary(file: File): Promise<string> {
  const { cloudName, uploadPreset } = getCloudinaryUploadSettings();

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
    const failure: unknown = await response.json().catch(() => null);
    throw new CloudinaryUploadError(
      describeCloudinaryUploadError(failure, response.status),
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

export async function uploadImageToCloudinary(
  file: File,
): Promise<ImageUploadResult> {
  try {
    return { ok: true, imageUrl: await writeImageToCloudinary(file) };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }
}

/** True only for image addresses in OUR Cloudinary account (never trust a URL from the browser). */
export function isOurCloudinaryImageUrl(imageUrl: string): boolean {
  const { cloudName } = getCloudinaryUploadSettings();
  if (!cloudName) return false;

  try {
    const url = new URL(imageUrl);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      !url.username && !url.password && !url.port && !url.search && !url.hash &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      url.pathname.split("/").slice(4).every(Boolean)
    );
  } catch {
    return false;
  }
}

/** Verify the provider's metadata before persisting an uploaded profile photo. */
export async function isValidCloudinaryProfilePhoto(imageUrl: string): Promise<boolean> {
  if (!isOurCloudinaryImageUrl(imageUrl)) return false;
  const response = await fetch(imageUrl, {
    method: "HEAD",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const bytes = Number(response.headers.get("content-length"));
  const mime = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  return response.ok && Number.isSafeInteger(bytes) && bytes > 0 && bytes <= 8 * 1024 * 1024
    && (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp");
}
