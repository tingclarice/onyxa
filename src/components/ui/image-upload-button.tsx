"use client";

import { useState } from "react";
import { ImageUp } from "lucide-react";
import { useCloudinaryPicker } from "../cloudinary-picker";
import { Button } from "./button";

type UploadResult<Image> = { ok: true; image: Image } | { ok: false; message: string };

export function ImageUploadButton<Image extends { imageUrl: string }>({
  label,
  receipt,
  disabled,
  processImage,
  onUploaded,
  onPendingChange,
}: {
  label: string;
  receipt?: boolean;
  disabled?: boolean;
  processImage: (imageUrl: string) => Promise<UploadResult<Image>>;
  onUploaded: (image: Image) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const picker = useCloudinaryPicker({
    receipt,
    onImage: ({ imageUrl }) => void processSelectedImage(imageUrl),
  });

  async function processSelectedImage(imageUrl: string) {
    setPending(true);
    onPendingChange?.(true);
    setError("");
    try {
      const result = await processImage(imageUrl);
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
        disabled={disabled || pending || picker.open}
        onClick={picker.pickImages}
      >
        <ImageUp aria-hidden="true" />
        {pending ? "Memproses foto..." : label}
      </Button>
      {picker.error && <p role="alert" className="text-sm text-destructive">{picker.error}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
