"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type GalleryImage = {
  id?: number;
  url: string;
  alt?: string | null;
  category?: string;
};

export function ImageGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const list = images.length
    ? images
    : [{ url: "", alt: name }];

  const prev = useCallback(() => {
    setActive((i) => (i - 1 + list.length) % list.length);
    setZoomed(false);
  }, [list.length]);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % list.length);
    setZoomed(false);
  }, [list.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  const current = list[active];

  return (
    <div>
      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 group">
        {current.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.alt || name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-6xl">
            🚗
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {list.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <button
          onClick={() => setLightbox(true)}
          className="absolute bottom-3 right-3 h-10 px-3 rounded-xl bg-white/90 dark:bg-slate-900/90 flex items-center gap-2 text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Maximize2 className="h-4 w-4" /> Fullscreen
        </button>

        {current.category && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 text-white text-xs capitalize backdrop-blur">
            {current.category}
          </span>
        )}
      </div>

      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative shrink-0 h-16 w-24 rounded-xl overflow-hidden border-2 transition-all",
                i === active
                  ? "border-brand-500 ring-2 ring-brand-500/30"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt={img.alt || `${name} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-slate-200" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <p className="text-white text-sm">
              {active + 1} / {list.length} — {current.alt || name}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setZoomed(!zoomed)}
                className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                aria-label="Zoom"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setLightbox(false);
                  setZoomed(false);
                }}
                className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden px-4">
            {list.length > 1 && (
              <button
                onClick={prev}
                className="absolute left-4 z-10 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {current.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={current.alt || name}
                className={cn(
                  "max-h-full max-w-full object-contain transition-transform duration-300",
                  zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
                )}
                onClick={() => setZoomed(!zoomed)}
              />
            )}

            {list.length > 1 && (
              <button
                onClick={next}
                className="absolute right-4 z-10 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="flex justify-center gap-2 p-4 overflow-x-auto">
            {list.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setActive(i);
                  setZoomed(false);
                }}
                className={cn(
                  "h-14 w-20 rounded-lg overflow-hidden border-2 shrink-0",
                  i === active ? "border-white" : "border-transparent opacity-50"
                )}
              >
                {img.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
