'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

type BrandLogoProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Wraps the image; left out together with it when there is no usable logo. */
  frameClassName?: string;
  /** Shown instead when the logo is missing, malformed or fails to load. */
  fallback?: ReactNode;
};

const LOADABLE_SRC = /^(https?:\/\/|\/)/i;

/**
 * Brand logos are free-text URLs entered in the dashboard, so they can point
 * at any host. `unoptimized` skips the image optimizer, whose host allowlist
 * (next.config.ts) would otherwise throw for an unlisted one.
 */
export function BrandLogo({
  src,
  alt,
  width,
  height,
  className,
  frameClassName,
  fallback = null,
}: BrandLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || !LOADABLE_SRC.test(src) || failedSrc === src) return <>{fallback}</>;

  const image = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      onError={() => setFailedSrc(src)}
    />
  );
  return frameClassName ? <div className={frameClassName}>{image}</div> : image;
}
