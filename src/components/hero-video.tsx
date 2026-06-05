"use client";

// Deferred, fading-in background video for the hero. The hero image paints
// immediately as the poster (and the Largest Contentful Paint element); this
// video waits until after first paint, then loads and fades in over the image,
// so it never blocks the initial page load.

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HeroVideoProps {
  src: string;
  className?: string;
}

export function HeroVideo({ src, className }: HeroVideoProps) {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // A looping autoplay video keeps the viewport repainting, which wrecks the
    // mobile Speed Index and makes the score swing run to run. So load it only
    // on larger screens; phones show the still poster image (fast and stable).
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const t = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      onCanPlay={() => setReady(true)}
      className={cn(
        className,
        "transition-opacity duration-700",
        ready ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
