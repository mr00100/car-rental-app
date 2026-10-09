import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

// NOTE: the customer website is fully public and has no authentication.
// Admin/staff auth is mounted only inside src/app/admin/layout.tsx.

export const metadata: Metadata = {
  title: {
    default: "Rent A Car — Cars & Bikes for Rent Inside the City",
    template: "%s | Rent A Car",
  },
  description:
    "Reliable cars and bikes available for rent inside the city. Easy booking, flexible durations, secure EasyPaisa payments.",
  keywords: [
    "car rental",
    "bike rental",
    "rent a car",
    "Lahore",
    "EasyPaisa",
    "vehicle hire",
  ],
  openGraph: {
    title: "Rent A Car — Cars & Bikes for Rent",
    description:
      "Reliable cars and bikes available for rent inside the city.",
    type: "website",
    locale: "en_PK",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
