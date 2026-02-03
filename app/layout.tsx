import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ddfc7b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Posted - AI Content Creation Platform",
  description: "Create viral TikTok carousels, videos, and strategies with AI. The all-in-one platform for modern content creators.",
  keywords: ["AI content creation", "TikTok carousels", "social media strategy", "video generation", "content automation"],
  authors: [{ name: "Posted Team" }],
  metadataBase: new URL("https://posted.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Posted - AI Content Creation Platform",
    description: "Create viral TikTok carousels, videos, and strategies with AI.",
    url: "https://posted.app",
    siteName: "Posted",
    images: [
      {
        url: "/logo.svg",
        width: 800,
        height: 600,
        alt: "Posted Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Posted - AI Content Creation Platform",
    description: "Create viral TikTok carousels, videos, and strategies with AI.",
    images: ["/logo.svg"],
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#1f1f1f] text-[#dbdbdb]`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
