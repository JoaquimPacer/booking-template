import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next/image refuses to load images from any hostname not listed here.
  // cdn.sanity.io is where every Sanity asset (heroes, galleries, photos)
  // lives, so it has to be allowed or every image silently fails to render.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },
};

export default nextConfig;
