// Custom Sanity Studio input for picking a Google Font.
// Each dropdown option is rendered in its own font face so editors see
// what each font actually looks like before choosing.
//
// Used by sanity/schemas/objects/brand.ts on headingFont and bodyFont.

import { useEffect } from "react";
import type { StringInputProps } from "sanity";
import { set, unset } from "sanity";

// Google Fonts URLs for inline preview inside Studio. Each href loads only
// the families we offer; if you add a new font option here, add it to the
// Google Fonts URL too AND to the schema options in brand.ts.
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;700&family=Inter:wght@400;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@400;600;700&family=Poppins:wght@400;600;700&family=DM+Serif+Display:wght@400&display=swap";

const FONT_OPTIONS = [
  // Sans-serif (clean, modern)
  { value: "Geist", label: "Geist (modern, clean sans-serif; default)" },
  { value: "Inter", label: "Inter (versatile modern sans-serif)" },
  { value: "Montserrat", label: "Montserrat (modern geometric sans)" },
  { value: "Poppins", label: "Poppins (friendly, rounded sans)" },
  // Serif (elegant, traditional)
  { value: "Playfair Display", label: "Playfair Display (elegant serif; luxury feel)" },
  { value: "DM Serif Display", label: "DM Serif Display (striking display serif; great for headings)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (refined, spa-like serif)" },
  { value: "Lora", label: "Lora (warm serif; approachable)" },
  { value: "Merriweather", label: "Merriweather (traditional serif)" },
];

export function FontPicker(props: StringInputProps) {
  const { value, onChange } = props;

  // Inject Google Fonts <link> in Studio once on mount so the previews
  // actually render in their respective fonts. Idempotent.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector(`link[href="${GOOGLE_FONTS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.currentTarget.value;
    onChange(next ? set(next) : unset());
  }

  return (
    <select
      value={value ?? ""}
      onChange={handleChange}
      style={{
        width: "100%",
        padding: "0.5rem 0.75rem",
        fontSize: "0.9rem",
        borderRadius: "0.375rem",
        border: "1px solid var(--card-border-color, #ccc)",
        background: "var(--card-bg-color, #fff)",
        color: "var(--card-fg-color, #000)",
        // Apply the current value's font to the field itself so the
        // selected option always shows in its own typeface.
        fontFamily: value ? `"${value}", system-ui, sans-serif` : undefined,
      }}
    >
      <option value="">(Default)</option>
      {FONT_OPTIONS.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          style={{ fontFamily: `"${opt.value}", system-ui, sans-serif` }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );
}
