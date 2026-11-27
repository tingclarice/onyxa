"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfidenceField } from "./review/confidence-field";
import { CurrencyInput } from "./review/currency-input";
import { ReceiptItemRow } from "./review/receipt-item-row";
import { ReceiptItemsTable } from "./review/receipt-items-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ImageUploadButton } from "@/components/ui/image-upload-button";
import { readUploadedReceipt } from "./use-scan-receipt";
import { saveReceiptAction } from "./actions";
import {
  calculateReceiptTotal,
  countFieldsNeedingReview,
  createEmptyReceiptItem,
  getReceiptDiscountError,
  hasDiscount,
  hasTotalMismatch,
  hasUnsavedItemDraft,
  isReceiptComplete,
  sumLineTotals,
  syncReceiptItemTotals,
  validateDraftReceiptItem,
  type ReceiptItemFieldErrors,
} from "../core/receipt-review-rules";
import {
  ScanReceiptError,
  ScanReceiptSchema,
  type ReceiptCatalogItem,
  type StoredReceiptDraft,
  type ScanReceipt,
  type ScanReceiptItem,
} from "../types/scan";
import { formatRupiah } from "@/lib/utils/format";

const emptyReceipt: ScanReceipt = {
  supplier_name: "",
  date: "",
  items: [],
  total: 0,
  overall_confidence: 1,
};

/**
 * The /scan/review screen: loads the scanned receipt (or starts empty in
 * manual mode), provides one persistent Add/Edit item form, and displays
 * added items in a table with live checks from core rules.
 */
export function ReceiptReviewForm({ manual, draft, catalog }: { manual: boolean; draft: StoredReceiptDraft | null; catalog: ReceiptCatalogItem[] }) {
  const router = useRouter();
  const didLoad = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState(draft?.imageUrl);
  const [isSaved, setIsSaved] = useState(false);
  const [receiptReady, setReceiptReady] = useState(Boolean(draft));
  const receiptLoadError = !manual && !draft;
  const [uploadPending, setUploadPending] = useState(false);
  const [draftItem, setDraftItem] = useState<ScanReceiptItem>(createEmptyReceiptItem);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [draftErrors, setDraftErrors] = useState<ReceiptItemFieldErrors>({});
  const [draftReminder, setDraftReminder] = useState("");
  const {
    control,
    register,
    reset,
    setValue,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ScanReceipt>({
    resolver: zodResolver(ScanReceiptSchema),
    defaultValues: draft?.receipt ?? emptyReceipt,
    mode: "onSubmit",
  });
  const { append, update, remove } = useFieldArray({
    control,
    name: "items",
  });
  const values = useWatch({ control });
  const receipt = values as ScanReceipt;
  const items = receipt.items ?? [];
  // Instant on-screen checks, recalculated on every keystroke (rules live in core/).
  const receiptForChecks = { ...receipt, items };
  const itemsTotal = sumLineTotals(items);
  const discounted = hasDiscount(receiptForChecks);
  const calculatedTotal = calculateReceiptTotal(items, receipt.discount);
  const discountError = getReceiptDiscountError(itemsTotal, receipt.discount);
  const invalidDiscount = Boolean(discountError || items.some((item) => Boolean(validateDraftReceiptItem(item).discount)));
  const totalMismatch = hasTotalMismatch(receiptForChecks);
  const flaggedCount = countFieldsNeedingReview(receiptForChecks);
  const receiptComplete = isReceiptComplete(receiptForChecks);
  const hasValidationErrors = invalidDiscount || Object.keys(errors).length > 0;
  const showReceiptPreview = !manual || Boolean(previewUrl);
  const hasDraftInput = hasUnsavedItemDraft(draftItem, editingIndex);

  useEffect(() => {
    if (!manual || didLoad.current) return;
    didLoad.current = true;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    window.setTimeout(() => {
      reset({
        supplier_name: "",
        date: today,
        items: [],
        total: 0,
        overall_confidence: 1,
      });
      setPreviewUrl(undefined);
      setReceiptReady(true);
    }, 0);
  }, [manual, reset]);

  function resetItemEditor(
    nextItem: ScanReceiptItem = createEmptyReceiptItem(),
    nextEditingIndex: number | null = null,
  ) {
    setDraftItem(nextItem);
    setEditingIndex(nextEditingIndex);
    setDraftErrors({});
    setDraftReminder("");
    setEditorRevision((revision) => revision + 1);
  }

  function handleDraftChange(updated: ScanReceiptItem) {
    const synced = syncReceiptItemTotals(draftItem, updated);
    setDraftItem(synced);
    setDraftReminder("");
    if (Object.keys(draftErrors).length > 0) {
      setDraftErrors(validateDraftReceiptItem(synced));
    }
  }

  function commitDraftItem() {
    const validationErrors = validateDraftReceiptItem(draftItem);
    if (Object.keys(validationErrors).length > 0) {
      setDraftErrors(validationErrors);
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, draftItem);
      const nextItems = items.map((entry, index) =>
        index === editingIndex ? draftItem : entry,
      );
      updatePayableTotal(nextItems, receipt.discount);
    } else {
      append(draftItem);
      updatePayableTotal([...items, draftItem], receipt.discount);
    }

    resetItemEditor();
  }

  function startEditingItem(index: number) {
    const target = items[index];
    if (!target) return;
    resetItemEditor(target, index);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function removeItem(index: number) {
    const nextItems = items.filter((_, i) => i !== index);
    updatePayableTotal(nextItems, receipt.discount);
    remove(index);

    if (editingIndex === index) {
      resetItemEditor();
    } else if (editingIndex !== null && index < editingIndex) {
      setEditingIndex(editingIndex - 1);
    }
  }

  function updatePayableTotal(nextItems: ScanReceiptItem[], discount = 0) {
    const nextTotal = calculateReceiptTotal(nextItems, discount);
    if (discounted || discount || nextItems.some((item) => item.discount) ||
        receipt.total === 0 || receipt.total === calculatedTotal) {
      setValue("total", Math.max(0, nextTotal), { shouldDirty: true, shouldValidate: true });
    }
  }

  async function saveReceipt(reviewed: ScanReceipt) {
    if (uploadPending || invalidDiscount) return;
    const result = await saveReceiptAction({
      draftId: draft?.draftId,
      receipt: reviewed,
      imageUrl: previewUrl,
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    reset(getValues());
    setIsSaved(true);
    toast.success(`Struk tersimpan. ${result.itemCount} barang diperbarui.`);
    router.push("/scan");
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasUnsavedItemDraft(draftItem, editingIndex)) {
      const message =
        editingIndex !== null
          ? "Simpan perubahan atau batalkan edit barang di form sebelum menyimpan nota."
          : "Tambahkan barang ke tabel atau bersihkan form sebelum menyimpan nota.";
      setDraftReminder(message);
      toast.warning(message);
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    await handleSubmit(saveReceipt)(event);
  }

  if (receiptLoadError) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">Belum ada hasil scan untuk dicek</h1>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/scan">Scan nota</Link></Button>
          <Button asChild variant="outline">
            <Link href="/scan/review?mode=manual">Catat manual</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!receiptReady) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <LoaderCircle
          aria-hidden="true"
          className="size-8 animate-spin text-accent"
        />
        <p role="status" className="text-base text-muted-foreground">
          Menyiapkan struk untuk dicek...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto w-full px-4 py-5 sm:px-6 md:py-8 ${
        showReceiptPreview ? "max-w-7xl" : "max-w-4xl"
      }`}
    >
      <header className="mb-5 space-y-3 md:mb-7">
        <Link
          href="/scan"
          className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          Kembali ke scan
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {manual ? "Catat nota manual" : "Cek struk belanja"}
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Pastikan nama pemasok, barang, dan jumlahnya sudah benar.
            </p>
          </div>
          {flaggedCount > 0 ? (
            <StatusBadge status="needs-check" />
          ) : isSaved && !isDirty ? (
            <StatusBadge status="saved" />
          ) : null}
        </div>
        <p
          aria-live="polite"
          className="text-base font-medium text-amber-800 dark:text-amber-200"
        >
          {!receiptComplete || hasValidationErrors
            ? "Lengkapi data struk sebelum menyimpan"
            : flaggedCount > 0
              ? `${flaggedCount} bagian perlu dicek`
              : "Semua bagian siap disimpan"}
        </p>
      </header>

      <form onSubmit={handleFormSubmit} noValidate>
        <div
          className={
            showReceiptPreview
              ? "grid min-w-0 gap-6 md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)] md:gap-8"
              : "min-w-0 space-y-6"
          }
        >
          {showReceiptPreview && (
            <aside className="min-w-0 space-y-3 md:sticky md:top-6 md:self-start">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Foto nota</h2>
                <ImageUploadButton
                  label="Pilih foto"
                  receipt
                  disabled={isSubmitting}
                  onPendingChange={setUploadPending}
                  processImage={async (uploadedUrl) => {
                    try {
                      const { receipt, imageUrl } = await readUploadedReceipt(uploadedUrl, draft?.draftId);
                      if (imageUrl) return { ok: true, image: { receipt, imageUrl } };
                    } catch (error) {
                      if (error instanceof ScanReceiptError) {
                        return { ok: false, message: error.message };
                      }
                    }
                    return { ok: false, message: "Foto nota belum bisa dibaca." };
                  }}
                  onUploaded={({ receipt, imageUrl }) => {
                    reset(receipt);
                    setPreviewUrl(imageUrl);
                    resetItemEditor();
                  }}
                />
              </div>
              <div
                className="mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-muted p-3 md:max-w-none"
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Foto nota yang dipilih"
                    width={640}
                    height={880}
                    unoptimized
                    className="h-auto max-h-[70dvh] w-full rounded-lg object-contain"
                  />
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">Belum ada foto nota.</p>
                )}
              </div>
            </aside>
          )}

          <section className="min-w-0 space-y-6">
            <section aria-labelledby="receipt-info-title" className="space-y-4">
              <h2 id="receipt-info-title" className="text-lg font-semibold">
                Info nota
              </h2>
              <ConfidenceField
                label="Nama pemasok"
                confidence={receipt.overall_confidence}
                error={errors.supplier_name?.message}
                {...register("supplier_name")}
              />
              <ConfidenceField
                type="date"
                label="Tanggal nota"
                confidence={receipt.overall_confidence}
                error={errors.date?.message}
                {...register("date")}
              />
            </section>

            <section aria-labelledby="items-title" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="items-title" className="text-lg font-semibold">
                  Barang di nota ({items.length})
                </h2>
              </div>

              <div
                ref={editorRef}
                aria-label={editingIndex !== null ? `Edit barang ${editingIndex + 1}` : "Form tambah barang"}
                className={`space-y-4 rounded-xl border bg-card p-4 transition-colors ${
                  editingIndex !== null ? "border-primary/60 ring-2 ring-primary/15" : ""
                }`}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.defaultPrevented &&
                    event.target instanceof HTMLInputElement
                  ) {
                    event.preventDefault();
                    commitDraftItem();
                  }
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">
                      {editingIndex !== null ? `Edit barang #${editingIndex + 1}` : "Tambah barang"}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        editingIndex !== null
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {editingIndex !== null ? "Mode edit" : "Mode tambah"}
                    </span>
                  </div>
                </div>

                {draftReminder && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-900 dark:text-amber-200"
                  >
                    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>{draftReminder}</span>
                  </p>
                )}

                <ReceiptItemRow
                  key={`${editingIndex ?? "add"}-${editorRevision}`}
                  item={draftItem}
                  catalog={catalog}
                  onChange={handleDraftChange}
                  errors={draftErrors}
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button type="button" onClick={commitDraftItem}>
                    {editingIndex !== null ? (
                      <>
                        <Check aria-hidden="true" />
                        Simpan perubahan
                      </>
                    ) : (
                      <>
                        <Plus aria-hidden="true" />
                        Tambah ke daftar
                      </>
                    )}
                  </Button>
                  {editingIndex !== null ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetItemEditor()}
                    >
                      Batal edit
                    </Button>
                  ) : hasDraftInput ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => resetItemEditor()}
                    >
                      <RotateCcw aria-hidden="true" />
                      Bersihkan
                    </Button>
                  ) : null}
                </div>
              </div>

              {errors.items?.root?.message && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.items.root.message}
                </p>
              )}

              <ReceiptItemsTable
                items={items}
                catalog={catalog}
                editingIndex={editingIndex}
                itemErrors={Array.isArray(errors.items) ? errors.items : undefined}
                onEdit={startEditingItem}
                onRemove={removeItem}
              />
            </section>

            <section aria-label="Ringkasan nota" className="space-y-4 border-t pt-5">
              <div className="flex justify-between gap-3">
                <span>Subtotal barang</span>
                <span className="tabular-nums">{formatRupiah(itemsTotal)}</span>
              </div>
              <CurrencyInput
                label="Potongan seluruh nota"
                value={receipt.discount ?? 0}
                error={discountError ?? errors.discount?.message}
                onValueChange={(discount) => {
                  setValue("discount", discount, { shouldDirty: true, shouldValidate: true });
                  updatePayableTotal(items, discount);
                }}
              />
              {discounted ? (
                <div className="flex justify-between gap-3 text-lg font-semibold" aria-live="polite">
                  <span>Total bayar</span>
                  <span className="tabular-nums">{invalidDiscount ? "—" : formatRupiah(calculatedTotal)}</span>
                </div>
              ) : (
                <Controller
                  control={control}
                  name="total"
                  render={({ field }) => (
                    <CurrencyInput label="Total bayar" value={field.value} onValueChange={field.onChange}
                      confidence={receipt.overall_confidence} error={errors.total?.message} />
                  )}
                />
              )}
              {totalMismatch && !invalidDiscount && (
                <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
                  Total dari rincian barang {formatRupiah(calculatedTotal)} berbeda dengan total nota {formatRupiah(receipt.total)}.
                </p>
              )}
            </section>
          </section>
        </div>

        <div className="sticky bottom-16 z-20 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.4)] backdrop-blur md:bottom-0 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {!receiptComplete || hasValidationErrors
                ? "Lengkapi bagian yang wajib diisi sebelum menyimpan."
                : flaggedCount > 0
                  ? "Periksa bagian yang ditandai sebelum menyimpan."
                  : "Struk siap disimpan."}
            </p>
            <div className="flex w-full items-center justify-end gap-3 sm:ml-auto sm:w-auto">
              <Button asChild type="button" variant="outline">
                <Link href="/scan">Batal</Link>
              </Button>
              <Button
                type="submit"
                className="flex-1 sm:flex-initial sm:min-w-40"
                disabled={uploadPending || isSubmitting || invalidDiscount || (isSaved && !isDirty)}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Menyimpan...
                  </>
                ) : isSaved && !isDirty ? (
                  "Tersimpan"
                ) : (
                  draft ? "Setujui dan simpan" : "Simpan"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
