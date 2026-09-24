"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const VISIBLE_THUMBNAILS = 5;

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return <div className="aspect-video w-full rounded-2xl bg-slate-100" />;
  }

  const safeActive = Math.min(active, images.length - 1);
  const visible = images.slice(0, VISIBLE_THUMBNAILS);
  const extra = images.length - VISIBLE_THUMBNAILS;

  function goTo(index: number) {
    setActive(index);
  }
  function prev() {
    setActive((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setActive((i) => (i + 1) % images.length);
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-100">
        <Image
          src={images[safeActive]}
          alt={name}
          fill
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover"
          priority
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={t("productDetailPage.gallery.previous")}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow transition-colors hover:bg-white"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t("productDetailPage.gallery.next")}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow transition-colors hover:bg-white"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3">
          {visible.map((url, index) => {
            const isLast = index === visible.length - 1;
            return (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => goTo(index)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                  index === safeActive ? "border-accent" : "border-transparent"
                }`}
              >
                <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                {isLast && extra > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white">
                    {t("productDetailPage.gallery.moreImages", { count: extra })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
