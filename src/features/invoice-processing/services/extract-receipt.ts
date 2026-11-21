import {
  ScanReceiptError,
  ScanReceiptSchema,
  type ReceiptExtractionProvider,
  type ReceiptImage,
  type ReceiptImageSource,
  type ScanReceipt,
} from "@/features/invoice-processing/types/scan";

export async function extractReceiptFromImageUrl(
  imageUrl: string,
  dependencies: {
    readonly imageSource: ReceiptImageSource;
    readonly extractor: ReceiptExtractionProvider;
  },
  ref: string = crypto.randomUUID(),
): Promise<ScanReceipt> {
  const start = performance.now();
  let image: ReceiptImage;
  try {
    image = await dependencies.imageSource.load(imageUrl);
  } catch (error) {
    console.warn("[receipt-scan]", { ref, stage: "cloudinary.download", outcome: "failed",
      durationMs: Math.round(performance.now() - start) });
    throw error;
  }
  console.info("[receipt-scan]", { ref, stage: "cloudinary.download", outcome: "ok",
    durationMs: Math.round(performance.now() - start), bytes: image.bytes.byteLength });
  return extractReceipt(image, dependencies.extractor, ref);
}

export async function extractReceipt(
  image: ReceiptImage,
  extractor: ReceiptExtractionProvider,
  ref?: string,
): Promise<ScanReceipt> {
  const candidate = await extractor.extract(image, ref);
  const result = ScanReceiptSchema.safeParse(candidate);

  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".") || "nota";
    throw new ScanReceiptError(
      `JSON dari Gemini tidak sesuai format nota pada kolom ${field} (${issue.code}). Ulangi scan atau catat manual.`,
      "invalid_model_output",
    );
  }

  return result.data;
}
