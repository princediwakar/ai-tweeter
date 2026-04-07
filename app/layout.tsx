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
  title: "AutoGrowth AI | Build Your AI Profile",
  description: "Automate your LinkedIn and Twitter content. Build your personal brand and become a top voice in your industry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-zinc-50 text-zinc-900 selection:bg-zinc-900 selection:text-white`}
      >
        <AuthProvider>
          {children}
          <ClientToaster />
        </AuthProvider>
      </body>
    </html>
  );
}