"use client";
import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import type { ProductPhotoResult } from "@/lib/product-photos";
export function ProductPhoto({
  name,
  brand,
  concentration = "",
  sourceUrl,
  imageUrl,
  large = false,
  creditLabel = "Photo source",
}: {
  name: string;
  brand: string;
  concentration?: string;
  sourceUrl: string;
  imageUrl?: string | null;
  large?: boolean;
  creditLabel?: string;
}) {
  const [result, setResult] = useState<ProductPhotoResult | null>(
    imageUrl ? { images: [{ url: imageUrl, sourceUrl }] } : null,
  );
  const [index, setIndex] = useState(0);
  const [providedBroken, setProvidedBroken] = useState(false);
  const [retry, setRetry] = useState(0);
  const failedUrls = useRef(new Set<string>());
  const [excludedImages, setExcludedImages] = useState<string[]>([]);
  const container = useRef<HTMLDivElement>(null);
  const imageElement = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (imageUrl && !providedBroken) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      name,
      brand,
      concentration,
      source: sourceUrl,
    });
    if (retry) params.set("retry", "1");
    for (const url of excludedImages) params.append("failed", url);
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const load = () => {
      void fetch("/api/catalog/photo?" + params, { signal: controller.signal })
        .then((response) => response.json() as Promise<ProductPhotoResult>)
        .then((data) => {
          if (controller.signal.aborted) return;
          if (data.retryAfter && attempts++ < 3) {
            retryTimer = setTimeout(load, Math.min(10, data.retryAfter) * 1000);
          } else {
            setIndex(0);
            setResult({
              images: Array.isArray(data.images) ? data.images : [],
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ images: [] });
        });
    };
    let observer: IntersectionObserver | undefined;
    if (large || typeof IntersectionObserver === "undefined") load();
    else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            load();
          }
        },
        { rootMargin: "400px" },
      );
      if (container.current) observer.observe(container.current);
    }
    return () => {
      observer?.disconnect();
      clearTimeout(retryTimer);
      controller.abort();
    };
  }, [
    name,
    brand,
    concentration,
    sourceUrl,
    imageUrl,
    large,
    providedBroken,
    retry,
    excludedImages,
  ]);
  const photo = result?.images[index];
  useEffect(() => {
    const element = imageElement.current;
    let cancelled = false;
    if (element?.complete && element.currentSrc && element.naturalWidth === 0) {
      void element.decode().catch(() => {
        if (!cancelled && element.complete && element.naturalWidth === 0)
          element.dispatchEvent(new Event("error"));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [photo?.url]);
  return (
    <div ref={container} className="product-photo" aria-busy={result === null}>
      {photo ? (
        <>
          {/* Source-matched product images use ordinary image fallback handling. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageElement}
            src={photo.url}
            alt={`${brand} ${name} bottle`}
            loading={large ? "eager" : "lazy"}
            onError={() => {
              failedUrls.current.add(photo.url);
              if (index + 1 < (result?.images.length || 0))
                setIndex((value) => value + 1);
              else if (failedUrls.current.size <= 4) {
                setProvidedBroken(true);
                setExcludedImages([...failedUrls.current]);
                setIndex(0);
                setResult(null);
              } else setIndex((value) => value + 1);
            }}
          />
          {large && (
            <a
              className="photo-credit"
              href={photo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {!providedBroken && photo.url === imageUrl
                ? creditLabel
                : "Photo source"}
            </a>
          )}
        </>
      ) : (
        <div className="photo-unavailable">
          <ImageOff size={28} strokeWidth={1} />
          <span>
            {result === null
              ? "Finding product photo…"
              : "Product photo unavailable"}
          </span>
          {result !== null && (
            <button
              type="button"
              className="photo-retry"
              onClick={() => {
                setIndex(0);
                setResult(null);
                failedUrls.current.clear();
                setExcludedImages([]);
                setRetry((n) => n + 1);
              }}
            >
              Try photo again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
