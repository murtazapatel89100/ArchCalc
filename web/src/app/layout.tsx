import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://archcalc.com",
  ),
  title: "ArchCalc | Advanced Workspace & Dev Tools",
  description:
    "The definitive workspace and dev tools platform for system reading, hashing, and more.",
  keywords: [
    "developer tools",
    "workspace",
    "system reading",
    "command execution",
    "calculator",
    "productivity",
  ],
  authors: [{ name: "ArchCalc Team" }],
  creator: "ArchCalc",
  publisher: "ArchCalc",
  openGraph: {
    title: "ArchCalc | Advanced Workspace & Dev Tools",
    description: "The definitive workspace and dev tools platform.",
    url: "/",
    siteName: "ArchCalc",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArchCalc | Advanced Workspace & Dev Tools",
    description: "The definitive workspace and dev tools platform.",
    creator: "@ArchCalc",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
