/**
 * Brand theming from a single hex color, with contrast safety.
 * Deterministic: same brandColor → same theme → same pixels.
 */

export interface Theme {
  bg: string;
  bgSoft: string;
  surface: string;
  text: string;
  textDim: string;
  accent: string;
  accentSoft: string;
  gradient: [string, string];
}

export function makeTheme(brandColor: string): Theme {
  const { h, s, l } = hexToHsl(brandColor);

  // Near-white brand colors can't carry a dark cinematic look as accent-on-dark;
  // clamp lightness into a usable band instead of failing.
  const accentL = clamp(l, 0.42, 0.68);
  const accent = hslToHex(h, clamp(s, 0.45, 0.95), accentL);
  const accentSoft = hslToHex(h, clamp(s, 0.35, 0.8), clamp(accentL + 0.14, 0, 0.8));

  const bg = hslToHex(h, clamp(s * 0.45, 0.1, 0.4), 0.055);
  const bgSoft = hslToHex(h, clamp(s * 0.4, 0.08, 0.35), 0.09);
  const surface = hslToHex(h, clamp(s * 0.35, 0.08, 0.3), 0.13);

  // Text is always near-white on our dark canvas; verify and hard-fallback.
  let text = "#F4F4F6";
  if (contrastRatio(text, bg) < 4.5) text = "#FFFFFF";

  return {
    bg,
    bgSoft,
    surface,
    text,
    textDim: "rgba(244,244,246,0.62)",
    accent,
    accentSoft,
    gradient: [accent, hslToHex((h + 40) % 360, clamp(s, 0.5, 0.95), clamp(accentL + 0.08, 0, 0.75))],
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function luminance(hex: string): number {
  const conv = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * conv(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * conv(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * conv(parseInt(hex.slice(5, 7), 16))
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
