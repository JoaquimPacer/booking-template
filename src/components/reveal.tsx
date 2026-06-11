"use client";

// Scroll-reveal wrapper. Marks itself data-reveal="visible" the first time it
// enters the viewport, then disconnects. ALL styling lives in globals.css and
// only applies under the Soft Luxe preset with JavaScript present and no
// reduced-motion preference; in every other case this renders as a plain,
// fully visible div. Cost: one IntersectionObserver per wrapped block.

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms (capped at 300 so late items never feel sluggish). */
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.reveal = "visible";
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={className}
      style={
        delay
          ? { ["--reveal-delay" as string]: `${Math.min(delay, 300)}ms` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
