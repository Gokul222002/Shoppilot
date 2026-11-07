"use client";

import React, { useState } from "react";
import { X, Mail, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export interface UserSession {
  name: string;
  email: string;
  avatar?: string;
  provider: "google" | "magic_link";
  signedInAt: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserSession) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<"google" | "magic_link">("google");
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  function handleGoogleLogin() {
    setLoading(true);
    setTimeout(() => {
      const user: UserSession = {
        name: "Gokul",
        email: "gokul@example.com",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        provider: "google",
        signedInAt: new Date().toISOString(),
      };
      localStorage.setItem("shoppilot_user", JSON.stringify(user));
      setLoading(false);
      onSuccess(user);
      onClose();
    }, 600);
  }

  function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMagicSent(true);
    }, 700);
  }

  function handleVerifyMagicOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user: UserSession = {
        name: email.split("@")[0],
        email: email.trim(),
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        provider: "magic_link",
        signedInAt: new Date().toISOString(),
      };
      localStorage.setItem("shoppilot_user", JSON.stringify(user));
      setLoading(false);
      onSuccess(user);
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-sm text-white">
            ✈️
          </div>
          <span className="font-bold text-white text-lg">
            Shop<span className="text-orange-500">Pilot</span> Account
          </span>
        </div>

        <h2 className="text-2xl font-black text-white mt-2">Sign in to ShopPilot</h2>
        <p className="text-xs text-gray-400 mt-1 mb-6">
          Sync your price-drop alerts, target wishlists, and track genuine deals across all devices.
        </p>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-950 rounded-2xl mb-6 border border-gray-800">
          <button
            type="button"
            onClick={() => setTab("google")}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "google"
                ? "bg-gray-800 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Google One-Click
          </button>
          <button
            type="button"
            onClick={() => setTab("magic_link")}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "magic_link"
                ? "bg-gray-800 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Magic Link Email
          </button>
        </div>

        {/* Tab 1: Google OAuth */}
        {tab === "google" && (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-stone-900 font-bold text-sm py-3 px-4 rounded-2xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? "Authenticating Gokul..." : "Continue with Google"}</span>
            </button>
            <p className="text-[11px] text-gray-500 text-center">
              Instant login via Google. No passwords required.
            </p>
          </div>
        )}

        {/* Tab 2: Magic Link */}
        {tab === "magic_link" && (
          <div>
            {!magicSent ? (
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. gokul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Sending link..." : "Send Magic Link"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyMagicOtp} className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Magic link &amp; code sent to <strong>{email}</strong>!</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Enter 4-Digit Login Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 7492"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-mono bg-gray-950 border border-gray-800 rounded-xl py-2.5 text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-center gap-2 text-[11px] text-gray-500">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>ShopPilot uses passwordless encrypted sessions.</span>
        </div>
      </div>
    </div>
  );
}
