// WHY these tests matter: <BrandTheme> writes the Sanity brand colors into an
// inline <style> in the <head> of every page. The HTML parser reads that tag's
// body as raw text, so a color value containing "</style>" closes the tag and
// whatever follows (a <script>, say) runs as markup on the whole site. Anyone
// who can edit the brand colors in Studio, or any legacy plain-string value in
// the dataset, could do that. The fix must also leave every real color exactly
// as it renders today, so clients keep editing colors in Studio as before.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SiteSettings } from "@/lib/sanity-queries";
import { BrandTheme } from "./brand-theme";

type Brand = NonNullable<SiteSettings["brand"]>;

function render(brand: Record<string, unknown>) {
  const siteSettings = { brand: brand as Brand } as SiteSettings;
  return renderToStaticMarkup(BrandTheme({ siteSettings }));
}

function cssVar(html: string, name: string) {
  return html.match(new RegExp(`${name}: ([^;]*);`))?.[1];
}

describe("BrandTheme", () => {
  const breakout = "red;}</style><script>alert(1)</script><style>";

  it("never lets a color value close the style tag (object shape)", () => {
    const html = render({ primaryColor: { hex: breakout } });
    expect(html.match(/<\/style/gi)).toHaveLength(1);
    expect(html).not.toMatch(/<script/i);
    expect(cssVar(html, "--primary")).toBe("#4f6b5d");
  });

  it("never lets a color value close the style tag (legacy plain string)", () => {
    const html = render({ accentColor: breakout, backgroundColor: "#fff</style><script>x()</script>" });
    expect(html.match(/<\/style/gi)).toHaveLength(1);
    expect(html).not.toMatch(/<script/i);
    expect(cssVar(html, "--accent")).toBe("#b08d57");
    expect(cssVar(html, "--background")).toBe("#f7f4ef");
  });

  it("falls back on CSS that is not a plain color", () => {
    for (const bad of [
      "red; background: url(https://example.com/x.png)",
      "rgb(1,2,3) } body { display:none",
      "rgb(var(--x))",
      "expression(alert(1))",
      "#12345",
      "#ggg",
      "",
    ]) {
      expect(cssVar(render({ primaryColor: bad }), "--primary")).toBe("#4f6b5d");
    }
    expect(cssVar(render({ primaryColor: { hex: 42 } }), "--primary")).toBe("#4f6b5d");
  });

  it("passes every real color format through unchanged", () => {
    const valid = [
      "#4f6b5d", // what Studio's color-input stores (6-digit lowercase hex)
      "#ABC",
      "#abcd",
      "#11223344",
      "rgb(79, 107, 93)",
      "rgba(79, 107, 93, 0.5)",
      "rgb(79 107 93 / 50%)",
      "hsl(150, 15%, 36%)",
      "hsla(150, 15%, 36%, .8)",
      "rebeccapurple",
    ];
    for (const color of valid) {
      expect(cssVar(render({ primaryColor: { hex: color } }), "--primary")).toBe(color);
      expect(cssVar(render({ primaryColor: color }), "--primary")).toBe(color);
    }
  });

  it("keeps the default palette when nothing is configured", () => {
    const html = renderToStaticMarkup(BrandTheme({ siteSettings: null }));
    expect(cssVar(html, "--primary")).toBe("#4f6b5d");
    expect(cssVar(html, "--secondary")).toBe("#e6e0d6");
    expect(cssVar(html, "--accent")).toBe("#b08d57");
    expect(cssVar(html, "--background")).toBe("#f7f4ef");
    expect(cssVar(html, "--foreground")).toBe("#33302b");
  });
});
