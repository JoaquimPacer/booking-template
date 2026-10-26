// Injects Sanity-driven brand colors as inline CSS variables on the document.
// Renders in the <head> from src/app/layout.tsx; runs server-side, no client JS.
//
// We override the shadcn CSS variables (--primary, --background, etc.) so the
// entire site retheme happens whenever a client changes their colors in
// Sanity Studio. Studio stores hex; legacy strings can also use the supported
// CSS color grammar below. Bare HSL components are not complete colors.

import type { SanityColor, SiteSettings } from "@/lib/sanity-queries";

interface BrandThemeProps {
  siteSettings: SiteSettings | null;
}

// The colors land inside a raw <style> body, where a value containing
// "</style>" would close the tag and let markup after it run. So only real CSS
// color syntax gets through. var() is deliberately rejected: brand inputs use
// hex, and an unresolved custom property is not a validated color.
const NAMED_COLORS = new Set(`
aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue
blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk
crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki
darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite
gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen
lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen
magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen
mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream
mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen
steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen
transparent currentcolor
`.trim().split(/\s+/));

const NUMBER = /^[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?$/i;

function numeric(value: string, suffix: RegExp = /%$/): boolean {
  const number = value.replace(suffix, "");
  return NUMBER.test(number) && Number.isFinite(Number(number));
}

function isColor(value: string): boolean {
  if (value.length > 64 || /[<>"';{}\\]|(?:url|expression|var)\(/i.test(value)) return false;
  // CSS permits only space, tab, line feed, form feed and carriage return.
  if (/[^\S\t\n\f\r ]/.test(value)) return false;
  // CSS names ignore ASCII casing, not Unicode lookalikes such as Kelvin K.
  const color = value.trim().replace(/[A-Z]/g, (letter) => letter.toLowerCase());
  if (NAMED_COLORS.has(color) || /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(color)) return true;
  const match = /^(rgba?|hsla?)\(([\s\S]*)\)$/.exec(color);
  if (!match) return false;

  const args = match[2];
  const legacy = args.includes(",");
  let channels: string[];
  let alpha: string | undefined;
  if (legacy) {
    const parts = args.split(",").map((part) => part.trim());
    if (parts.length !== 3 && parts.length !== 4) return false;
    channels = parts.slice(0, 3);
    alpha = parts[3];
    // Legacy comma RGB requires matching channel units; alpha is independent.
    if (match[1].startsWith("rgb") && !channels.every((channel) => channel.endsWith("%") === channels[0].endsWith("%"))) return false;
  } else {
    const parts = args.split("/");
    if (parts.length > 2) return false;
    channels = parts[0].trim().split(/\s+/);
    if (channels.length !== 3) return false;
    alpha = parts[1]?.trim();
  }
  if (alpha !== undefined && !numeric(alpha)) return false;
  if (match[1].startsWith("rgb")) return channels.every((channel) => numeric(channel));
  // Only legacy comma HSL requires percentage saturation and lightness.
  return numeric(channels[0], /(?:deg|grad|rad|turn)$/) &&
    channels.slice(1).every((channel) => (!legacy || channel.endsWith("%")) && numeric(channel));
}

// @sanity/color-input stores values as { hex: "#...", ... } objects.
// Accept that shape (and string for backward compat) and return a valid color.
function colorHex(color: SanityColor | string | undefined, fallback: string): string {
  if (!color) return fallback;
  const value = typeof color === "string" ? color : color.hex;
  return typeof value === "string" && isColor(value) ? value : fallback;
}

export function BrandTheme({ siteSettings }: BrandThemeProps) {
  const brand = siteSettings?.brand;

  // Professional, calming default palette (warm cream + sage green + charcoal).
  // A client's Sanity colors override these; an unconfigured deploy still looks
  // intentional rather than stark.
  const primary = colorHex(brand?.primaryColor, "#4f6b5d"); // muted sage green
  const secondary = colorHex(brand?.secondaryColor, "#e6e0d6"); // soft sand
  const accent = colorHex(brand?.accentColor, "#b08d57"); // warm gold
  const background = colorHex(brand?.backgroundColor, "#f7f4ef"); // warm cream
  const foreground = colorHex(brand?.foregroundColor, "#33302b"); // warm charcoal

  // Emit hex values directly. Tailwind v4's @theme inline resolves
  // `bg-primary` -> `background-color: var(--primary)` -> the hex below.
  const css = `:root {
  --primary: ${primary};
  --primary-foreground: ${background};
  --secondary: ${secondary};
  --secondary-foreground: ${foreground};
  --accent: ${accent};
  --accent-foreground: ${foreground};
  --background: ${background};
  --foreground: ${foreground};
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-accent: ${accent};
}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
