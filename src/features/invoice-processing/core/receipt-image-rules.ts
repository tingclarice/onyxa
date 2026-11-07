import {
  MAX_RECEIPT_IMAGE_BYTES,
  SUPPORTED_RECEIPT_IMAGE_TYPES,
  type ScanReceiptErrorCode,
} from "../types/scan";

export interface ReceiptImageProblem {
  code: Extract<ScanReceiptErrorCode, "unreadable_image" | "file_too_large">;
  message: string;
}

/**
 * Checks a photo before it is uploaded.
 * Returns null when it is fine, otherwise what is wrong with it.
 * Used in the browser (instant feedback) AND on the server (trusted check).
 */
export function getReceiptImageProblem(image: {
  type: string;
  size: number;
}): ReceiptImageProblem | null {
  if (image.size > MAX_RECEIPT_IMAGE_BYTES)
    return {
      code: "file_too_large",
      message: "Ukuran foto maksimal 8 MB. Pilih foto yang lebih kecil.",
    };

  const isSupportedType = SUPPORTED_RECEIPT_IMAGE_TYPES.some(
    (type) => type === image.type,
  );
  if (!isSupportedType || image.size === 0)
    return {
      code: "unreadable_image",
      message: "Format foto belum didukung. Gunakan JPG, PNG, WebP, atau HEIC.",
    };

  return null;
}
