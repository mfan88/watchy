import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "watchy", description: "Live sports channels" };
export const viewport: Viewport = { themeColor: "#06051a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
