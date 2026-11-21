import { uploadImageToCloudinary } from "../repository/receipt-image-storage";
import { fetchCloudinaryReceiptImage } from "../repository/cloudinary-image";
import { createGeminiReceiptExtractor } from "../repository/gemini";
import {
  ScanReceiptError,
  type ScanReceiptResult,
} from "../types/scan";
import { getReceiptImageProblem, isReceiptImageType } from "../core/receipt-image-rules";
import { fillMissingUnitPrices } from "../core/receipt-review-rules";
import { extractReceipt, extractReceiptFromImageUrl } from "./extract-receipt";

/** Read a receipt from a previously uploaded photo. */
export async function scanReceipt(
  imageUrl: string,
  ref: string = crypto.randomUUID(),
): Promise<ScanReceiptResult> {
  const receipt = await extractReceiptFromImageUrl(imageUrl, {
    imageSource: { load: fetchCloudinaryReceiptImage },
    extractor: createGeminiReceiptExtractor(),
  }, ref);
  return { receipt: fillMissingUnitPrices(receipt), imageUrl };
}

/** Store a receipt photo and extract its contents from the same file in parallel. */
export async function uploadAndScanReceipt(file: File, ref: string = crypto.randomUUID()): Promise<ScanReceiptResult> {
  const problem = getReceiptImageProblem(file);
  if (problem) throw new ScanReceiptError(problem.message, problem.code);
  if (!isReceiptImageType(file.type)) {
    throw new ScanReceiptError("Format foto belum didukung.", "unreadable_image");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const [uploaded, receipt] = await Promise.all([
    uploadCameraPhoto(file, ref),
    extractReceipt({ bytes, mimeType: file.type }, createGeminiReceiptExtractor(), ref),
  ]);
  if (!uploaded.ok) throw new ScanReceiptError(uploaded.message, uploaded.code);
  return { receipt: fillMissingUnitPrices(receipt), imageUrl: uploaded.imageUrl };
}

async function uploadCameraPhoto(file: File, ref: string) {
  const start = performance.now();
  let outcome = "failed";
  try {
    const uploaded = await uploadImageToCloudinary(file);
    if (uploaded.ok) outcome = "ok";
    return uploaded;
  } finally {
    console.info("[receipt-scan]", { ref, stage: "cloudinary.upload", outcome,
      durationMs: Math.round(performance.now() - start), bytes: file.size });
  }
}
