import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopPilot | Autonomous Multimodal Browser Agent",
  description: "Autonomous Multimodal Browser Agent for Automated Deal Hunting and Checkout Simulations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
