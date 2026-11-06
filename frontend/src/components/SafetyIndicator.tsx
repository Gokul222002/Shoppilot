"use client";

import React from "react";
import { ShieldCheck, AlertOctagon, CheckCircle } from "lucide-react";

interface SafetyIndicatorProps {
  interceptedCount: number;
  isTriggered: boolean;
  lastReason?: string;
}

export const SafetyIndicator: React.FC<SafetyIndicatorProps> = ({
  interceptedCount,
  isTriggered,
  lastReason,
}) => {
  return (
    <div className="bg-alpine-900 border border-alpine-800 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isTriggered
              ? "bg-copper-950 text-copper-400 border border-copper-700"
              : "bg-alpine-850 text-sand-200 border border-alpine-750"
          }`}>
            {isTriggered ? <AlertOctagon className="w-4 h-4 text-copper-500" /> : <ShieldCheck className="w-4 h-4 text-copper-500" />}
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-sand-100 uppercase tracking-wide">
              AUTONOMOUS PAYMENT GUARDRAIL
            </h4>
            <p className="mountain-badge text-[10px] text-alpine-400">Zero-Charge Payment Protection</p>
          </div>
        </div>

        <span className={`mountain-badge text-[9px] font-bold px-2.5 py-1 rounded border ${
          isTriggered
            ? "bg-copper-950 text-copper-300 border-copper-700"
            : "bg-alpine-850 text-emerald-400 border-alpine-750"
        }`}>
          {isTriggered ? "SAFEGUARD ENGAGED" : "ARMED & SAFE"}
        </span>
      </div>

      <div className="mt-3.5 text-xs text-alpine-300 bg-alpine-950 p-3 rounded-xl border border-alpine-800 flex items-start gap-2.5">
        <CheckCircle className="w-4 h-4 text-copper-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {lastReason || "Agent autonomously navigates, resolves popups, filters specs, and adds items to cart. Actions attempting to enter credit cards or click final 'Place Order' are intercepted."}
        </p>
      </div>
    </div>
  );
};
