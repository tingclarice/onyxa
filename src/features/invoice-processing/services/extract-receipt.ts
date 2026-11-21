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
): Promise<ScanReceipt> {
  const image = await dependencies.imageSource.load(imageUrl);
  return extractReceipt(image, dependencies.extractor);
}

export async function extractReceipt(
  image: ReceiptImage,
  extractor: ReceiptExtractionProvider,
): Promise<ScanReceipt> {
  const candidate = await extractor.extract(image);
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
