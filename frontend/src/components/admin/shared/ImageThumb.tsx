"use client";

import { FileText, ImageOff } from "lucide-react";

export interface ImageThumbProps {
  /** Absolute or relative URL. Remote hosts are not configured for next/image, so a plain <img> is used. */
  src: string | null | undefined;
  alt: string;
  /** Square side in pixels when width/height are not given. */
  size?: number;
  /** Any CSS length; overrides `size`. */
  width?: number | string;
  height?: number | string;
  className?: string;
  /** object-fit of the image inside the box. */
  fit?: "cover" | "contain";
  rounded?: "none" | "md" | "lg" | "full";
  /** Shown instead of the broken-image placeholder for non-image assets. */
  kind?: "image" | "pdf";
}

const RADIUS: Record<NonNullable<ImageThumbProps["rounded"]>, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

/** Small preview box for a media asset; falls back to an icon when there is no URL. */
export function ImageThumb({
  src,
  alt,
  size = 48,
  width,
  height,
  className = "",
  fit = "cover",
  rounded = "md",
  kind = "image",
}: ImageThumbProps) {
  const boxStyle = { width: width ?? size, height: height ?? size };
  const shape = `${RADIUS[rounded]} ${className}`.trim();

  if (!src || kind === "pdf") {
    return (
      <span
        aria-hidden="true"
        style={boxStyle}
        className={`inline-flex shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-slate-400 ${shape}`}
      >
        {kind === "pdf" ? <FileText size={18} /> : <ImageOff size={18} />}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote hosts are not configured for next/image
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={boxStyle}
      className={`shrink-0 border border-slate-200 bg-slate-50 ${
        fit === "cover" ? "object-cover" : "object-contain"
      } ${shape}`}
    />
  );
}
