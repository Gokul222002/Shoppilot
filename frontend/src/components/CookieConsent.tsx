"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Check, X } from "lucide-react";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("shoppilot_cookie_consent");
    if (!consent) {
      // Small delay for clean entrance
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (type: "all" | "essential") => {
    localStorage.setItem("shoppilot_cookie_consent", type);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-gray-900/95 border border-gray-800 backdrop-blur-md rounded-2xl p-5 shadow-2xl shadow-black/80 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cookie & Privacy Notice</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              ShopPilot uses strictly necessary cookies and local storage to remember your watchlist and alert preferences. We do not use cross-site tracking cookies. Read our{" "}
              <Link href="/privacy" className="text-orange-400 underline hover:text-orange-300">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800/80">
          <button
            type="button"
            onClick={() => handleAccept("essential")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleAccept("all")}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-md shadow-orange-950/40"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
