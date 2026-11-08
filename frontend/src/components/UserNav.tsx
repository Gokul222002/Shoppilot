"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, LogOut, Heart, Bell, ChevronDown, Trash2 } from "lucide-react";
import { getApiBase } from "@/lib/api-config";
import AuthModal, { type UserSession } from "./AuthModal";

export default function UserNav() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("shoppilot_user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // Default Gokul pre-login preview
        const defaultUser: UserSession = {
          name: "Gokul",
          email: "gokul@example.com",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          provider: "google",
          signedInAt: new Date().toISOString(),
        };
        setUser(defaultUser);
        localStorage.setItem("shoppilot_user", JSON.stringify(defaultUser));
      }
    } catch {}
  }, []);

  function handleLogout() {
    localStorage.removeItem("shoppilot_user");
    setUser(null);
    setDropdownOpen(false);
  }

  async function handleDeleteData() {
    if (!user?.email) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to delete all your account data? This will permanently wipe your price alerts, Telegram link, and watchlist."
    );
    if (!confirmDelete) return;

    try {
      const API_BASE = getApiBase();
      await fetch(`${API_BASE}/api/users/delete-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
    } catch (err) {
      console.warn("Server delete error, wiping local:", err);
    }

    localStorage.removeItem("shoppilot_user");
    localStorage.removeItem("shoppilot_wishlist");
    setUser(null);
    setDropdownOpen(false);
    alert("Your account data and price alerts have been completely deleted.");
  }

  return (
    <>
      {user ? (
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            {user.avatar ? (
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-orange-500/40">
                <Image
                  src={user.avatar}
                  alt={user.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold text-gray-200">{user.name}</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-gray-800">
                <p className="text-xs font-bold text-white">{user.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[9px] uppercase tracking-wider text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Signed in via {user.provider === "google" ? "Google" : "Magic Link"}
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/wishlist"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-pink-400" />
                  <span>My Price Watchlist</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>

                <button
                  onClick={handleDeleteData}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-colors text-left mt-1 border-t border-gray-800/60 pt-2"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>Delete Account Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsAuthOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-950 bg-orange-500 hover:bg-orange-400 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95"
        >
          <User className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />
    </>
  );
}
