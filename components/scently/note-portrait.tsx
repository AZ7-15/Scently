"use client";
import { useEffect, useRef, useState } from "react";
import { Leaf } from "lucide-react";
export function NotePortrait({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void fetch("/api/notes/portrait?" + new URLSearchParams({ name }), {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          if (!controller.signal.aborted)
            setUrl(
              data &&
                typeof data === "object" &&
                "imageUrl" in data &&
                typeof data.imageUrl === "string"
                ? data.imageUrl
                : null,
            );
        })
        .catch(() => {});
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "250px" },
    );
    if (container.current) observer.observe(container.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [name]);
  return (
    <span className="note-portrait" ref={container}>
      {url && !failed ? (
        // Note portraits are already small source images; ordinary image errors retain the note label.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name + " fragrance note"}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Leaf aria-hidden="true" size={26} strokeWidth={1} />
      )}
    </span>
  );
}
