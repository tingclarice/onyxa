"use client";

import { createContext, createElement, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { z } from "zod";

type Settings = {
  cloudName?: string;
  uploadPreset?: string;
};
const SettingsContext = createContext<Settings>({});

export function CloudinarySettings({ value, children }: { value: Settings; children: ReactNode }) {
  return createElement(SettingsContext.Provider, { value }, children);
}

const uploadedImage = z.object({
  resource_type: z.literal("image"),
  secure_url: z.url(),
  original_filename: z.string().optional(),
});

type Widget = {
  open(): void;
  destroy(): void;
};

type UploadApi = {
  createUploadWidget(
    options: {
      cloudName: string;
      uploadPreset: string;
      sources: string[];
      resourceType: "image";
      multiple: boolean;
      singleUploadAutoClose: boolean;
      clientAllowedFormats: string[];
      maxFileSize: number;
    },
    callback: (error: unknown, result?: { event: string; info?: unknown }) => void,
  ): Widget;
};

declare global {
  interface Window { cloudinary?: UploadApi }
}

let loading: Promise<UploadApi> | undefined;

function loadUploadWidget(): Promise<UploadApi> {
  if (window.cloudinary) return Promise.resolve(window.cloudinary);
  if (loading) return loading;

  loading = new Promise<UploadApi>((resolve, reject) => {
    const script = document.createElement("script");
    function fail() {
      script.remove();
      loading = undefined;
      reject(new Error("Widget Cloudinary belum bisa dimuat. Periksa koneksi lalu coba lagi."));
    }
    script.onload = () => window.cloudinary ? resolve(window.cloudinary) : fail();
    script.onerror = fail;
    script.src = "https://upload-widget.cloudinary.com/latest/global/all.js";
    document.head.appendChild(script);
  });
  return loading;
}

export type PickedImage = { imageUrl: string; name: string };

export function useCloudinaryPicker(options: {
  multiple?: boolean;
  receipt?: boolean;
  onImage: (image: PickedImage) => void;
}) {
  const { cloudName, uploadPreset } = useContext(SettingsContext);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const active = useRef(false);
  const widget = useRef<Widget | null>(null);

  useEffect(() => () => {
    active.current = false;
    widget.current?.destroy();
    widget.current = null;
  }, []);

  async function pickImages() {
    if (active.current) return;
    setError("");
    if (!cloudName || !uploadPreset) {
      setError("Pemilih foto Cloudinary belum dikonfigurasi.");
      return;
    }
    active.current = true;
    setOpen(true);
    try {
      const api = await loadUploadWidget();
      if (!active.current) return;
      const seen = new Set<string>();
      widget.current = api.createUploadWidget({
        cloudName,
        uploadPreset,
        sources: ["local", "camera"],
        resourceType: "image",
        multiple: options.multiple ?? false,
        singleUploadAutoClose: !options.multiple,
        clientAllowedFormats: options.receipt
          ? ["jpg", "jpeg", "png", "webp", "heic", "heif"]
          : ["jpg", "jpeg", "png", "webp"],
        maxFileSize: 8 * 1024 * 1024,
      }, (failure, result) => {
        if (!active.current) return;
        if (failure) {
          setError("Unggahan Cloudinary gagal. Silakan coba lagi.");
        }
        if (result?.event === "success") {
          const image = uploadedImage.safeParse(result.info);
          if (!image.success) {
            setError("Cloudinary tidak mengembalikan foto yang valid.");
          } else if (!seen.has(image.data.secure_url)) {
            seen.add(image.data.secure_url);
            options.onImage({
              imageUrl: image.data.secure_url,
              name: image.data.original_filename || "Foto",
            });
          }
        }
        if (failure || result?.event === "close") {
          active.current = false;
          setOpen(false);
          widget.current?.destroy();
          widget.current = null;
        }
      });
      widget.current.open();
    } catch {
      if (!active.current) return;
      active.current = false;
      setOpen(false);
      widget.current?.destroy();
      widget.current = null;
      setError("Widget Cloudinary belum bisa dibuka. Periksa koneksi lalu coba lagi.");
    }
  }
  return { pickImages, open, error };
}
