import { ScanReceiptSchema, type ScanReceipt } from "@/lib/contracts/scan";

const scanEndpoint = "/api/scan";

export async function scanReceipt(file: File): Promise<ScanReceipt> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(scanEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json();
    const message =
      typeof errorBody === "object" &&
      errorBody !== null &&
      "error" in errorBody &&
      typeof errorBody.error === "string"
        ? errorBody.error
        : "Gagal memproses struk.";

    throw new Error(message);
  }

  return ScanReceiptSchema.parse(await response.json());
}
