import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Trash2, Mail, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — ShopPilot",
  description: "ShopPilot Privacy Policy and Data Protection standards. Learn how we handle price alert data and user privacy.",
};

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>DPDP Act (India) & GDPR Compliant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Last updated: November 8, 2026 · Effective Date: January 1, 2026
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
          <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              1. Our Foundational Privacy Principle: We Do Not Sell Products
            </h2>
            <p>
              ShopPilot is strictly a price comparison and deal intelligence engine. 
              <strong> We do not operate a store, we do not maintain a cart, we do not process checkouts, and we never collect credit card or banking information.</strong>
              All commercial transactions occur directly on the respective retailer websites (Amazon.in, Flipkart, Croma, Tata CLiQ, etc.) via outbound referral links.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">2. Information We Collect</h2>
            <p>We believe in minimal data footprint. We only process information necessary to provide price comparison and notification services:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Price Alert Information:</strong> When you set a target price alert, we store your email address or Telegram Chat ID, product reference, and target price threshold.</li>
              <li><strong>Local Preferences:</strong> Stored locally in your browser (LocalStorage) such as dark mode preference, pinned watchlist items, and cookie choices.</li>
              <li><strong>Anonymous Usage Telemetry:</strong> Aggregate search term counts and outbound referral click counts (to improve catalog relevance and maintain affiliate integrity).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">3. Affiliate Links & Third-Party Retailers</h2>
            <p>
              When you click on a store offer link or button (e.g. via <code>/go/[offerId]</code>), you are redirected to the merchant&apos;s site. These third-party retailers operate under their own independent privacy policies and terms. We encourage you to review their policies upon visiting their platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">4. Cookies and Local Storage</h2>
            <p>
              ShopPilot uses strictly necessary cookies and browser LocalStorage to maintain your session preferences and watchlist. We do not use third-party behavioral cross-site tracking cookies. You can manage or revoke cookie consent at any time via our Cookie Preferences banner.
            </p>
          </section>

          <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              5. Right to Erasure & Account Data Deletion
            </h2>
            <p className="text-gray-400">
              In full compliance with India&apos;s Digital Personal Data Protection (DPDP) Act and international privacy frameworks, you have the unconditional right to request total deletion of your stored data.
            </p>
            <p className="text-gray-400">
              You can instantly trigger complete data deletion through your account menu or by emailing our Data Protection Officer at:
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 text-orange-400 font-mono text-xs">
              <Mail className="w-3.5 h-3.5" />
              <span>privacy@shoppilot.in</span>
            </div>
            <p className="text-xs text-gray-500">
              Upon request, all active price drop alerts, linked Telegram IDs, and historical search associations are permanently wiped from our database within 24 hours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">6. Security Measures</h2>
            <p>
              We implement industry-grade security measures including HTTPS TLS 1.3 encryption, rate-limiting on sensitive endpoints, strict Content Security Policies, sanitized database queries, and encrypted environment variable vaults.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
