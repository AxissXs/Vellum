"use client";

import { brand } from "@/lib/brand";

type BrandLogoProps = {
  /** `light` = colored mark on light bg; `dark` = white mark on dark bg */
  variant?: "light" | "dark";
  className?: string;
  showName?: boolean;
};

export function BrandLogo({
  variant = "light",
  className = "h-6 w-auto",
  showName = false,
}: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- brand assets are SVG files in /public */}
      <img
        src={variant === "dark" ? brand.logo.dark : brand.logo.light}
        alt={brand.name}
        className={className}
      />
      {showName && (
        <span className="font-bold text-slate-900 text-lg truncate">
          {brand.name}
        </span>
      )}
    </span>
  );
}
