import { ScanReceiptSchema, type ScanReceipt } from "@/lib/contracts/scan";

const scanEndpoint = "/api/scan";

export type ScanReceiptErrorCode =
  | "unreadable_image"
  | "duplicate_receipt"
  | "upload_failed";

export class ScanReceiptError extends Error {
  constructor(
    message: string,
    readonly code: ScanReceiptErrorCode,
  ) {
    super(message);
    this.name = "ScanReceiptError";
  }
}

export async function scanReceipt(file?: File): Promise<ScanReceipt> {
  const formData = file ? new FormData() : undefined;
  if (file && formData) {
    formData.append("file", file);
  }

  const response = await fetch(scanEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);
    const message = getErrorMessage(errorBody);
    const code = getErrorCode(errorBody);
    throw new ScanReceiptError(message, code);
  }

  return ScanReceiptSchema.parse(await response.json());
}

function getErrorMessage(errorBody: unknown): string {
  if (
    typeof errorBody === "object" &&
    errorBody !== null &&
    "error" in errorBody &&
    typeof errorBody.error === "string"
  ) {
    return errorBody.error;
  }

  return "Gagal memproses struk.";
}

function getErrorCode(errorBody: unknown): ScanReceiptErrorCode {
  if (
    typeof errorBody === "object" &&
    errorBody !== null &&
    "code" in errorBody
  ) {
    if (errorBody.code === "unreadable_image") return "unreadable_image";
    if (errorBody.code === "duplicate_receipt") return "duplicate_receipt";
  }
  return "upload_failed";
}
