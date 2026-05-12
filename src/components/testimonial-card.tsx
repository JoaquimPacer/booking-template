// Testimonial card. Quote + star rating + author. Used in home page
// section and the all-testimonials view.

import Image from "next/image";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { urlFor } from "@/lib/sanity-image";
import type { Testimonial } from "@/lib/sanity-queries";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const photoUrl = testimonial.photo
    ? urlFor(testimonial.photo)?.width(80).height(80).fit("crop").url()
    : null;
  const rating = testimonial.rating ?? 5;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={
                i < rating
                  ? "size-4 fill-yellow-400 text-yellow-400"
                  : "size-4 text-foreground/20"
              }
            />
          ))}
        </div>
        <blockquote className="flex-1 text-base text-foreground/90">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <div className="flex items-center gap-3 border-t border-border pt-4">
          {photoUrl && (
            <Image
              src={photoUrl}
              alt={testimonial.author}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium">{testimonial.author}</p>
            {testimonial.authorTitle && (
              <p className="text-xs text-foreground/60">{testimonial.authorTitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
