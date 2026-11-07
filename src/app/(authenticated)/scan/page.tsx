"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  LoaderCircle,
  Plus,
  ScanLine,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScanReceipt } from "@/features/invoice-processing/ui/use-scan-receipt";
import {
  ScanReceiptError,
  ScanReceiptResultSchema,
  type ScanReceiptResult,
  type ScanReceiptErrorCode,
} from "@/features/invoice-processing/types/scan";

type QueueStatus = "queued" | "scanning" | "done" | "failed";

type ScanQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: QueueStatus;
  errorCode?: ScanReceiptErrorCode;
  errorMessage?: string;
  reviewUrl?: string;
};

const reviewStoragePrefix = "onyxa:scan-review:";

function getErrorDetails(error: unknown): {
  code: ScanReceiptErrorCode;
  message: string;
} {
  if (error instanceof ScanReceiptError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: "upload_failed",
    message: "Foto belum berhasil dikirim. Periksa koneksi lalu coba lagi.",
  };
}

function getStatusLabel(status: QueueStatus): string {
  switch (status) {
    case "queued":
      return "Menunggu";
    case "scanning":
      return "Mengunggah foto...";
    case "done":
      return "Siap dicek";
    case "failed":
      return "Gagal";
  }
}

function getErrorMessage(code: ScanReceiptErrorCode): string {
  switch (code) {
    case "unreadable_image":
      return "Format foto belum didukung. Gunakan JPG, PNG, WebP, atau HEIC.";
    case "duplicate_receipt":
      return "Nota ini sepertinya sudah pernah dikirim. Periksa nota sebelum mencoba lagi.";
    case "upload_failed":
      return "Foto belum berhasil dikirim. Periksa koneksi lalu coba lagi.";
    case "cloudinary_not_configured":
      return "Penyimpanan Cloudinary belum disiapkan. Minta pengelola aplikasi memeriksa pengaturannya.";
    case "cloudinary_upload_failed":
      return "Foto belum berhasil disimpan. Periksa koneksi dan pengaturan Cloudinary, lalu coba lagi.";
    case "cloudinary_image_invalid":
      return "Alamat foto nota tidak valid. Pilih ulang foto nota.";
    case "cloudinary_image_unavailable":
      return "Foto di Cloudinary tidak dapat diakses. Coba unggah ulang nota.";
    case "gemini_not_configured":
      return "Pemrosesan nota belum disiapkan. Minta pengelola aplikasi memeriksa GEMINI_API_KEY.";
    case "gemini_invalid_key":
      return "GEMINI_API_KEY tidak dikenali. Periksa nilainya di .env, lalu mulai ulang server.";
    case "gemini_access_denied":
      return "Google menolak akses Gemini. Periksa akses Gemini API untuk API key tersebut.";
    case "gemini_model_unavailable":
      return "Model Gemini tidak tersedia. Perbarui pilihan model atau periksa akses API.";
    case "gemini_quota_exceeded":
      return "Kuota Gemini tercapai. Periksa kuota Google AI Studio atau coba lagi nanti.";
    case "gemini_request_rejected":
      return "Gemini menolak format permintaan. Coba foto lain atau hubungi pengelola aplikasi.";
    case "gemini_request_failed":
      return "Gemini belum dapat membaca nota. Periksa koneksi lalu coba lagi.";
    case "invalid_model_output":
      return "Hasil pembacaan nota belum dapat diproses. Coba unggah ulang foto.";
    case "file_too_large":
      return "Ukuran foto maksimal 8 MB. Pilih foto yang lebih kecil.";
  }
}

export default function ScanPage() {
  const scanMutation = useScanReceipt();
  const [queue, setQueue] = useState<ScanQueueItem[]>([]);
  const queueRef = useRef(queue);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(
    () => () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    },
    [],
  );

  function updateQueueItem(
    id: string,
    updates: Partial<ScanQueueItem>,
  ) {
    const updatedQueue = queueRef.current.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    );
    queueRef.current = updatedQueue;
    setQueue(updatedQueue);
  }

  function isDuplicateFile(file: File, currentId?: string): boolean {
    return queueRef.current.some(
      (item) =>
        item.id !== currentId &&
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified,
    );
  }

  async function processFile(item: ScanQueueItem) {
    updateQueueItem(item.id, {
      status: "scanning",
      errorCode: undefined,
      errorMessage: undefined,
    });

    if (isDuplicateFile(item.file, item.id)) {
      updateQueueItem(item.id, {
        status: "failed",
        errorCode: "duplicate_receipt",
      });
      return;
    }

    if (!item.file.type.startsWith("image/") || item.file.size === 0) {
      updateQueueItem(item.id, {
        status: "failed",
        errorCode: "unreadable_image",
      });
      return;
    }

    try {
      const result = await scanMutation.mutateAsync(item.file);
      const reviewUrl = storeReceiptForReview(item.id, result);
      updateQueueItem(item.id, {
        status: "done",
        reviewUrl,
        errorCode: undefined,
        errorMessage: undefined,
      });
    } catch (error) {
      const details = getErrorDetails(error);
      updateQueueItem(item.id, {
        status: "failed",
        errorCode: details.code,
        errorMessage: details.message,
      });
    }
  }

  function storeReceiptForReview(
    id: string,
    result: ScanReceiptResult,
  ): string {
    if (typeof window !== "undefined") {
      const validatedResult = ScanReceiptResultSchema.parse(result);
      window.sessionStorage.setItem(
        `${reviewStoragePrefix}${id}`,
        JSON.stringify(validatedResult),
      );
    }
    return `/scan/review?receiptId=${encodeURIComponent(id)}`;
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const newItems = files.map((file): ScanQueueItem => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
    }));

    const updatedQueue = [...queueRef.current, ...newItems];
    queueRef.current = updatedQueue;
    setQueue(updatedQueue);
    newItems.forEach((item) => void processFile(item));
  }

  function removeItem(item: ScanQueueItem) {
    URL.revokeObjectURL(item.previewUrl);
    const updatedQueue = queueRef.current.filter(
      (queueItem) => queueItem.id !== item.id,
    );
    queueRef.current = updatedQueue;
    setQueue(updatedQueue);
  }

  function retryItem(item: ScanQueueItem) {
    void processFile(item);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Scan nota belanja
        </h1>
        <p className="text-base text-muted-foreground">
          Foto nota atau pilih gambar dari HP. Kamu bisa menambahkan beberapa
          nota sekaligus.
        </p>
        <p className="text-sm text-muted-foreground">
          Foto disimpan di Cloudinary, lalu Gemini menyiapkan data awal untuk
          dicek dan diperbaiki.
        </p>
      </header>

      <section
        aria-labelledby="scan-upload-title"
        className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6"
      >
        <div className="flex items-start gap-3 rounded-xl bg-muted p-4">
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-accent"
          />
          <p className="text-base leading-6">
            Foto tegak, pastikan cahaya cukup dan semua tulisan terlihat.
          </p>
        </div>

        <div className="space-y-3">
          <h2 id="scan-upload-title" className="text-lg font-semibold">
            Tambahkan foto nota
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full"
            >
              <ScanLine aria-hidden="true" />
              Ambil foto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full"
            >
              <Upload aria-hidden="true" />
              Pilih dari galeri
            </Button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              handleFilesSelected(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              handleFilesSelected(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </section>

      <section aria-labelledby="queue-title" className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="queue-title" className="text-lg font-semibold">
            Daftar nota
            {queue.length > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({queue.length})
              </span>
            )}
          </h2>
          {queue.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Plus aria-hidden="true" />
              Tambah nota
            </Button>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-10 text-center">
            <FileImage
              aria-hidden="true"
              className="size-8 text-muted-foreground"
            />
            <p className="text-base font-medium">Belum ada foto nota</p>
            <p className="text-base text-muted-foreground">
              Foto nota akan muncul di sini setelah ditambahkan.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => {
              const statusLabel = getStatusLabel(item.status);
              const errorMessage = item.errorCode
                ? (item.errorMessage ?? getErrorMessage(item.errorCode))
                : undefined;

              return (
                <li
                  key={item.id}
                  className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[80px_minmax(0,1fr)_auto]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={`Foto nota ${item.file.name}`}
                    className="size-16 rounded-lg border object-cover sm:size-20"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-base font-medium">
                      {item.file.name}
                    </p>
                    <p
                      aria-live="polite"
                      className={`flex items-center gap-1.5 text-sm font-medium ${
                        item.status === "failed"
                          ? "text-status-error"
                          : item.status === "done"
                            ? "text-status-success"
                            : "text-muted-foreground"
                      }`}
                    >
                      {item.status === "scanning" ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                      ) : item.status === "done" ? (
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                      ) : item.status === "failed" ? (
                        <AlertCircle aria-hidden="true" className="size-4" />
                      ) : null}
                      {statusLabel}
                    </p>
                    {errorMessage && (
                      <p role="alert" className="text-sm leading-5 text-foreground">
                        {errorMessage}
                      </p>
                    )}
                    {item.status === "failed" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2"
                        onClick={() => retryItem(item)}
                      >
                        Coba lagi
                      </Button>
                    )}
                    {item.status === "done" && item.reviewUrl && (
                      <Button
                        asChild
                        variant="outline"
                        className="mt-2 w-fit"
                      >
                        <Link href={item.reviewUrl}>Cek hasil</Link>
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Hapus ${item.file.name}`}
                    onClick={() => removeItem(item)}
                    className="size-12 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
