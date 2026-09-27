// app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientToaster } from "@/components/ui/ClientToaster";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AutoGrowth | Automated Social Media for Founders & Creators",
  description: "Turn your website or blog into high-performing Twitter & LinkedIn posts. Fully automated or review every post before publishing.",
};

import { preconnect, prefetchDNS } from "react-dom";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // React 19 Asset Preloading: Eliminate DNS and connection latency for critical third-party domains
  prefetchDNS("https://api.twitter.com");
  preconnect("https://fonts.googleapis.com", { crossOrigin: "anonymous" });
  preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });
  return (
    <html lang="en" className="antialiased">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans magic-bg text-zinc-900 selection:bg-zinc-900 selection:text-white`}
      >
        <AuthProvider>
          {children}
          <ClientToaster />
        </AuthProvider>
      </body>
    </html>
  );
}