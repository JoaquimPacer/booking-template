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
  const fields = [
    ["primaryColor", "--primary", "#4f6b5d"],
    ["secondaryColor", "--secondary", "#e6e0d6"],
    ["accentColor", "--accent", "#b08d57"],
    ["backgroundColor", "--background", "#f7f4ef"],
    ["foregroundColor", "--foreground", "#33302b"],
  ];

  for (const shape of ["object", "string"]) {
    const input = (value: string) => shape === "object" ? { hex: value } : value;

    it(`preserves every configured default color (${shape})`, () => {
      for (const [field, variable, fallback] of fields) {
        expect(cssVar(render({ [field]: input(fallback) }), variable)).toBe(fallback);
      }
    });

    // Modern HSL permits numbers and percentages independently for both
    // saturation and lightness. Legacy comma syntax still requires percentages.
    const numericHsl = [
      "hsl(180 50 50)", "hsla(180 50 50)",
      "hsl(180 50% 50)", "hsla(180 50% 50)",
      "hsl(180 50 50%)", "hsla(180 50 50%)",
      "hsl(180deg 50 50 / .5)", "hsla(200grad 50 50 / 50%)",
      "hsl(3.14rad 50% 50 / 50%)", "hsla(180deg 50% 50 / .5)",
      "hsl(.5turn 50 50% / .5)", "hsla(.5turn 50 50% / 50%)",
    ];
    for (const [field, variable] of fields) {
      it.each(numericHsl)(`preserves modern numeric HSL in ${field} (${shape}): %s`, (value) => {
        expect(cssVar(render({ [field]: input(value) }), variable)).toBe(value);
      });
    }

    it(`rejects numeric saturation or lightness in legacy comma HSL (${shape})`, () => {
      for (const modern of numericHsl) {
        const legacy = modern.replace(/\s*\/\s*|\s+/g, ", ");
        for (const [field, variable, fallback] of fields) {
          expect(cssVar(render({ [field]: input(legacy) }), variable)).toBe(fallback);
        }
      }
    });

    it(`rejects Unicode lookalikes in named colors (${shape})`, () => {
      for (const value of ["blac\u212a", "dar\u212ablue"]) {
        for (const [field, variable, fallback] of fields) {
          expect(cssVar(render({ [field]: input(value) }), variable)).toBe(fallback);
        }
      }
    });

    it(`accepts CSS whitespace inside functions (${shape})`, () => {
      for (const value of ["rgb(1\n2\n3)", "hsl(180deg,\n100%,\n50%)", "rgba(1\t2\f3 / .5)"]) {
        for (const [field, variable] of fields) {
          expect(cssVar(render({ [field]: input(value) }), variable)).toBe(value);
        }
      }
    });

    it(`rejects non-CSS whitespace (${shape})`, () => {
      for (const value of ["rgb(1\u00a02 3)", "\u00a0red", "rgb(1\v2 3)"]) {
        for (const [field, variable, fallback] of fields) {
          expect(cssVar(render({ [field]: input(value) }), variable)).toBe(fallback);
        }
      }
    });

    it(`rejects mixed legacy RGB channel units (${shape})`, () => {
      for (const value of ["rgb(1, 20%, 3)", "rgba(10%, 2, 30%, .5)"]) {
        for (const [field, variable, fallback] of fields) {
          expect(cssVar(render({ [field]: input(value) }), variable)).toBe(fallback);
        }
      }
    });

    it(`accepts semantic color grammar for every field (${shape})`, () => {
      const valid = [
        "RGB(1, 2, 3)", "hsl(180deg, 100%, 50%)", "hsl(0.5turn 100% 50%)",
        "#abc", "#abcd", "#abcdef", "#abcdef12",
        "rgb(1 2 3)", "rgba(1 2 3 / .5)", "rgb(10%, 20%, 30%, 50%)",
        "rgba(10% 20% 30%)", "RGB(1 20% 3 / 50%)", "rgb(1e2 2 3)",
        "hsl(3.14rad 100% 50%)", "hsla(200grad, 100%, 50%, 0.5)",
        "HSLA(-180deg 100% 50% / 25%)", "hsl(+180 100% 50%)",
        "AliceBlue", "rebeccapurple", "LightGoldenRodYellow", "TRANSPARENT", "currentColor",
      ];
      for (const value of valid) {
        for (const [field, variable] of fields) {
          expect(cssVar(render({ [field]: input(value) }), variable)).toBe(value);
        }
      }
    });

    it(`rejects malformed and hostile colors for every field (${shape})`, () => {
      const invalid = [
        "definitelynotacolor", "rgb(1)", "rgb(1,,2)", "a".repeat(100_000),
        "rgb(1,2)", "rgb(1,2,3,4,5)", "rgb(1 2 3 4)", "rgb(1, 2 3)",
        "rgb(1,2,3 / .5)", "rgb(1 2 3 /)", "rgb(1 2 3 / .5 / .6)",
        "rgb(1..0 2 3)", "rgb(NaN 2 3)", "rgb(1e999 2 3)", "rgb(1deg 2 3)",
        "hsl(180, 50, 50)", "hsl(180foo 50% 50%)", "hsl(180% 50% 50%)",
        "hsl(0.5 turn 100% 50%)", "#12", "#12345", "#1234567", "#ggg",
        "</style>", "<script>", "expression(url())", "red\"", "red'", "red;",
        "red{", "red}", "red\\", "url(x)", "var(--brand)", "rgb(var(--x))",
        "rgb(1 2 3)" + " ".repeat(65), "", "   ",
      ];
      for (const value of invalid) {
        for (const [field, variable, fallback] of fields) {
          const html = render({ [field]: input(value) });
          expect(cssVar(html, variable)).toBe(fallback);
          expect(html.match(/<\/style/gi)).toHaveLength(1);
          expect(html).not.toMatch(/<script/i);
        }
      }
    });
  }

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
