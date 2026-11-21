"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileImage,
  LoaderCircle,
  Plus,
  RefreshCw,
  ScanLine,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloudinaryPicker, type PickedImage } from "@/components/cloudinary-picker";
import { uploadAndReadReceipt, readUploadedReceipt } from "./use-scan-receipt";
import {
  ScanReceiptError,
  ScanReceiptResultSchema,
  type ScanReceiptResult,
  type ScanReceiptErrorCode,
} from "../types/scan";

type QueueStatus = "queued" | "scanning" | "done" | "failed";

type ScanQueueItem = {
  id: string;
  cameraFile?: File;
  name: string;
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
    code: "scan_failed",
    message: "Aplikasi tidak menerima hasil scan yang valid dari server. Periksa koneksi dan log server saat permintaan dikirim.",
  };
}

function getStatusLabel(status: QueueStatus): string {
  switch (status) {
    case "queued":
      return "Menunggu";
    case "scanning":
      return "Mengunggah dan membaca nota...";
    case "done":
      return "Siap dicek";
    case "failed":
      return "Gagal";
  }
}

function getErrorMessage(code: ScanReceiptErrorCode): string {
  switch (code) {
    case "scan_failed":
      return "Server belum memberikan hasil scan. Periksa log pemrosesan nota.";
    case "review_storage_failed":
      return "Browser gagal menyimpan draf nota untuk ditinjau.";
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

/**
 * The interactive part of /scan: pick photos, upload and scan them one by
 * one, then open each result for review. The page title lives in app/scan/page.tsx.
 */
export function ReceiptScanner() {
  const [queue, setQueue] = useState<ScanQueueItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const queueRef = useRef(queue);
  const picker = useCloudinaryPicker({ multiple: true, receipt: true, onImage: queueUploadedPhoto });

  useEffect(
    () => () => {
      queueRef.current.forEach((item) => {
        if (item.cameraFile) URL.revokeObjectURL(item.previewUrl);
      });
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

  async function processFile(item: ScanQueueItem) {
    updateQueueItem(item.id, {
      status: "scanning",
      errorCode: undefined,
      errorMessage: undefined,
    });

    try {
      const result = item.cameraFile
        ? await uploadAndReadReceipt(item.cameraFile)
        : await readUploadedReceipt(item.previewUrl);
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
      try {
        window.sessionStorage.setItem(`${reviewStoragePrefix}${id}`, JSON.stringify(validatedResult));
      } catch {
        throw new ScanReceiptError(
          "Nota sudah dibaca. Browser gagal menyimpan draf untuk ditinjau. Periksa izin dan ruang penyimpanan situs.",
          "review_storage_failed",
        );
      }
    }
    return `/scan/review?receiptId=${encodeURIComponent(id)}`;
  }

  function enqueue(item: ScanQueueItem) {
    queueRef.current = [...queueRef.current, item];
    setQueue(queueRef.current);
    void processFile(item);
  }

  function queueUploadedPhoto({ imageUrl, name }: PickedImage) {
    if (queueRef.current.some((item) => item.previewUrl === imageUrl)) return;
    enqueue({ id: crypto.randomUUID(), previewUrl: imageUrl, name, status: "queued" });
  }

  function handleOpenCamera() {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      setIsCameraOpen(true);
    } else {
      void picker.pickImages();
    }
  }

  function removeItem(item: ScanQueueItem) {
    if (item.cameraFile) URL.revokeObjectURL(item.previewUrl);
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
    <>
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
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              type="button"
              onClick={handleOpenCamera}
              className="w-full"
            >
              <ScanLine aria-hidden="true" />
              Ambil foto
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={picker.open}
              onClick={picker.pickImages}
              className="w-full"
            >
              <Upload aria-hidden="true" />
              Pilih dari galeri
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <Link href="/scan/review?mode=manual">
                <Plus aria-hidden="true" />
                Catat manual
              </Link>
            </Button>
          </div>
          {picker.error && <p role="alert" className="text-sm text-destructive">{picker.error}</p>}
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
              disabled={picker.open}
              onClick={picker.pickImages}
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
                    alt={`Foto nota ${item.name}`}
                    className="size-16 rounded-lg border object-cover sm:size-20"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-base font-medium">
                      {item.name}
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
                    aria-label={`Hapus ${item.name}`}
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

      {isCameraOpen && (
        <LiveCameraModal
          onClose={() => setIsCameraOpen(false)}
          onCapture={(file) => {
            setIsCameraOpen(false);
            enqueue({ id: crypto.randomUUID(), cameraFile: file, name: file.name,
              previewUrl: URL.createObjectURL(file), status: "queued" });
          }}
          onChooseFromGallery={() => {
            setIsCameraOpen(false);
            void picker.pickImages();
          }}
        />
      )}
    </>
  );
}

function LiveCameraModal({
  onClose,
  onCapture,
  onChooseFromGallery,
}: {
  onClose: () => void;
  onCapture: (file: File) => void;
  onChooseFromGallery: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      setIsReady(false);
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
        }
      } catch {
        if (active) {
          setCameraError(
            "Kamera tidak dapat diakses. Pastikan izin kamera diizinkan di browser atau pilih file foto.",
          );
        }
      }
    }

    void startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  function handleTakePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const file = new File([blob], `nota-${timestamp}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCapture(file);
      },
      "image/jpeg",
      0.95,
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ambil foto nota"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">Ambil foto nota</h3>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            aria-label="Tutup kamera"
            className="size-9 p-0"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <div className="relative flex aspect-[3/4] max-h-[65vh] w-full items-center justify-center bg-black">
          {cameraError ? (
            <div className="space-y-4 p-6 text-center text-white">
              <p className="text-sm">{cameraError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={onChooseFromGallery}
                className="text-foreground"
              >
                Pilih file foto
              </Button>
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-contain"
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFacingMode((prev) =>
                prev === "environment" ? "user" : "environment",
              )
            }
            disabled={Boolean(cameraError)}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Ganti kamera
          </Button>

          <Button
            type="button"
            onClick={handleTakePhoto}
            disabled={!isReady || Boolean(cameraError)}
            className="flex-1"
          >
            <Camera aria-hidden="true" className="size-4" />
            Jepret foto
          </Button>
        </div>
      </div>
    </div>
  );
}
