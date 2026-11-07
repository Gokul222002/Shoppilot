import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PwaRegistrar from "@/components/PwaRegistrar";
import CookieConsent from "@/components/CookieConsent";
import DemoPricesBanner from "@/components/DemoPricesBanner";

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://shoppilot.in"),
  title: "ShopPilot — Compare Prices Across India's Top Stores",
  description:
    "ShopPilot helps you find the lowest prices on phones, laptops, fans, earphones and more — across Amazon.in, Flipkart, Croma, Myntra and Tata CLiQ. No cart. No checkout. Pure price comparison.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "ShopPilot — Intelligent Multi-Store Price Comparison",
    description: "Compare prices side-by-side across Amazon, Flipkart, Croma & Tata CLiQ. Track 12-month price history and get instant drop alerts.",
    url: "https://shoppilot.in",
    siteName: "ShopPilot",
    type: "website",
    images: [
      {
        url: "/api/og?title=ShopPilot%20Price%20Comparison&subtitle=Find%20the%20real%20lowest%20price%20across%20top%20stores",
        width: 1200,
        height: 630,
        alt: "ShopPilot Price Comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopPilot — Price Comparison & Deal Intelligence",
    description: "Find the real lowest prices across Amazon, Flipkart, and Croma with historical price trends.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased selection:bg-orange-500 selection:text-white flex flex-col">
        <DemoPricesBanner />
        <PwaRegistrar />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
