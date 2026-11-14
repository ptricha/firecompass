import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Mentor from "@/components/Mentor";
import GuideTour from "@/components/GuideTour";
import AskWindow from "@/components/AskWindow";
import { LangProvider } from "@/lib/i18n";
import { GuideProvider } from "@/lib/guide";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://japax.vercel.app"),
  title: "JaPax — Fire in space, explained with NASA data",
  description:
    "An AI-assisted dashboard that summarizes, ranks and interprets NASA's microgravity combustion experiments (PSI) to deliver fire-safety insights for the Moon and Mars.",
  openGraph: {
    title: "JaPax — Fire in space, explained with NASA data",
    description:
      "An AI-assisted dashboard that summarizes, ranks and interprets NASA's microgravity combustion experiments (PSI) to deliver fire-safety insights for the Moon and Mars.",
    url: "https://japax.vercel.app",
    siteName: "JaPax",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <GuideProvider>
            <Suspense fallback={<div className="h-14" />}>
              <Nav />
            </Suspense>
            <main className="flex-1">{children}</main>
            <Footer />
            <Mentor />
            <GuideTour />
            <AskWindow />
          </GuideProvider>
        </LangProvider>
      </body>
    </html>
  );
}
