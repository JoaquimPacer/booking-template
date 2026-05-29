// Maps the Sanity-editable CTA "size" and "align" choices to Tailwind classes.
// Shared by the hero and header so a button looks the same wherever it appears.
//
// These classes are applied AFTER the shadcn buttonVariants() via cn() (which uses
// tailwind-merge), so "h-auto" + the padding here override the variant's fixed
// height. That's what lets a client actually make a button visibly bigger.

export type CtaSize = "small" | "normal" | "large" | "xlarge";
export type CtaAlign = "left" | "center" | "right";

/** Padding + text size per CTA size. h-auto lets padding drive the height. */
export function ctaSizeClasses(size: CtaSize | undefined): string {
  switch (size) {
    case "small":
      return "h-auto px-5 py-2 text-sm";
    case "large":
      return "h-auto px-8 py-3.5 text-lg";
    case "xlarge":
      return "h-auto px-10 py-4 text-xl";
    case "normal":
    default:
      return "h-auto px-6 py-3 text-base";
  }
}

/** Flex justification for the button's container (controls left/center/right). */
export function ctaAlignClass(align: CtaAlign | undefined): string {
  switch (align) {
    case "left":
      return "justify-start";
    case "right":
      return "justify-end";
    case "center":
    default:
      return "justify-center";
  }
}
