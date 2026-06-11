import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Branded 404. Keeps lost visitors (and crawlers that follow a dead link)
// inside the site with clear paths back to the pages that matter.
export default function NotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-24 text-center md:py-32">
      <p className="eyebrow">404</p>
      <h1 className="page-title text-4xl font-bold tracking-tight md:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 text-base text-foreground/70">
        That page doesn&rsquo;t exist or has moved. The links below will get
        you back on track.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "h-auto px-6 py-3 text-base")}
        >
          Go home
        </Link>
        <Link
          href="/services"
          className={cn(buttonVariants(), "h-auto px-6 py-3 text-base")}
        >
          Browse services
        </Link>
      </div>
    </div>
  );
}
