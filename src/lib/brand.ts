/**
 * Single brand source of truth. Edit here (or set NEXT_PUBLIC_BRAND_* env)
 * to whitelabel the product — no scattered literals elsewhere.
 */
export interface BrandConfig {
  name: string;
  displayName: string;
  tagline: string;
  emailDomain: string;
  logo: {
    /** Wordmark for light backgrounds (colored) */
    light: string;
    /** Wordmark for dark backgrounds (white) */
    dark: string;
  };
  primaryColor: string;
  fontVar: string;
}

// Direct process.env.NEXT_PUBLIC_* reads only — Next.js webpack inlines those.
// `const env = process.env` leaves bare `process` in the client bundle →
// ReferenceError: process is not defined (breaks login + layout).
export const brand: BrandConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Perfect",
  displayName: process.env.NEXT_PUBLIC_BRAND_DISPLAY ?? "Perfect",
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? "Team management, simplified.",
  emailDomain: process.env.NEXT_PUBLIC_BRAND_EMAIL_DOMAIN ?? "perfect.my",
  logo: {
    light: process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT ?? "/logo.svg",
    dark: process.env.NEXT_PUBLIC_BRAND_LOGO_DARK ?? "/logo-white.svg",
  },
  primaryColor: process.env.NEXT_PUBLIC_BRAND_COLOR ?? "#0052cc",
  fontVar: "var(--font-open-sans)",
};

/** Default primary used in globals.css @theme — BrandVars skips work when equal. */
export const DEFAULT_BRAND_COLOR = "#0052cc";
