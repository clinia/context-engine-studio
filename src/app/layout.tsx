import type { Metadata } from "next";

import { NextIntlClientProvider } from "next-intl";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinia Studio",
  description:
    "Clinia Studio is a web application for managing and visualizing patient data, including facts, memories, relationships, and clinical events. It provides tools for browsing, searching, and analyzing patient information in a structured and narrative format.",
  manifest: "/site.webmanifest",
  // Clinia's favicon package: a light and a dark tile, picked by the browser's colour scheme.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      ...(["light", "dark"] as const).flatMap((theme) =>
        [16, 32].map((size) => ({
          url: `/favicon/${theme}/favicon-${size}x${size}.png`,
          type: "image/png",
          sizes: `${size}x${size}`,
          media: `(prefers-color-scheme: ${theme})`,
        })),
      ),
    ],
    apple: { url: "/favicon/light/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <NextIntlClientProvider>
          {children}
          {/* At the root so a toast raised just before a navigation outlives it. */}
          <Toaster closeButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
