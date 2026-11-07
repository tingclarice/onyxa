import "server-only";

import {
  ScanReceiptError,
  ScanReceiptSchema,
  type ReceiptExtractionProvider,
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
  const candidate = await dependencies.extractor.extract(image);
  const result = ScanReceiptSchema.safeParse(candidate);

  if (!result.success) {
    throw new ScanReceiptError(
      "Hasil pembacaan nota belum sesuai format. Coba unggah ulang foto.",
      "invalid_model_output",
    );
  }

  return result.data;
}
