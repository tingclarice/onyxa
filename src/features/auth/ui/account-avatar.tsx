"use client";

import { useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";

export function AccountAvatar({
  name,
  imageUrl,
  size = 36,
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "").join("").toLocaleUpperCase("id-ID");

  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-950 dark:bg-emerald-900 dark:text-emerald-50"
      style={{ width: size, height: size }}
    >
      {imageUrl && imageUrl !== failedUrl ? (
        <Image
          src={imageUrl}
          width={size}
          height={size}
          alt=""
          unoptimized
          loading="eager"
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        initials || <UserRound className="size-5" />
      )}
    </span>
  );
}
