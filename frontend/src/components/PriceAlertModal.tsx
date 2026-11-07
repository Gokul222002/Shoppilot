"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle, Mail, Tag, ShieldCheck } from "lucide-react";
import type { Product } from "@/lib/mock-connector";

interface PriceAlertModalProps {
  product: Product;
  currentPrice: number;
  isOpen: boolean;
  onClose: () => void;
}

export interface WishlistItem {
  productId: string;
  name: string;
  category: string;
  imageUrl: string;
  currentPrice: number;
  targetPrice: number;
  email: string;
  createdAt: string;
  slug: string;
  cheapestStore: string;
  cheapestUrl: string;
}

export default function PriceAlertModal({
  product,
  currentPrice,
  isOpen,
  onClose,
}: PriceAlertModalProps) {
  const suggestedTarget = Math.round(currentPrice * 0.9); // 10% drop target
  const [targetPrice, setTargetPrice] = useState<number>(suggestedTarget);
  const [email, setEmail] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState<boolean>(false);

  async function handleGetTelegramCode() {
    if (!email) return;
    setTelegramLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/alerts/telegram/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setTelegramCode(data.code);
        setTelegramLink(data.deep_link);
      }
    } catch (err) {
      console.error("Error generating telegram code:", err);
    } finally {
      setTelegramLoading(false);
    }
  }

  useEffect(() => {
    // Read saved email if any
    const savedEmail = localStorage.getItem("shoppilot_user_email");
    if (savedEmail) setEmail(savedEmail);
    setTargetPrice(Math.round(currentPrice * 0.9));
    setSubmitted(false);
  }, [currentPrice, isOpen]);

  if (!isOpen) return null;

  const bestOffer = product.offers.reduce((a, b) => (a.price < b.price ? a : b));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !targetPrice) return;

    setLoading(true);

    // Save user email preference
    localStorage.setItem("shoppilot_user_email", email);

    // Build wishlist item
    const newItem: WishlistItem = {
      productId: product.id,
      name: product.name,
      category: product.category,
      imageUrl: product.imageUrl,
      currentPrice,
      targetPrice,
      email,
      createdAt: new Date().toISOString(),
      slug: product.slug,
      cheapestStore: bestOffer.store,
      cheapestUrl: bestOffer.url,
    };

    // Store in localStorage
    try {
      const existingStr = localStorage.getItem("shoppilot_wishlist");
      const list: WishlistItem[] = existingStr ? JSON.parse(existingStr) : [];
      // Replace if existing product, or append
      const filtered = list.filter((i) => i.productId !== product.id);
      filtered.unshift(newItem);
      localStorage.setItem("shoppilot_wishlist", JSON.stringify(filtered));
    } catch (err) {
      console.error("Local storage error:", err);
    }

    // Call backend alert registration API
    try {
      await fetch("http://127.0.0.1:8000/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.name,
          email,
          target_price: targetPrice,
          current_price: currentPrice,
        }),
      });
    } catch (err) {
      // Backend sync fallback: alert is still safely preserved in local wishlist
    }

    setLoading(false);
    setSubmitted(true);
  }

  const dropAmount = Math.max(0, currentPrice - targetPrice);
  const dropPct = currentPrice > 0 ? Math.round((dropAmount / currentPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          /* Success Confirmation State */
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Price Alert Activated!</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                We are tracking 5 stores daily. You will receive an email at{" "}
                <strong className="text-white">{email}</strong> the moment this item drops to{" "}
                <strong className="text-emerald-400">₹{targetPrice.toLocaleString("en-IN")}</strong>.
              </p>
            </div>

            {/* Telegram 1-Click Linking Option */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                  ⚡ Want instant Telegram alerts?
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  Phase F
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Link your Telegram account using a 6-digit one-time code to get notified before stock runs out.
              </p>

              {telegramCode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700">
                    <span className="text-xs text-slate-400">Your Linking Code:</span>
                    <span className="text-base font-mono font-black text-amber-300 tracking-widest">
                      {telegramCode}
                    </span>
                  </div>
                  {telegramLink && (
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"
                    >
                      Open @ShopPilotAlertsBot on Telegram →
                    </a>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGetTelegramCode}
                  disabled={telegramLoading}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  {telegramLoading ? "Generating Code..." : "Generate Telegram Linking Code"}
                </button>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form State */
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Track Price &amp; Get Alert
                </h3>
                <p className="text-xs text-gray-400 truncate max-w-[260px]">{product.name}</p>
              </div>
            </div>

            {/* Current vs Target Price Bar */}
            <div className="bg-gray-950 p-3.5 rounded-2xl border border-gray-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 block">Current Best Price</span>
                <span className="text-base font-bold text-white">
                  ₹{currentPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-orange-400 font-semibold block">Target Drop</span>
                <span className="text-sm font-bold text-emerald-400">
                  -₹{dropAmount.toLocaleString("en-IN")} ({dropPct}%)
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Price Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="target-price"
                  className="text-xs font-bold uppercase tracking-wider text-gray-300 flex justify-between"
                >
                  <span>Alert me when price reaches (₹)</span>
                  <span className="text-gray-400 font-normal">e.g. ₹{suggestedTarget}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    id="target-price"
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(Number(e.target.value))}
                    max={currentPrice}
                    min={100}
                    required
                    className="w-full bg-gray-950 border border-gray-700 focus:border-orange-500 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white outline-none font-bold"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((pct) => {
                  const val = Math.round(currentPrice * (1 - pct / 100));
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTargetPrice(val)}
                      className={`text-[11px] flex-1 py-1.5 rounded-lg border font-semibold transition-colors ${
                        targetPrice === val
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700"
                      }`}
                    >
                      -{pct}%
                    </button>
                  );
                })}
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="alert-email"
                  className="text-xs font-bold uppercase tracking-wider text-gray-300"
                >
                  Your Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="alert-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    required
                    className="w-full bg-gray-950 border border-gray-700 focus:border-orange-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-gray-400 block flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Zero spam. We only send one email if your target price is reached.
                </span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-orange-500/20"
              >
                {loading ? "Activating Alert…" : "Activate Price Alert"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
