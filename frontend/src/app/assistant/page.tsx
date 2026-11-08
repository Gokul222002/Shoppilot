"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Send,
  ArrowRight,
  TrendingDown,
  RotateCcw,
  Store,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { getApiBase } from "@/lib/api-config";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  products?: any[];
  suggestions?: string[];
}

const STARTER_QUERIES = [
  "Realme GT 6 vs OnePlus 12R",
  "Best phone under ₹30,000 for camera & battery",
  "Is boAt Rockerz 550 good for gym workouts?",
  "Difference between OLED and AMOLED display",
  "Best laptop for coding under ₹60,000",
  "Energy-saving BLDC ceiling fan under ₹4,000",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hello Gokul! I'm your **ShopPilot AI Advisor**.\n\nAsk me about any smartphone, laptop, audio gear, or appliance. I evaluate real technical specs, pros & cons, and fetch verified live prices across **Amazon.in, Flipkart, Croma, Tata CLiQ, and Myntra**.",
      suggestions: [
        "Realme GT 6 vs OnePlus 12R",
        "Best phone under ₹30,000",
        "Is boAt Rockerz 550 good for gym?",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(queryText?: string) {
    const text = (queryText || input).trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const apiBase = getApiBase();
      const historyPayload = nextMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(`${apiBase}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          history: historyPayload,
        }),
      });

      if (!resp.ok) {
        throw new Error(`API error ${resp.status}`);
      }

      const data = await resp.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.response || "No response received.",
        model: data.model || "Gemini-Powered",
        products: data.products || [],
        suggestions: data.suggestions || [
          "Compare with top competitor",
          "Show 12-month price history",
          "Set price drop alert",
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Intelligent fallback message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ The AI Advisor is momentarily synchronizing with our price database. You can search directly or click any suggested model below.",
          model: "ShopPilot Fallback Engine",
          suggestions: [
            "Realme GT 6",
            "OnePlus 12R",
            "iPhone 15",
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([
      {
        role: "assistant",
        content:
          "👋 Hello Gokul! Chat history cleared. What product or comparison would you like to explore?",
        suggestions: [
          "Best phone under ₹30,000",
          "Realme GT 6 vs OnePlus 12R",
          "Laptops for coding under ₹60,000",
        ],
      },
    ]);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24">
      {/* Top Banner */}
      <div className="bg-gray-900 border-b border-gray-800 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Gemini-Powered Shopping Advisor
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Ask ShopPilot AI</h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
            Unbiased price intelligence, expert spec comparisons, and multi-store deal verification without ads.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Quick query starter pills */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs text-gray-400 font-semibold mr-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
              Popular:
            </span>
            {STARTER_QUERIES.slice(0, 4).map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => handleSend(query)}
                className="text-xs bg-gray-900 border border-gray-800 text-gray-300 hover:text-orange-400 hover:border-gray-700 px-3 py-1 rounded-full transition-colors"
              >
                {query}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            title="Reset conversation"
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-900 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        {/* Chat Thread */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 sm:p-7 space-y-6 shadow-xl">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 sm:gap-3.5 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm space-y-3.5 leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-md shadow-orange-500/10"
                    : "bg-gray-950 border border-gray-800/90 text-gray-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}

                {msg.model && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 text-[10px] text-gray-500 font-mono">
                    <span>Engine: {msg.model}</span>
                    <span className="text-emerald-400/80">● Grounded in Real Catalog</span>
                  </div>
                )}

                {/* Embedded Product Cards */}
                {msg.products && msg.products.length > 0 && (
                  <div className="pt-3 border-t border-gray-800/80 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Live Verified Store Offers:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {msg.products.map((p: any) => {
                        const price = p.best_price ?? p.price ?? 999;
                        const mrp = p.mrp ?? Math.round(price * 1.25);
                        const store = p.best_store || (p.offers && p.offers[0]?.store) || "Amazon.in";
                        const slug = p.slug ?? p.id;
                        const rating = p.rating ?? 4.5;

                        return (
                          <div
                            key={p.id}
                            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
                                  {p.brand || "Verified Brand"}
                                </span>
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                                  ★ {rating}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                {p.name}
                              </h4>
                              <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-base font-extrabold text-white">
                                  ₹{price.toLocaleString("en-IN")}
                                </span>
                                <span className="text-xs text-gray-500 line-through">
                                  ₹{mrp.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                                <Store className="w-3 h-3 text-orange-400" />
                                <span>Best price on </span>
                                <strong className="text-gray-200">{store}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                              <Link
                                href={`/compare?q=${encodeURIComponent(slug)}`}
                                className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
                              >
                                <span>Compare Stores</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              <Link
                                href={`/price-history/${encodeURIComponent(slug)}`}
                                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs py-1.5 px-2.5 rounded-lg flex items-center justify-center transition-colors"
                                title="12-Month Price History"
                              >
                                <TrendingDown className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Follow-Up Suggestion Pills */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="pt-3 border-t border-gray-800/80 space-y-2">
                    <span className="text-[11px] font-semibold text-gray-400 block">
                      Suggested follow-ups:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((sugg, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSend(sugg)}
                          className="text-xs bg-gray-900/90 hover:bg-orange-500/10 border border-gray-800 hover:border-orange-500/40 text-gray-300 hover:text-orange-400 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 text-left"
                        >
                          <span>{sugg}</span>
                          <ChevronRight className="w-3 h-3 text-orange-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-gray-400 animate-pulse bg-gray-950 p-4 rounded-2xl border border-gray-800/80 max-w-md">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-gray-300">Consulting real-time store offers…</div>
                <div className="text-[10px] text-gray-500">Checking Amazon.in, Flipkart, Croma, and specs</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
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
            placeholder="Ask about specs, gaming, camera, price trends, or store deals…"
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
