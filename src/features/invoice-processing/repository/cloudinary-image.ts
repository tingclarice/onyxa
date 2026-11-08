import "server-only";

import {
  MAX_RECEIPT_IMAGE_BYTES,
  SUPPORTED_RECEIPT_IMAGE_TYPES,
  ScanReceiptError,
  type ReceiptImage,
} from "@/features/invoice-processing/types/scan";

type ReceiptImageMimeType = (typeof SUPPORTED_RECEIPT_IMAGE_TYPES)[number];

function isSupportedMimeType(value: string): value is ReceiptImageMimeType {
  return SUPPORTED_RECEIPT_IMAGE_TYPES.some((mimeType) => mimeType === value);
}

function getCloudinaryCloudName(): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !/^[a-z0-9-]+$/i.test(cloudName)) {
    throw new ScanReceiptError(
      "Penyimpanan Cloudinary belum disiapkan. Minta pengelola aplikasi memeriksa pengaturannya.",
      "cloudinary_not_configured",
    );
  }

  return cloudName;
}

function isValidCloudinaryReceiptUrl(imageUrl: string, cloudName: string): boolean {
  if (imageUrl.length > 2048) return false;

  try {
    const url = new URL(imageUrl);
    const path = url.pathname.split("/");

    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "" &&
      path[0] === "" &&
      path[1] === cloudName &&
      path[2] === "image" &&
      path[3] === "upload" &&
      path.length >= 5 &&
      path.slice(4).every((segment) => segment !== "")
    );
  } catch {
    return false;
  }
}

function getContentType(response: Response): ReceiptImageMimeType {
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();

  if (!contentType || !isSupportedMimeType(contentType)) {
    throw new ScanReceiptError(
      "Cloudinary tidak mengirim foto nota dalam format gambar yang didukung.",
      "unreadable_image",
    );
  }

  return contentType;
}

async function readImageBody(response: Response): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_RECEIPT_IMAGE_BYTES) {
      throw new ScanReceiptError(
        "Ukuran foto maksimal 8 MB. Pilih foto yang lebih kecil.",
        "file_too_large",
      );
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ScanReceiptError(
      "Foto dari Cloudinary tidak dapat dibaca. Coba unggah ulang nota.",
      "cloudinary_image_unavailable",
    );
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RECEIPT_IMAGE_BYTES) {
        await reader.cancel();
        throw new ScanReceiptError(
          "Ukuran foto maksimal 8 MB. Pilih foto yang lebih kecil.",
          "file_too_large",
        );
      }

      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ScanReceiptError) throw error;
    throw new ScanReceiptError(
      "Foto dari Cloudinary tidak dapat dibaca. Coba unggah ulang nota.",
      "cloudinary_image_unavailable",
    );
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (bytes.byteLength === 0) {
    throw new ScanReceiptError(
      "Foto dari Cloudinary kosong atau tidak dapat dibaca.",
      "unreadable_image",
    );
  }

  return bytes;
}

export async function fetchCloudinaryReceiptImage(
  imageUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<ReceiptImage> {
  const cloudName = getCloudinaryCloudName();
  if (!isValidCloudinaryReceiptUrl(imageUrl, cloudName)) {
    throw new ScanReceiptError(
      "Alamat foto nota tidak valid. Pilih foto nota dari Cloudinary.",
      "cloudinary_image_invalid",
    );
  }

  let response: Response;
  try {
    response = await fetcher(imageUrl, {
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new ScanReceiptError(
      "Foto di Cloudinary tidak dapat diakses. Coba unggah ulang nota.",
      "cloudinary_image_unavailable",
    );
  }

  if (!response.ok) {
    throw new ScanReceiptError(
      "Foto di Cloudinary tidak dapat diakses. Coba unggah ulang nota.",
      "cloudinary_image_unavailable",
    );
  }

  const mimeType = getContentType(response);
  return {
    bytes: await readImageBody(response),
    mimeType,
  };
}
