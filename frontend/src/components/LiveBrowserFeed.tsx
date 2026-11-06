"use client";

import React from "react";
import { Monitor, Lock, ShieldCheck, Activity, Eye } from "lucide-react";

interface LiveBrowserFeedProps {
  screenshot: string | null;
  currentUrl: string;
  step: number;
  maxSteps: number;
  status: string;
  actionMessage: string;
  activeSelector?: string;
  confidence?: number;
}

export const LiveBrowserFeed: React.FC<LiveBrowserFeedProps> = ({
  screenshot,
  currentUrl,
  step,
  maxSteps,
  status,
  actionMessage,
  activeSelector,
  confidence,
}) => {
  return (
    <div className="bg-alpine-900 border border-alpine-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
      {/* Browser chrome header bar */}
      <div className="bg-alpine-950 px-4 py-3 border-b border-alpine-800 flex items-center justify-between gap-3">
        {/* Window controls */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-copper-600"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-sand-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
          <span className="text-xs font-semibold text-sand-300 ml-2 flex items-center gap-1.5 font-mono">
            <Monitor className="w-3.5 h-3.5 text-copper-500" />
            Headless Browser
          </span>
        </div>

        {/* Address URL bar */}
        <div className="flex-1 max-w-lg bg-alpine-900 border border-alpine-800 rounded-md px-3 py-1 flex items-center gap-2 text-xs text-sand-300 font-mono truncate">
          <Lock className="w-3 h-3 text-copper-500 shrink-0" />
          <span className="truncate">{currentUrl || "about:blank"}</span>
        </div>

        {/* Status / Step badge */}
        <div className="flex items-center gap-2 font-mono">
          <span className="bg-alpine-850 text-sand-200 text-[11px] px-2.5 py-1 rounded border border-alpine-750 font-semibold">
            Step {step}/{maxSteps}
          </span>
          {confidence && (
            <span className="bg-alpine-800 text-copper-400 border border-copper-600/40 text-[11px] px-2 py-1 rounded font-semibold">
              {(confidence * 100).toFixed(0)}% Conf
            </span>
          )}
        </div>
      </div>

      {/* Action / Reasoning Banner */}
      <div className="bg-alpine-950/70 px-4 py-2 border-b border-alpine-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-sand-200 truncate">
          <Activity className="w-3.5 h-3.5 text-copper-500 shrink-0" />
          <span className="font-semibold text-alpine-400">Action:</span>
          <span className="text-sand-100 truncate text-xs">{actionMessage || "Awaiting mission initiation..."}</span>
        </div>
        {activeSelector && (
          <span className="text-[11px] font-mono bg-alpine-800 text-copper-300 border border-alpine-700 px-2 py-0.5 rounded shrink-0">
            {activeSelector}
          </span>
        )}
      </div>

      {/* Main viewport frame */}
      <div className="relative flex-1 bg-alpine-950 flex items-center justify-center overflow-hidden min-h-[420px]">
        {screenshot ? (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <img
              src={screenshot.startsWith("data:") || screenshot.startsWith("http") ? screenshot : `data:image/jpeg;base64,${screenshot}`}
              alt="Live Headless Browser Stream"
              className="w-full h-full object-contain rounded-lg shadow-xl border border-alpine-800"
            />
            {/* Live stream badge */}
            <div className="absolute top-4 right-4 bg-alpine-900/90 backdrop-blur-md border border-copper-500/40 text-sand-100 text-[11px] font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-copper-500 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-copper-500 absolute"></span>
              <span className="pl-1">LIVE STREAM</span>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 max-w-sm">
            <div className="w-16 h-16 bg-alpine-900 text-copper-500 border border-alpine-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Eye className="w-8 h-8 opacity-80" />
            </div>
            <h3 className="font-bold text-sand-100 text-base">
              Visual Stream Standby
            </h3>
            <p className="text-xs text-alpine-400 mt-2 leading-relaxed">
              When an objective is launched, real-time Playwright headless browser screenshots and element boundaries stream here.
            </p>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="bg-alpine-950 px-4 py-2 border-t border-alpine-800 flex items-center justify-between text-[11px] text-alpine-400 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-copper-500" />
          <span>Real-time DOM & Vision-LLM Safety Guardrails Active</span>
        </div>
        <span>1280 × 800 HD</span>
      </div>
    </div>
  );
};
