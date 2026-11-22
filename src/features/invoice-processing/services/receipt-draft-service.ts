import { createHash } from "node:crypto";
import { listActiveReceiptCatalog } from "../repository/receipt-catalog-repository";
import { isOurCloudinaryImageUrl } from "@/lib/cloudinary-images";
import {
  discardOwnedDraft, findPreviouslyApprovedDraft, findDraftBySource, findOwnedDraft,
  listOwnedDrafts, storeExtractedDraft, takeDraftForApproval,
} from "../repository/receipt-draft-repository";
import { bindReceiptTransaction, receiptSaveRepository } from "../repository/receipt-save-adapter";
import { getReceiptImageProblem } from "../core/receipt-image-rules";
import {
  ReceiptDraftError, ReceiptDraftReferenceSchema, ScanReceiptError, type DraftOwner,
} from "../types/scan";
import { runInPostgresTransaction } from "@/lib/database-transaction";
import { saveReviewedReceipt, validateReceiptForSaving, saveReceiptInTransaction } from "./receipt-save-service";
import { scanReceipt, uploadAndScanReceipt } from "./receipt-scan-service";

export async function extractAndStoreDraft(owner: DraftOwner, source: string | File, ref: string, replaceId?: string) {
  if (typeof source === "string") {
    if (!isOurCloudinaryImageUrl(source)) throw new ScanReceiptError("Alamat foto Cloudinary tidak valid.", "cloudinary_image_invalid");
  } else {
    const problem = getReceiptImageProblem(source);
    if (problem) throw new ScanReceiptError(problem.message, problem.code);
  }

  const key = createHash("sha256").update(typeof source === "string" ? source : new Uint8Array(await source.arrayBuffer())).digest("hex");
  const existing = await findDraftBySource(owner, key);
  if (existing && (!replaceId || existing.draftId === replaceId)) return existing;
  if (existing) throw new ReceiptDraftError("Foto ini sudah ada dalam draf lain di halaman scan.");
  const previous = replaceId ? await findOwnedDraft(owner, replaceId) : null;
  if (replaceId && !previous) throw new ReceiptDraftError("Draf tidak tersedia untuk akun ini.");

  const catalog = await listActiveReceiptCatalog(owner.businessId);
  const result = typeof source === "string" ? await scanReceipt(source, ref, catalog) : await uploadAndScanReceipt(source, ref, catalog);
  if (!result.imageUrl) throw new ScanReceiptError("Foto nota belum berhasil disimpan.", "cloudinary_upload_failed");
  try {
    return await storeExtractedDraft(owner, {
      sourceKey: key, name: typeof source === "string" ? result.receipt.supplier_name : source.name,
      imageUrl: result.imageUrl, extraction: result.receipt,
    }, previous ? { id: previous.draftId, previousImageUrl: previous.imageUrl } : undefined);
  } catch (error) {
    if (error instanceof ReceiptDraftError) throw error;
    console.error("[receipt-scan]", { ref, stage: "draft.save", outcome: "failed" });
    throw new ScanReceiptError("Nota sudah dibaca, tetapi draf gagal disimpan ke database. Buka kembali halaman scan untuk memeriksa draf.", "review_storage_failed");
  }
}

export async function getScanDrafts(owner: DraftOwner) {
  return listOwnedDrafts(owner);
}

export async function getScanDraft(owner: DraftOwner, id: string) {
  return findOwnedDraft(owner, id);
}

export async function deleteScanDraft(owner: DraftOwner, id: string) {
  await discardOwnedDraft(owner, id);
}

export async function confirmReceipt(owner: DraftOwner, input: unknown) {
  const { draftId } = ReceiptDraftReferenceSchema.parse(input);
  const imageUrlValidator = { isValid: isOurCloudinaryImageUrl };
  if (!draftId) return saveReviewedReceipt(owner, input, { repository: receiptSaveRepository, imageUrlValidator });

  const reviewed = validateReceiptForSaving(input, imageUrlValidator);
  const { imageUrl } = reviewed;
  if (!imageUrl) throw new ReceiptDraftError("Foto draf belum tersedia. Muat ulang halaman review.");
  return runInPostgresTransaction(async (db) => {
    if (await takeDraftForApproval(owner, draftId, imageUrl, db)) {
      const transaction = bindReceiptTransaction(owner.businessId, db, draftId);
      return saveReceiptInTransaction(owner, reviewed, transaction);
    }
    const approved = await findPreviouslyApprovedDraft(owner, draftId, db);
    if (approved) return approved;
    throw new ReceiptDraftError("Draf sudah dihapus, diganti, atau tidak tersedia untuk akun ini.");
  });
}
