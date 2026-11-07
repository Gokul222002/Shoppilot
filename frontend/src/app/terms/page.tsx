import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ArrowLeft, AlertCircle, ExternalLink, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — ShopPilot",
  description: "ShopPilot Terms of Service. Understand our price comparison disclaimer, affiliate model, and user agreement.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-orange-400 mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="border-b border-gray-800 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-3">
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Last updated: November 8, 2026 · Effective Date: January 1, 2026
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
          <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2 text-orange-400">
              <AlertCircle className="w-5 h-5" />
              1. Not a Store & Pricing Disclaimer
            </h2>
            <p className="mb-3">
              ShopPilot is an automated price comparison and market research platform. <strong>ShopPilot is NOT an online store, marketplace, seller, or retailer.</strong> We do not offer products for sale, we do not take payments, and we do not handle packaging, logistics, warranty, or returns.
            </p>
            <p className="text-xs text-gray-400 border-l-2 border-orange-500/60 pl-3">
              <strong>Prices and stock levels change rapidly in e-commerce.</strong> While our connectors synchronize regularly with retailer feeds and APIs, prices displayed on ShopPilot may fluctuate between sync intervals. Always check and confirm the final price, delivery fee, and warranty terms on the merchant&apos;s checkout page before completing any transaction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">2. Affiliate Relationships & Outbound Links</h2>
            <p>
              ShopPilot participates in various affiliate marketing programs, including Amazon Associates, Flipkart Affiliate Network, Cuelinks, and direct merchant partnerships. When you follow an outbound link from ShopPilot to a retailer and make a qualifying purchase, ShopPilot may receive a referral commission at no additional cost to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">3. Acceptable Use Policy</h2>
            <p>You agree not to misuse ShopPilot&apos;s services, which includes prohibiting:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Submitting automated scraping requests or high-frequency automated scraping loops that degrade service reliability.</li>
              <li>Attempting to bypass API rate-limits, tamper with administrative endpoints, or inject adversarial prompts into the AI Shopping Assistant.</li>
              <li>Using our price alert service for spamming or unsolicited communications.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">4. Intellectual Property</h2>
            <p>
              All trademarks, merchant logos, brand names, and product imagery displayed on ShopPilot are the property of their respective trademark holders. Their display is solely for descriptive and comparative purposes under fair dealing provisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">5. Limitation of Liability</h2>
            <p>
              ShopPilot and its operators will not be liable for any indirect, incidental, or consequential damages resulting from price inaccuracies, merchant stock-outs, delayed alert notifications, or transactions conducted with third-party sellers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
