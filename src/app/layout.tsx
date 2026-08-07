import type { Metadata } from "next";

import { NextIntlClientProvider } from "next-intl";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinia Studio",
  description:
    "Clinia Studio is a web application for managing and visualizing patient data, including facts, memories, relationships, and clinical events. It provides tools for browsing, searching, and analyzing patient information in a structured and narrative format.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
