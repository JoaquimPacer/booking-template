import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Serves the embedded Sanity Studio at the `studio.` subdomain (e.g.
// studio.clientdomain.com) by rewriting that host's page requests into /studio.
// Any other host (the main site) passes through untouched, so this can only
// affect the studio subdomain, never the live marketing site.
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host.startsWith("studio.")) return NextResponse.next();

  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Leave Studio routes, API routes, and Next internals alone; rewrite the rest
  // of the studio host into the embedded Studio at /studio.
  if (
    !pathname.startsWith("/studio") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next")
  ) {
    url.pathname = pathname === "/" ? "/studio" : `/studio${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and any path with a file extension so assets resolve.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
