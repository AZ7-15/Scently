"use client";
import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import type { ProductPhoto, ProductPhotoResult } from "@/lib/product-photos";
import { openBeautySearchUrl, photosFromOpenBeautyFacts } from "@/lib/open-beauty-photos";

const beautyRequests = new Map<string, Promise<ProductPhoto[]>>();
const beautyRequestTimes: number[] = [];

function browserBeautyPhotos(name: string, brand: string, concentration: string, excluded: string[]) {
  const key = [brand, name, concentration, ...excluded].join("|");
  const cached = beautyRequests.get(key);
  if (cached) return cached;
  const now = Date.now();
  while (beautyRequestTimes.length && beautyRequestTimes[0] < now - 60_000)
    beautyRequestTimes.shift();
  if (beautyRequestTimes.length >= 20) return Promise.resolve([]);
  beautyRequestTimes.push(now);
  const request = (async () => {
    try {
      const response = await fetch(openBeautySearchUrl(name, brand), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok || Number(response.headers.get("content-length") || 0) > 250_000)
        return [];
      const body = await response.text();
      if (body.length > 250_000) return [];
      return photosFromOpenBeautyFacts(JSON.parse(body), name, brand, concentration, excluded);
    } catch {
      return [];
    }
  })();
  if (beautyRequests.size >= 128) beautyRequests.delete(beautyRequests.keys().next().value!);
  beautyRequests.set(key, request);
  return request;
}

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
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
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
        .then(async (data) => {
          if (controller.signal.aborted) return;
          if (data.retryAfter && attempts++ < 3) {
            retryTimer = setTimeout(load, Math.min(10, data.retryAfter) * 1000);
          } else {
            const images = Array.isArray(data.images) ? data.images : [];
            const resolved = images.length
              ? images
              : await browserBeautyPhotos(name, brand, concentration, excludedImages);
            if (controller.signal.aborted) return;
            setIndex(0);
            setResult({ images: resolved });
          }
        })
        .catch(async () => {
          if (controller.signal.aborted) return;
          const images = await browserBeautyPhotos(name, brand, concentration, excludedImages);
          if (!controller.signal.aborted) setResult({ images });
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
  const photoFailed = !!photo && failedPhotoUrl === photo.url;
  const imageSrc = photo?.url.match(
    /^https:\/\/(?:imagedelivery\.net|cdn\.shopify\.com)\//i,
  )
    ? "/api/catalog/image?url=" + encodeURIComponent(photo.url)
    : photo?.url;
  const isTransparentCutout = !!photo?.url.match(
    /\/images\/products\/(?:sauvage-edp-cutout|santal-33-cutout|another-13-cutout|tobacco-vanille|wood-sage-sea-salt)\.png(?:$|\?)/i,
  );
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
    <div
      ref={container}
      className={"product-photo" + (isTransparentCutout ? " photo-cutout" : "")}
      aria-busy={result === null}
    >
      {photo && imageSrc && !photoFailed ? (
        <>
          {/* Source-matched product images use ordinary image fallback handling. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageElement}
            src={imageSrc}
            alt={`${brand} ${name} bottle`}
            loading={large ? "eager" : "lazy"}
            onError={() => {
              setFailedPhotoUrl(photo.url);
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
                : photo.sourceUrl.startsWith("https://world.openbeautyfacts.org/product/")
                  ? "Open Beauty Facts (CC BY-SA)"
                  : "Photo source"}
            </a>
          )}
        </>
      ) : null}
      {result !== null && (!photo || photoFailed) && (
        <div className="photo-unavailable" aria-label={`${brand} ${name} product photo unavailable`}>
          <ImageOff aria-hidden="true" size={large ? 22 : 16} strokeWidth={1.5} />
          {large && <span>Product photo unavailable</span>}
          {large && (
            <button
              type="button"
              className="photo-retry"
              onClick={() => {
                setIndex(0);
                setResult(null);
                failedUrls.current.clear();
                setFailedPhotoUrl(null);
                setExcludedImages([]);
                setRetry((n) => n + 1);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
