import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "vaiefecha — Gestão de viagens e despesas",
    template: "%s · vaiefecha",
  },
  description: "Gestão inteligente de despesas de viagem.",
  applicationName: "vaiefecha",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/vaiefecha-icone-dark.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "vaiefecha",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f6f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
