import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

// Fallback for non-Apple devices; on Apple devices the system stack uses SF Pro.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Claude Design pass: Archivo (width axis for condensed titles) and JetBrains Mono, see app/theme-dc.css.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IceWalk",
  description:
    "EVA planner for shallow ice prospecting on Mars. NASA Space Apps Challenge 2026.",
};

export const viewport: Viewport = {
  themeColor: "#121010",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`dark ${inter.variable} ${archivo.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full bg-black">{children}</body>
    </html>
  );
}
