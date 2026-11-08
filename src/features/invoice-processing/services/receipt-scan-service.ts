import {
  ScanReceiptError,
  ScanReceiptResultSchema,
  ScanReceiptSchema,
  type ReceiptExtractionProvider,
  type ReceiptImageSource,
  type ScanReceiptResult,
  type UploadReceiptImageResult,
} from "../types/scan";
import type { ReceiptImageUploader } from "../types/ports";
import { getReceiptImageProblem } from "../core/receipt-image-rules";
import { extractReceiptFromImageUrl } from "./extract-receipt";

/**
 * Step 1 of scanning: check the photo and store it.
 * Returns the stored image address, or a safe error the screen can show.
 */
export async function uploadReceiptPhoto(
  file: File,
  imageUploader: ReceiptImageUploader,
): Promise<UploadReceiptImageResult> {
  const problem = getReceiptImageProblem(file);
  if (problem) return { ok: false, ...problem };
  return imageUploader.upload(file);
}

/**
 * Step 2 of scanning: read the receipt from the stored photo.
 * Without a photo, the demo still returns a sample receipt.
 */
export async function scanReceipt(
  imageUrl: string | undefined,
  dependencies: {
    readonly readDemoReceipt: () => Promise<unknown>;
    readonly imageSource: ReceiptImageSource;
    readonly extractor: ReceiptExtractionProvider;
  },
): Promise<ScanReceiptResult> {
  const candidate = imageUrl
    ? await extractReceiptFromImageUrl(imageUrl, dependencies)
    : await dependencies.readDemoReceipt();
  const parsedReceipt = ScanReceiptSchema.safeParse(candidate);
  if (!parsedReceipt.success) {
    throw new ScanReceiptError(
      "Hasil pembacaan nota belum sesuai format. Coba unggah ulang foto.",
      "invalid_model_output",
    );
  }

  return ScanReceiptResultSchema.parse({
    receipt: parsedReceipt.data,
    ...(imageUrl ? { imageUrl } : {}),
  });
}
