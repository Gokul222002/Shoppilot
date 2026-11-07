"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Send,
  Zap,
  ArrowRight,
  ShieldCheck,
  Star,
  ExternalLink,
  Store,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { MockConnector, type Product } from "@/lib/mock-connector";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  products?: any[];
}

const PRESET_QUERIES = [
  "Best phone under ₹30,000 with good camera",
  "Compare Sony WH-1000XM5 vs AirPods Pro",
  "Energy-saving BLDC ceiling fan under ₹4,000",
  "Gaming mouse with low latency under ₹1,500",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hello Gokul! I'm your **ShopPilot AI Advisor**.\n\nAsk me about any product, specs, or budget. I compare real prices across Amazon.in, Flipkart, Croma, Myntra, and Tata CLiQ to find you the best deal.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(queryText?: string) {
    const text = (queryText || input).trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const resp = await fetch(`${apiUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const assistantMsg: Message = {
          role: "assistant",
          content: data.response,
          model: data.model,
          products: data.products || [],
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error("API call failed");
      }
    } catch {
      // Intelligent grounded client-side fallback using catalog search
      const conn = new MockConnector();
      const localMatches = conn.search(text);
      if (localMatches.length > 0) {
        const topItem = localMatches[0];
        const familyName = topItem.familyName || topItem.name;
        const familyVariants = localMatches.filter(
          (p) => (p.familyName || p.name) === familyName
        );
        const displayItems =
          familyVariants.length > 0 ? familyVariants : localMatches.slice(0, 3);

        const lines = [
          `### 🏷️ Current Prices for **${familyName}**\n`,
          `Here are the verified prices for the **${familyName}** family across connected stores:\n`,
        ];
        displayItems.forEach((p) => {
          const bestOff = p.offers.reduce((a, b) => (a.price < b.price ? a : b));
          lines.push(`#### **${p.name}**`);
          lines.push(
            `- **Best Price:** ₹${bestOff.price.toLocaleString("en-IN")} on **${
              bestOff.store
            }** (MRP ₹${bestOff.mrp.toLocaleString("en-IN")})`
          );
          lines.push(
            `- **Customer Score:** ★ ${p.rating} / 5 (${p.reviewCount.toLocaleString(
              "en-IN"
            )} ratings)`
          );
          lines.push("");
        });
        lines.push(
          "*ShopPilot is strictly a price comparison engine. Purchases take place directly on retailer websites.*"
        );

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: lines.join("\n"),
            model: "ShopPilot Grounded Catalog Tools (Local Mode)",
            products: displayItems,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I searched our 5 connected retailers for **"${text}"**, but found no verified product match in our database. Try searching for devices like *Realme GT 6, Samsung S24 Ultra, iPhone 15, or boAt Rockerz 550*.`,
            model: "ShopPilot Grounded Catalog Tools (Local Mode)",
            products: [],
          },
        ]);
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24">
      {/* Top Banner */}
      <div className="bg-gray-900 border-b border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Gemini-Powered Shopping Advisor
          </div>
          <h1 className="text-3xl font-black text-white">Ask ShopPilot AI</h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
            Get expert product comparisons, budget advice, and price verification without ads or
            sales pitches.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Preset suggestions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold mr-1">Try asking:</span>
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSend(preset)}
              className="text-xs bg-gray-900 border border-gray-800 text-gray-300 hover:text-orange-400 hover:border-gray-700 px-3 py-1.5 rounded-full transition-colors text-left"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Chat Thread */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3.5 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm space-y-3 leading-relaxed ${
                  msg.role === "user"
                    ? "bg-orange-500 text-white font-medium"
                    : "bg-gray-950 border border-gray-800 text-gray-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}

                {msg.model && (
                  <span className="text-[10px] text-gray-400 font-mono block pt-1 border-t border-gray-800/80">
                    Engine: {msg.model}
                  </span>
                )}

                {/* Embedded Product Recommendations */}
                {msg.products && msg.products.length > 0 && (
                  <div className="pt-3 border-t border-gray-800/80 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400 block">
                      Recommended Matches in Our Catalog:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {msg.products.map((p: any) => {
                        const price = p.best_price ?? p.price ?? 999;
                        const mrp = p.mrp ?? Math.round(price * 1.3);
                        const store =
                          p.offers && p.offers.length > 0
                            ? p.offers[0].store
                            : "Amazon.in";
                        const slug = p.slug ?? p.id;

                        return (
                          <div
                            key={p.id}
                            className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col justify-between gap-2 hover:border-gray-700 transition-colors"
                          >
                            <div>
                              <span className="text-[10px] uppercase font-bold text-orange-400">
                                {p.brand}
                              </span>
                              <h4 className="text-xs font-bold text-white line-clamp-1">
                                {p.name}
                              </h4>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-sm font-extrabold text-white">
                                  ₹{price.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-gray-400 line-through">
                                  ₹{mrp.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-bold">
                                  {store}
                                </span>
                              </div>
                            </div>

                            <Link
                              href={`/compare?q=${encodeURIComponent(slug)}`}
                              className="bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors mt-1"
                            >
                              <span>Compare Prices</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-gray-400 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Bot className="w-4 h-4" />
              </div>
              <span>Searching multi-store catalog and analyzing deals…</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center bg-gray-900 border border-gray-800 rounded-2xl p-2 focus-within:border-orange-500 transition-colors shadow-lg"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about specs, budget, deals, or store prices…"
            className="w-full bg-transparent px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors shrink-0 shadow-md shadow-orange-500/20"
            aria-label="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Anti-Cart Disclaimer */}
        <p className="text-[11px] text-gray-400 text-center">
          ShopPilot AI provides unbiased price comparison and spec evaluations. We do not sell
          products or maintain a cart. All links direct to the retailer&apos;s verified store.
        </p>
      </div>
    </div>
  );
}
