import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nanggroe OS AI — Autonomous Robotics Platform",
  description:
    "Modular autonomous robotics operating system with AI agents, hardware auto-detection, and multi-project support for Arduino, Raspberry Pi, and more.",
  authors: [{ name: "Mulky Malikul Dhaher", url: "mailto:mulkymalikuldhaher@email.com" }],
  creator: "Mulky Malikul Dhaher",
  keywords: [
    "Nanggroe OS AI",
    "autonomous robotics",
    "AI agents",
    "hardware auto-detection",
    "Arduino",
    "Raspberry Pi",
    "drone",
    "rover",
    "mission planning",
    "telemetry",
  ],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
