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
}: {
  name: string;
  brand: string;
  concentration?: string;
  sourceUrl: string;
  imageUrl?: string | null;
  large?: boolean;
}) {
  const [result, setResult] = useState<ProductPhotoResult | null>(
    imageUrl ? { images: [{ url: imageUrl, sourceUrl }] } : null,
  );
  const [index, setIndex] = useState(0);
  const [providedBroken, setProvidedBroken] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (imageUrl && !providedBroken) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      name,
      brand,
      concentration,
      source: sourceUrl,
    });
    const load = () => {
      void fetch("/api/catalog/photo?" + params, { signal: controller.signal })
        .then((response) => response.json() as Promise<ProductPhotoResult>)
        .then((data) => {
          if (!controller.signal.aborted) setResult(data);
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
      controller.abort();
    };
  }, [name, brand, concentration, sourceUrl, imageUrl, large, providedBroken]);
  const photo = result?.images[index];
  return (
    <div ref={container} className="product-photo" aria-busy={result === null}>
      {photo ? (
        <>
          {/* Source-matched product images use ordinary image fallback handling. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={`${brand} ${name} bottle`}
            loading={large ? "eager" : "lazy"}
            onError={() => {
              if (
                imageUrl &&
                !providedBroken &&
                index + 1 >= (result?.images.length || 0)
              ) {
                setProvidedBroken(true);
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
              Photo source
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
        </div>
      )}
    </div>
  );
}
