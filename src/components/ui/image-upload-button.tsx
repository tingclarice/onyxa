"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { Button } from "./button";

type UploadResult<Image> = { ok: true; image: Image } | { ok: false; message: string };

export function ImageUploadButton<Image extends { imageUrl: string }>({
  label,
  accept,
  disabled,
  upload,
  onUploaded,
  onPendingChange,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  upload: (file: File) => Promise<UploadResult<Image>>;
  onUploaded: (image: Image) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function uploadSelectedImage(file: File) {
    setPending(true);
    onPendingChange?.(true);
    setError("");
    try {
      const result = await upload(file);
      if (result.ok) onUploaded(result.image);
      else setError(result.message);
    } catch {
      setError("Foto belum bisa diproses. Silakan coba lagi.");
    } finally {
      setPending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || pending}
        onClick={() => input.current?.click()}
      >
        <ImageUp aria-hidden="true" />
        {pending ? "Mengunggah..." : label}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void uploadSelectedImage(file);
        }}
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
