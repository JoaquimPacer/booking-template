"use client";

// Floating design-preset switcher for client demos. The layout renders it only
// on Vercel preview deployments and local dev, never in production. Pressing a
// button sets data-style on <html>; every preset's CSS lives in globals.css
// under the matching html[data-style="..."] block, so the whole site restyles
// instantly. The choice persists across reloads for the tab (sessionStorage)
// and across page navigations (the <html> attribute survives soft navigation).

import { useEffect, useState } from "react";

const PRESETS = [
  { value: "classic", label: "Classic" },
  { value: "warm-editorial", label: "A · Editorial" },
  { value: "soft-luxe", label: "B · Luxe" },
  { value: "bold-editorial", label: "C · Bold" },
] as const;

const STORAGE_KEY = "style-preset-preview";

export function StyleSwitcher() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.style ?? "classic";
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && stored !== current) {
      document.documentElement.dataset.style = stored;
      setActive(stored);
    } else {
      setActive(current);
    }
  }, []);

  function apply(value: string) {
    document.documentElement.dataset.style = value;
    sessionStorage.setItem(STORAGE_KEY, value);
    setActive(value);
  }

  // Until mount we don't know the real attribute; render nothing to avoid a
  // mismatched highlight.
  if (!active) return null;

  return (
    <div
      role="group"
      aria-label="Design preset preview switcher"
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-1 rounded-full bg-foreground/90 p-1 shadow-lg backdrop-blur"
    >
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => apply(p.value)}
          aria-pressed={active === p.value}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            active === p.value
              ? "bg-background text-foreground"
              : "text-background/80 hover:text-background"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
