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

const env = process.env;

export const brand: BrandConfig = {
  name: env.NEXT_PUBLIC_BRAND_NAME ?? "Perfect",
  displayName: env.NEXT_PUBLIC_BRAND_DISPLAY ?? "Perfect",
  tagline:
    env.NEXT_PUBLIC_BRAND_TAGLINE ?? "Team management, simplified.",
  emailDomain: env.NEXT_PUBLIC_BRAND_EMAIL_DOMAIN ?? "perfect.my",
  logo: {
    light: env.NEXT_PUBLIC_BRAND_LOGO_LIGHT ?? "/logo.svg",
    dark: env.NEXT_PUBLIC_BRAND_LOGO_DARK ?? "/logo-white.svg",
  },
  primaryColor: env.NEXT_PUBLIC_BRAND_COLOR ?? "#0052cc",
  fontVar: "var(--font-open-sans)",
};

/** Default primary used in globals.css @theme — BrandVars skips work when equal. */
export const DEFAULT_BRAND_COLOR = "#0052cc";
