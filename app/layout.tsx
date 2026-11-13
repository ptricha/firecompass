import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import GuideBanner from "@/components/GuideBanner";
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
  title: "JaPax — Fire in space, explained with NASA data",
  description:
    "An AI-assisted dashboard that summarizes, ranks and interprets NASA's microgravity combustion experiments (PSI) to deliver fire-safety insights for the Moon and Mars.",
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
              <div className="sticky top-14 z-30 backdrop-blur">
                <GuideBanner />
              </div>
            </Suspense>
            <main className="flex-1">{children}</main>
            <Footer />
          </GuideProvider>
        </LangProvider>
      </body>
    </html>
  );
}
