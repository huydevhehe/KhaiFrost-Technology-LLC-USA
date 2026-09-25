import Image from "next/image";
import { Play } from "lucide-react";

interface VideoThumbnailProps {
  src: string;
  alt: string;
  aspect?: "video" | "square";
  showVideoBadge?: boolean;
  duration?: string;
}

export function VideoThumbnail({
  src,
  alt,
  aspect = "video",
  showVideoBadge = false,
  duration,
}: VideoThumbnailProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900 ${
        aspect === "video" ? "aspect-video" : "aspect-square"
      }`}
    >
      <Image src={src} alt={alt} fill unoptimized className="object-cover" />
      {showVideoBadge && (
        <>
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">
            Video
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
              <Play size={16} className="ml-0.5 text-slate-900" fill="currentColor" />
            </div>
          </div>
        </>
      )}
      {duration && (
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {duration}
        </span>
      )}
    </div>
  );
}
