"use client";

// Sanity Studio uses browser-only globals (`window`, `document`).
// Loading via next/dynamic with ssr:false skips Next's server-render pass
// entirely for this route, so we never hit "window is not defined" errors.

import dynamic from "next/dynamic";
import config from "../../../../sanity.config";

const NextStudio = dynamic(
  () => import("next-sanity/studio").then((mod) => mod.NextStudio),
  { ssr: false },
);

export default function StudioPage() {
  return <NextStudio config={config} />;
}
