import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nanggroe IoT — IoT & Robotics Platform",
  description:
    "Modular IoT & robotics platform with AI agents, hardware auto-detection, and multi-project support for Arduino, Raspberry Pi, and more.",
  authors: [{ name: "Mulky Malikul Dhaher", url: "mailto:mulkymalikuldhaher@email.com" }],
  creator: "Mulky Malikul Dhaher",
  keywords: [
    "Nanggroe IoT",
    "iot",
    "robotics",
    "embedded",
    "arduino",
    "raspberry-pi",
    "automation",
    "drone",
    "rover",
    "sensors",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Nanggroe IoT — IoT & Robotics Platform",
    description: "Modular IoT & robotics platform with AI, hardware auto-detect, and multi-project support.",
    url: "https://github.com/mulkymalikuldhrs/nanggroe-iot",
    siteName: "Nanggroe IoT",
    type: "website",
  },
  metadataBase: new URL("https://github.com/mulkymalikuldhrs/nanggroe-iot"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
