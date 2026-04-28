import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/layout/install-prompt";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FamilyHub",
  description: "Home, organised. Places worth remembering, coupons before they expire — kept together for the family.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FamilyHub",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale / userScalable: false — pinch-to-zoom is required for a11y (WCAG 1.4.4).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1815" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col grain">
        <a href="#main" className="skip-link">Skip to content</a>
        <Providers>
          {children}
          <Toaster />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
