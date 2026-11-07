"use client";

import React, { useState, useEffect } from "react";
import { Info, X } from "lucide-react";

export default function DemoPricesBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("shoppilot_demo_banner_dismissed");
      if (!stored) {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("shoppilot_demo_banner_dismissed", "true");
    } catch {
      // ignore
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Demo price notification"
      className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80 border-b border-amber-600/30 text-amber-200 text-xs px-4 py-2 flex items-center justify-between gap-3 shadow-inner"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-center sm:text-left justify-center flex-1">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-medium">
          Showing demo prices. Live prices turn on once store connectors are configured.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="p-1 rounded-md text-amber-400/80 hover:text-amber-200 hover:bg-amber-800/40 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
