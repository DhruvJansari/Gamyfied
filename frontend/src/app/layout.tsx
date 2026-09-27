import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/site-header";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import { Providers } from "./providers";

// Self-hosted via next/font: no external request, no layout shift.
// Exposed to Tailwind as `font-google-sans` (see globals.css).
const googleSans = Google_Sans({
  variable: "--google-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  // next/font has no metric data for Google Sans yet, so it cannot synthesize a
  // size-adjusted fallback; declare the fallback stack explicitly instead.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "StandByDev · Where developers establish their standing",
    template: "%s · StandByDev",
  },
  description:
    "StandByDev turns what you build into a visible standing: projects, proof, a reputation score, a rank on the ladder, and other builders to compete with.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script may add `.dark` before React hydrates.
    <html
      lang="en"
      className={`${googleSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-google-sans">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
