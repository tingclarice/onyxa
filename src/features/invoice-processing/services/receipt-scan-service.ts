import {
  ScanReceiptResultSchema,
  ScanReceiptSchema,
  type ScanReceiptResult,
  type UploadReceiptImageResult,
} from "../types/scan";
import { getReceiptImageProblem } from "../core/receipt-image-rules";
import {
  CloudinaryUploadError,
  isOurCloudinaryImageUrl,
  uploadImageToCloudinary,
} from "../repository/receipt-image-storage";
import { readReceiptFromImage } from "../repository/demo-receipt-reader";

/**
 * Step 1 of scanning: check the photo and store it.
 * Returns the stored image address, or a safe error the screen can show.
 */
export async function uploadReceiptPhoto(
  file: File,
): Promise<UploadReceiptImageResult> {
  const problem = getReceiptImageProblem(file);
  if (problem) return { ok: false, ...problem };

  try {
    const imageUrl = await uploadImageToCloudinary(file);
    return { ok: true, imageUrl };
  } catch (error) {
    if (error instanceof CloudinaryUploadError)
      return { ok: false, code: error.code, message: error.message };
    throw error;
  }
}

/**
 * Step 2 of scanning: read the receipt from the stored photo.
 * Without a photo, the demo still returns a sample receipt.
 */
export async function scanReceipt(
  imageUrl: string | undefined,
): Promise<ScanReceiptResult> {
  if (imageUrl && !isOurCloudinaryImageUrl(imageUrl))
    throw new Error("Alamat foto Cloudinary tidak valid.");

  const receipt = ScanReceiptSchema.parse(await readReceiptFromImage(imageUrl));

  return ScanReceiptResultSchema.parse({
    receipt,
    ...(imageUrl ? { imageUrl } : {}),
  });
}
