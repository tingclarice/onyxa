"use client";

import { useState } from "react";
import { ImageUploadButton } from "@/components/ui/image-upload-button";
import { AccountAvatar } from "./account-avatar";
import { updateAccountProfilePhotoAction } from "./account-photo-actions";

export function AccountProfilePhoto({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  const [uploadedUrl, setUploadedUrl] = useState<string>();

  return (
    <div className="flex flex-wrap items-start gap-4">
      <AccountAvatar name={name} imageUrl={uploadedUrl ?? imageUrl} size={56} />
      <div className="space-y-2">
        <ImageUploadButton
          label="Unggah foto profil"
          accept="image/jpeg,image/png,image/webp"
          upload={async (file) => {
            const data = new FormData();
            data.set("file", file);
            const result = await updateAccountProfilePhotoAction(data);
            return result.ok ? { ok: true, image: result } : result;
          }}
          onUploaded={({ imageUrl }) => setUploadedUrl(imageUrl)}
        />
        {uploadedUrl && (
          <p role="status" className="text-sm text-muted-foreground">Foto profil tersimpan.</p>
        )}
      </div>
    </div>
  );
}
