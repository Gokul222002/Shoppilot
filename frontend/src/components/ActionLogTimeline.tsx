"use client";

import React, { useRef, useEffect } from "react";
import { Terminal, CornerDownRight } from "lucide-react";

export interface StepLog {
  step: number;
  thought: string;
  action: string;
  selector?: string;
  value?: string;
  timestamp: string;
  success?: boolean;
}

interface ActionLogTimelineProps {
  logs: StepLog[];
}

export const ActionLogTimeline: React.FC<ActionLogTimelineProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "click":
        return "bg-copper-900/60 text-copper-300 border-copper-700/60";
      case "type":
        return "bg-alpine-800 text-sand-200 border-alpine-600";
      case "scroll":
        return "bg-sand-950/60 text-sand-300 border-sand-700/60";
      case "finish":
        return "bg-emerald-950/60 text-emerald-300 border-emerald-700/60";
      default:
        return "bg-alpine-850 text-alpine-300 border-alpine-750";
    }
  };

  return (
    <div className="bg-alpine-900 border border-alpine-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="bg-alpine-950 px-4 py-3 border-b border-alpine-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-copper-500" />
          <h3 className="font-bold text-sm text-sand-100">
            Execution Timeline & Agent Thoughts
          </h3>
        </div>
        <span className="text-[11px] text-alpine-400 font-mono">
          {logs.length} Steps Recorded
        </span>
      </div>

      <div ref={scrollRef} className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[380px]">
        {logs.length === 0 ? (
          <div className="text-center py-10 text-alpine-400 text-xs font-mono">
            Awaiting agent execution dispatch...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="bg-alpine-950/80 border border-alpine-800/90 rounded-xl p-3.5 text-xs space-y-2.5 hover:border-alpine-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="mountain-badge font-bold text-sand-200 bg-alpine-850 px-2 py-0.5 rounded text-[10px] border border-alpine-800">
                    STEP {log.step}
                  </span>
                  <span
                    className={`mountain-badge font-bold text-[9px] px-2 py-0.5 rounded border ${getActionColor(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                </div>
                <span className="text-alpine-400 text-[10px] font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Agent internal reasoning thought */}
              <div className="text-sand-200 pl-3 border-l-2 border-copper-500/80 text-xs italic leading-relaxed">
                "{log.thought}"
              </div>

              {/* Selector and value details */}
              {log.selector && (
                <div className="flex items-center gap-1.5 text-alpine-400 text-[11px] font-mono pt-1">
                  <CornerDownRight className="w-3 h-3 text-copper-500" />
                  <span className="text-copper-400 bg-alpine-900 px-2 py-0.5 rounded border border-alpine-800 truncate max-w-xs">
                    {log.selector}
                  </span>
                  {log.value && (
                    <span className="text-sand-200 bg-alpine-850 px-2 py-0.5 rounded border border-alpine-750 truncate">
                      "{log.value}"
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
