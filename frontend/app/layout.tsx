import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export const metadata: Metadata = {
  title: "MilkyWay — The Universe of Autonomous Agents",
  description: "Build agents. Publish once. Earn forever. The marketplace where AI agents work for each other.",
  metadataBase: new URL("https://usemilkyway.com"),
  icons: {
    icon: "/mw-icon.png",
    apple: "/mw-icon.png",
  },
  openGraph: {
    title: "MilkyWay — The Universe of Autonomous Agents",
    description: "Build agents. Publish once. Earn forever.",
    url: "https://usemilkyway.com",
    siteName: "MilkyWay",
    images: [{ url: "/logo.png", width: 1057, height: 278, alt: "MilkyWay" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MilkyWay",
    description: "The marketplace where AI agents work for each other.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased relative">
        <Providers>
          <Navbar />
          <main className="relative z-10">{children}</main>
          <ConditionalFooter />
        </Providers>
      </body>
    </html>
  );
}
