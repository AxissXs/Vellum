"use client";

import { useEffect } from "react";
import { brand, DEFAULT_BRAND_COLOR } from "@/lib/brand";

type RGB = { r: number; g: number; b: number };

function parseHex(hex: string): RGB | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function toHex({ r, g, b }: RGB): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Build Tailwind-like 50–900 scale from a primary (≈500) hex. */
function buildScale(primaryHex: string): Record<string, string> {
  const primary = parseHex(primaryHex);
  if (!primary) return {};
  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 0, g: 0, b: 0 };
  return {
    "50": toHex(mix(primary, white, 0.92)),
    "100": toHex(mix(primary, white, 0.84)),
    "200": toHex(mix(primary, white, 0.68)),
    "300": toHex(mix(primary, white, 0.48)),
    "400": toHex(mix(primary, white, 0.24)),
    "500": toHex(primary),
    "600": toHex(mix(primary, black, 0.18)),
    "700": toHex(mix(primary, black, 0.32)),
    "800": toHex(mix(primary, black, 0.48)),
    "900": toHex(mix(primary, black, 0.64)),
  };
}

/**
 * Injects `--color-brand-*` CSS vars from `brand.primaryColor`.
 * No-op when primary equals the globals.css default (avoids FOUC).
 */
export function BrandVars() {
  useEffect(() => {
    const primary = brand.primaryColor.toLowerCase();
    if (primary === DEFAULT_BRAND_COLOR.toLowerCase()) return;

    const scale = buildScale(brand.primaryColor);
    const root = document.documentElement;
    for (const [shade, hex] of Object.entries(scale)) {
      root.style.setProperty(`--color-brand-${shade}`, hex);
    }
  }, []);

  return null;
}
