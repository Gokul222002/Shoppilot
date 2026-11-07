import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ShopPilot — Compare Prices Across India's Top Stores",
  description:
    "ShopPilot helps you find the lowest prices on phones, laptops, fans, earphones and more — across Amazon.in, Flipkart, Croma, Myntra and Tata CLiQ. No cart. No checkout. Pure price comparison.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased selection:bg-orange-500 selection:text-white flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
