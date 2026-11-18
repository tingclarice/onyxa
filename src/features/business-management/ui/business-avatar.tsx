"use client";

import { useState } from "react";
import Image from "next/image";

const DEFAULT_IMAGE = "/company-default.svg";

export function BusinessAvatar({
  imageUrl,
  size,
}: {
  imageUrl: string | null;
  size: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const src = imageUrl && imageUrl !== failedUrl ? imageUrl : DEFAULT_IMAGE;

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="aspect-square shrink-0 rounded-lg bg-muted object-cover"
      onError={() => {
        if (src !== DEFAULT_IMAGE) setFailedUrl(src);
      }}
    />
  );
}
