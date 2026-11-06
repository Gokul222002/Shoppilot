"use client";

import React, { useState } from "react";
import { Sparkles, Play, StopCircle, Globe, Search } from "lucide-react";

interface GoalInputBarProps {
  onStartMission: (objective: string, targetUrl: string) => void;
  isRunning: boolean;
  onStopMission?: () => void;
  defaultStoreUrl?: string;
}

const PRESETS = [
  "Find a 4K 27-inch monitor under $300 and add it to cart",
  "Find running shoes under $80 with discount and add to cart",
  "Find ANC wireless headphones under $100 and add to cart",
];

export const GoalInputBar: React.FC<GoalInputBarProps> = ({
  onStartMission,
  isRunning,
  onStopMission,
  defaultStoreUrl,
}) => {
  const [objective, setObjective] = useState(PRESETS[0]);
  const [targetUrl, setTargetUrl] = useState(defaultStoreUrl || "http://127.0.0.1:8000/mock-store");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim() || isRunning) return;
    onStartMission(objective, targetUrl);
  };

  return (
    <div className="bg-alpine-900 border border-alpine-800 rounded-2xl p-5 sm:p-6 shadow-xl relative">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Input Row */}
        <div className="relative flex items-center">
          <div className="absolute left-4 text-copper-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={isRunning}
            placeholder="Enter natural language shopping goal (e.g. 'Find a 4K 27-inch monitor under $300 and add it to cart')..."
            className="w-full bg-alpine-950 border border-alpine-750 rounded-xl pl-12 pr-40 py-3.5 sm:py-4 text-sm sm:text-base text-sand-100 placeholder:text-alpine-500 focus:outline-none focus:ring-2 focus:ring-copper-500/80 focus:border-copper-500 transition shadow-inner font-sans disabled:opacity-60"
          />
          <div className="absolute right-2.5 flex items-center gap-2">
            {!isRunning ? (
              <button
                type="submit"
                disabled={!objective.trim()}
                className="bg-copper-600 hover:bg-copper-500 text-sand-50 font-semibold px-5 py-2.5 rounded-lg text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-copper-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Agent</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopMission}
                className="bg-red-700 hover:bg-red-600 text-sand-50 font-semibold px-4 py-2.5 rounded-lg text-xs sm:text-sm transition flex items-center gap-1.5 shadow-lg shadow-red-700/30 active:scale-95"
              >
                <StopCircle className="w-4 h-4" />
                <span>Running...</span>
              </button>
            )}
          </div>
        </div>

        {/* Preset chips & Advanced toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-alpine-400 font-semibold flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-copper-500" /> Presets:
            </span>
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isRunning}
                onClick={() => setObjective(preset)}
                className={`px-3 py-1 rounded-md border text-xs font-medium transition truncate max-w-xs ${
                  objective === preset
                    ? "bg-alpine-800 border-copper-500 text-copper-400 shadow-sm"
                    : "bg-alpine-950/70 border-alpine-800 text-alpine-300 hover:text-sand-100 hover:border-alpine-700"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-alpine-400 hover:text-copper-400 flex items-center gap-1.5 transition font-semibold"
          >
            <Globe className="w-3.5 h-3.5 text-copper-500" />
            <span>{showAdvanced ? "Hide Target Store" : "Custom Store URL"}</span>
          </button>
        </div>

        {/* Target URL dropdown drawer */}
        {showAdvanced && (
          <div className="pt-3 border-t border-alpine-800 flex items-center gap-3">
            <span className="text-xs text-alpine-400 font-medium whitespace-nowrap">Target URL:</span>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={isRunning}
              placeholder="Target store URL (default: http://127.0.0.1:8000/mock-store)"
              className="flex-1 bg-alpine-950 border border-alpine-800 rounded-lg px-3 py-2 text-xs text-sand-300 focus:outline-none focus:ring-1 focus:ring-copper-500 font-mono"
            />
          </div>
        )}
      </form>
    </div>
  );
};
