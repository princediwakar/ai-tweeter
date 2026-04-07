// app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
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
  title: "AutoGrowth Engine | Command Center",
  description: "Autonomous social routing, AI model configuration, and deployment infrastructure.",
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
          <Toaster 
            toastOptions={{
              className: 'border-zinc-200 bg-white text-zinc-900 shadow-sm rounded-xl font-medium',
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}