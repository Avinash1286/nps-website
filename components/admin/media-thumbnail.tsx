"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function MediaThumbnail({
  url,
  alt,
  className = "h-40",
  sizes = "(max-width: 640px) 100vw, 360px",
}: {
  url: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === url;

  return (
    <div
      className={`relative grid place-items-center overflow-hidden bg-gradient-to-br from-slate-50 to-sky-50 ${className}`}
    >
      {failed ? (
        <span
          role="img"
          aria-label="Image preview unavailable"
          className="grid h-12 w-12 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"
        >
          <ImageOff size={24} />
        </span>
      ) : (
        <Image
          src={url}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          className="object-cover"
          onError={() => setFailedUrl(url)}
        />
      )}
    </div>
  );
}
