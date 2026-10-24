import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { THEME_INIT } from "@/lib/theme";

// Brand face for the "watchy" wordmark only (Basic Latin subset, swap while loading).
const logoFont = localFont({ src: "./fonts/anxler.woff2", display: "swap", variable: "--font-logo" });

export const metadata: Metadata = { title: "watchy", description: "Live sports channels" };
export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={logoFont.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body>{children}</body>
    </html>
  );
}
