import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEME_INIT } from "@/lib/theme";

export const metadata: Metadata = { title: "watchy", description: "Live sports channels" };
export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body>{children}</body>
    </html>
  );
}
