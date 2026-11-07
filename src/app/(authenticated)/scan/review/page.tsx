"use client";

import { useEffect, useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfidenceField } from "@/components/review/confidence-field";
import { CurrencyInput } from "@/components/review/currency-input";
import { ReceiptItemRow } from "@/components/review/receipt-item-row";
import { StatusBadge } from "@/components/review/status-badge";
import { Button } from "@/components/ui/button";
import { useScanReceipt } from "@/features/invoice-processing/ui/use-scan-receipt";
import {
  ScanReceiptError,
  ScanReceiptSchema,
  ScanReceiptResultSchema,
  type ScanReceipt,
  type ScanReceiptItem,
} from "@/features/invoice-processing/types/scan";
import { formatDate, formatRupiah } from "@/lib/utils/format";

const emptyReceipt: ScanReceipt = {
  supplier_name: "",
  date: "",
  items: [],
  total: 0,
  overall_confidence: 1,
};

function createEmptyItem(): ScanReceiptItem {
  return {
    raw_name: "",
    qty: 1,
    unit: "pcs",
    unit_price: 0,
    line_total: 0,
    confidence: 1,
    matched_item: null,
  };
}

export default function ReceiptReviewPage() {
  const scanMutation = useScanReceipt();
  const { mutate: loadReceipt } = scanMutation;
  const didLoad = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [selectedImageFile, setSelectedImageFile] = useState<File>();
  const [isSaved, setIsSaved] = useState(false);
  const [receiptReady, setReceiptReady] = useState(false);
  const [receiptLoadError, setReceiptLoadError] = useState(false);
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
    defaultValues: emptyReceipt,
    mode: "onSubmit",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const values = useWatch({ control });
  const receipt = values as ScanReceipt;
  const items = receipt.items ?? [];
  const itemsTotal = items.reduce(
    (sum, item) => sum + (Number.isFinite(item.line_total) ? item.line_total : 0),
    0,
  );
  const totalMismatch = itemsTotal !== receipt.total;
  const headerNeedsCheck = receipt.overall_confidence < 0.8;
  const flaggedCount =
    (headerNeedsCheck ? 3 : 0) +
    items.filter((item) => item.confidence < 0.8).length +
    (totalMismatch ? 1 : 0);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    const receiptId = new URLSearchParams(window.location.search).get(
      "receiptId",
    );
    if (receiptId) {
      const storageKey = `onyxa:scan-review:${receiptId}`;
      const storedReceipt = window.sessionStorage.getItem(storageKey);
      if (storedReceipt) {
        window.sessionStorage.removeItem(storageKey);
        try {
          const parsedResult = ScanReceiptResultSchema.safeParse(
            JSON.parse(storedReceipt),
          );
          if (parsedResult.success) {
            window.setTimeout(() => {
              reset(parsedResult.data.receipt);
              setPreviewUrl(parsedResult.data.imageUrl);
              setReceiptReady(true);
            }, 0);
            return;
          }
        } catch {
          window.setTimeout(() => {
            setReceiptLoadError(true);
          }, 0);
          return;
        }
        window.setTimeout(() => {
          setReceiptLoadError(true);
        }, 0);
        return;
      }
    }
    loadReceipt(undefined);
  }, [loadReceipt, reset]);

  useEffect(() => {
    if (scanMutation.data?.receipt) {
      const timer = window.setTimeout(() => {
        reset(scanMutation.data.receipt);
        setPreviewUrl(scanMutation.data.imageUrl);
        setReceiptReady(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [reset, scanMutation.data]);

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function retryScan() {
    setReceiptLoadError(false);
    setReceiptReady(false);
    scanMutation.reset();
    scanMutation.mutate(selectedImageFile);
  }

  function handleImageSelected(file?: File) {
    if (!file) return;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSelectedImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    scanMutation.mutate(file);
  }

  function getScanErrorMessage(): string {
    if (scanMutation.error instanceof ScanReceiptError) {
      return scanMutation.error.message;
    }

    return "Struk belum bisa dibuka. Coba lagi, ya.";
  }

  function updateItem(index: number, item: ScanReceiptItem) {
    setValue(`items.${index}`, item, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function changeMatchedItem(index: number) {
    const item = items[index];
    if (!item) return;

    const nextItemName = window.prompt(
      "Masukkan nama barang yang cocok.",
      item.matched_item ?? item.raw_name,
    );
    if (nextItemName === null) return;

    updateItem(index, {
      ...item,
      matched_item: nextItemName.trim() || null,
    });
  }

  function saveReceipt() {
    reset(getValues());
    setIsSaved(true);
    toast.success("Struk berhasil disimpan.");
  }

  if (receiptLoadError) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p role="alert" className="text-base text-destructive">
          Hasil scan tidak bisa dibuka. Silakan coba scan ulang.
        </p>
        <Button type="button" onClick={retryScan}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (scanMutation.isPending || scanMutation.isError || !receiptReady) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        {scanMutation.isError ? (
          <>
            <p role="alert" className="text-base text-destructive">
              {getScanErrorMessage()}
            </p>
            <Button type="button" onClick={retryScan}>
              Coba lagi
            </Button>
          </>
        ) : (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="size-8 animate-spin text-accent"
            />
            <p className="text-base text-muted-foreground">
              Menyiapkan struk untuk dicek...
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 md:py-8">
      <header className="mb-5 space-y-3 md:mb-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Cek struk belanja
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Pastikan nama barang dan jumlahnya sudah benar.
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
          {flaggedCount > 0
            ? `${flaggedCount} bagian perlu dicek`
            : "Semua bagian siap disimpan"}
        </p>
      </header>

      <form onSubmit={handleSubmit(saveReceipt)} noValidate>
        <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)] md:gap-8">
          <aside className="min-w-0 space-y-3 md:sticky md:top-6 md:self-start">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Foto nota</h2>
              <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-base font-medium transition-colors hover:bg-muted">
                <ImageUp aria-hidden="true" className="size-5" />
                <span>Pilih foto</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    handleImageSelected(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <div
              role="img"
              aria-label="Pratinjau nota belanja"
              className="mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-muted p-3 md:max-w-none"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Foto nota yang dipilih"
                  className="max-h-[70dvh] w-full rounded-lg object-contain"
                />
              ) : (
                <div className="mx-auto max-w-sm bg-white px-5 py-6 font-mono text-sm text-zinc-900 shadow-sm">
                  <p className="text-center text-base font-bold">
                    {receipt.supplier_name}
                  </p>
                  <p className="mt-1 text-center text-xs">
                    {receipt.date ? formatDate(receipt.date) : "Tanggal nota"}
                  </p>
                  <div className="my-4 border-t border-dashed border-zinc-400" />
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={`${item.raw_name}-${index}`}
                        className="flex justify-between gap-3"
                      >
                        <span className="min-w-0 break-words">
                          {item.raw_name || "Nama barang"}{" "}
                          <span className="whitespace-nowrap">
                            {item.qty} {item.unit}
                          </span>
                        </span>
                        <span className="shrink-0">
                          {formatRupiah(item.line_total)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="my-4 border-t border-dashed border-zinc-400" />
                  <div className="flex justify-between gap-3 font-bold">
                    <span>TOTAL</span>
                    <span>{formatRupiah(receipt.total)}</span>
                  </div>
                  <p className="mt-5 text-center text-xs text-zinc-500">
                    Pratinjau contoh nota
                  </p>
                </div>
              )}
            </div>
          </aside>

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
              <Controller
                control={control}
                name="total"
                render={({ field }) => (
                  <CurrencyInput
                    label="Total nota"
                    value={field.value}
                    onValueChange={field.onChange}
                    confidence={receipt.overall_confidence}
                    error={errors.total?.message}
                  />
                )}
              />
              {totalMismatch && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-base text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
                >
                  <span aria-hidden="true" className="font-bold">
                    !
                  </span>
                  <span>
                    Total item {formatRupiah(itemsTotal)} tidak sama dengan
                    total nota {formatRupiah(receipt.total)}
                  </span>
                </p>
              )}
            </section>

            <section aria-labelledby="items-title" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="items-title" className="text-lg font-semibold">
                  Barang di nota
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append(createEmptyItem())}
                >
                  <Plus aria-hidden="true" />
                  Tambah barang
                </Button>
              </div>

              {errors.items?.root?.message && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.items.root.message}
                </p>
              )}

              {fields.map((field, index) => {
                const item = items[index];
                if (!item) return null;

                const itemErrors = errors.items?.[index];
                return (
                  <div key={field.id} className="space-y-2">
                    <ReceiptItemRow
                      item={item}
                      onChange={(updatedItem) =>
                        updateItem(index, updatedItem)
                      }
                      onChangeMatchedItem={() => changeMatchedItem(index)}
                      errors={{
                        raw_name: itemErrors?.raw_name?.message,
                        qty: itemErrors?.qty?.message,
                        unit: itemErrors?.unit?.message,
                        unit_price: itemErrors?.unit_price?.message,
                        line_total: itemErrors?.line_total?.message,
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                      Hapus barang
                    </Button>
                  </div>
                );
              })}

              {items.length === 0 && (
                <p className="rounded-xl border border-dashed p-5 text-center text-base text-muted-foreground">
                  Belum ada barang di nota.
                </p>
              )}
            </section>
          </section>
        </div>

        <div className="sticky bottom-16 z-20 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.4)] backdrop-blur md:bottom-0 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {flaggedCount > 0
                ? "Periksa bagian yang ditandai sebelum menyimpan."
                : "Struk siap disimpan."}
            </p>
            <Button
              type="submit"
              className="w-full sm:ml-auto sm:w-auto sm:min-w-40"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
