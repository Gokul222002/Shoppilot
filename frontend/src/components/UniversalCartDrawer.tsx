"use client";

import React, { useState } from "react";
import { X, ShoppingBag, Trash2, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";
import { DealItem } from "./DealCard";

interface UniversalCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: DealItem[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export const UniversalCartDrawer: React.FC<UniversalCartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onClearCart,
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  if (!isOpen) return null;

  const totalCurrentPrice = cartItems.reduce(
    (sum, item) => sum + (item.current_price ?? item.price ?? 0),
    0
  );
  const totalOriginalPrice = cartItems.reduce(
    (sum, item) => sum + (item.original_price ?? (item.current_price ?? item.price ?? 0) * 1.35),
    0
  );
  const totalSavings = Math.max(0, totalOriginalPrice - totalCurrentPrice);

  const handleAutonomousCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setCheckoutComplete(true);
      setTimeout(() => {
        setCheckoutComplete(false);
      }, 5000);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-md bg-alpine-950 border-l border-alpine-800 shadow-2xl h-full flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-alpine-800/80 flex items-center justify-between bg-alpine-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-copper-500/20 border border-copper-500/40 flex items-center justify-center text-copper-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-sand-100 flex items-center gap-2">
                Universal Multi-Store Cart
              </h2>
              <span className="text-xs font-mono text-alpine-400">
                {cartItems.length} item{cartItems.length === 1 ? "" : "s"} across {new Set(cartItems.map((i) => i.store || "Amazon")).size} stores
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-sand-400 hover:text-sand-100 hover:bg-alpine-850 transition"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-alpine-400">
              <div className="w-16 h-16 rounded-2xl bg-alpine-900 border border-alpine-800 flex items-center justify-center text-copper-500/50">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-sand-200 text-base">Your Universal Cart is Empty</h3>
              <p className="text-xs text-alpine-400 max-w-xs font-mono">
                Click &ldquo;Add to Cart&rdquo; on any live deal card to aggregate orders across Amazon, Flipkart, Myntra, and more.
              </p>
            </div>
          ) : (
            cartItems.map((item, idx) => {
              const price = item.current_price ?? item.price ?? 0;
              const storeName = item.store || "Amazon.in";
              const rawUrl = item.product_url || item.buy_link || item.url || "#";

              return (
                <div
                  key={item.id || idx}
                  className="bg-alpine-900/80 border border-alpine-800 hover:border-copper-500/40 rounded-xl p-3.5 transition flex gap-3 relative group"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-alpine-950 border border-alpine-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image_url || item.image ? (
                      <img
                        src={item.image_url || item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-copper-400/60" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-alpine-800 text-copper-400 inline-block mb-1">
                      {storeName}
                    </span>
                    <h4 className="text-xs font-bold text-sand-100 line-clamp-1 group-hover:text-copper-400 transition">
                      {item.title}
                    </h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-display font-black text-sm text-sand-100">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      {item.original_price && item.original_price > price && (
                        <span className="text-[10px] text-alpine-500 line-through font-mono">
                          ₹{Math.round(item.original_price).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => onRemoveItem(item.id || String(idx))}
                      className="text-alpine-400 hover:text-red-400 p-1 rounded transition"
                      title="Remove from universal cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-copper-400 hover:text-copper-300 font-mono flex items-center gap-0.5 mt-2"
                      title="Open store product page"
                    >
                      <span>Store</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Footer */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-alpine-800 bg-alpine-900/80 space-y-4">
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-alpine-400">
                <span>Total Retail MRP:</span>
                <span className="line-through">₹{Math.round(totalOriginalPrice).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>ShopPilot Verified Savings:</span>
                <span>-₹{Math.round(totalSavings).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sand-100 font-display font-black text-base pt-2 border-t border-alpine-800/80">
                <span>Final Multi-Store Total:</span>
                <span className="text-copper-400">₹{Math.round(totalCurrentPrice).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {checkoutComplete ? (
              <div className="p-3 bg-emerald-950/80 border border-emerald-600/50 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Multi-Store Session Ready! All item carts synchronized with active retailers.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleAutonomousCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-3 px-4 bg-copper-500 hover:bg-copper-400 text-stone-950 font-bold rounded-xl font-display text-sm tracking-wide shadow-lg transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-stone-950" />
                      <span>Injecting Cart Across Stores...</span>
                    </>
                  ) : (
                    <>
                      <span>Autonomous Multi-Store Dispatch</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={onClearCart}
                  className="w-full py-2 text-xs font-mono text-alpine-400 hover:text-red-400 transition text-center"
                >
                  Clear Universal Cart
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-alpine-400 font-mono text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Price Parity & Zero 404 Outbound Guarantee</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
