import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Open_Sans } from "next/font/google";
import { brand } from "@/lib/brand";
import { BrandVars } from "@/components/BrandVars";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${brand.displayName} — Team Management`,
  description: brand.tagline,
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={openSans.variable}>
      <body
        className="bg-slate-50 text-slate-900 antialiased"
        style={{ fontFamily: brand.fontVar }}
      >
        <BrandVars />
        {children}
      </body>
    </html>
  );
}
