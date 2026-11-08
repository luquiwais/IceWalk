import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

// Fallback for non-Apple devices; on Apple devices the system stack uses SF Pro.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IceWalk",
  description:
    "EVA planner for shallow ice prospecting on Mars. NASA Space Apps Challenge 2026.",
};

export const viewport: Viewport = {
  themeColor: "#1c120e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="mars-backdrop min-h-full">{children}</body>
    </html>
  );
}
