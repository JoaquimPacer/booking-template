// Builds a COMPLETE @sanity/color-input value from a hex string.
//
// WHY THIS EXISTS: the color-input plugin stores a rich object
// { _type:"color", hex, alpha, hsl, hsv, rgb } and its UI needs all of those
// sub-objects to render the swatch + picker. Writing a partial object (just hex)
// makes the picker render blank, which is the regression this fixes.

export interface SanityColorValue {
  _type: "color";
  alpha: number;
  hex: string;
  hsl: { _type: "hslaColor"; a: number; h: number; s: number; l: number };
  hsv: { _type: "hsvaColor"; a: number; h: number; s: number; v: number };
  rgb: { _type: "rgbaColor"; a: number; r: number; g: number; b: number };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, v };
}

/** Full color-input value for a hex like "#4f6b5d". Alpha always 1 (opaque). */
export function colorFromHex(hex: string): SanityColorValue {
  const normalized = hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
  const { r, g, b } = hexToRgb(normalized);
  const hsl = rgbToHsl(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  return {
    _type: "color",
    alpha: 1,
    hex: normalized,
    hsl: { _type: "hslaColor", a: 1, h: hsl.h, s: hsl.s, l: hsl.l },
    hsv: { _type: "hsvaColor", a: 1, h: hsv.h, s: hsv.s, v: hsv.v },
    rgb: { _type: "rgbaColor", a: 1, r, g, b },
  };
}
