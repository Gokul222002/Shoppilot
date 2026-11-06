"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bot, Wifi, WifiOff, ShoppingBag, Sparkles, ExternalLink, ShieldCheck, Activity } from "lucide-react";
import { GoalInputBar } from "../components/GoalInputBar";
import { LiveBrowserFeed } from "../components/LiveBrowserFeed";
import { ActionLogTimeline, StepLog } from "../components/ActionLogTimeline";
import { DealCard, DealItem } from "../components/DealCard";
import { SafetyIndicator } from "../components/SafetyIndicator";
import { NotificationFeed, PushNotification } from "../components/NotificationToast";

export default function ShopPilotDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Backend URL resolvers
  const getBackendHttp = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  };

  const getBackendWs = () => {
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
    return "ws://127.0.0.1:8000/ws/agent";
  };

  const backendHttp = getBackendHttp();
  const mockStoreUrl = `${backendHttp}/mock-store`;

  // Agent State
  const [currentUrl, setCurrentUrl] = useState(mockStoreUrl);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [maxSteps] = useState(15);
  const [missionStatus, setMissionStatus] = useState("IDLE");
  const [actionMessage, setActionMessage] = useState("Awaiting shopping dispatch objective...");
  const [activeSelector, setActiveSelector] = useState<string | undefined>(undefined);
  const [confidence, setConfidence] = useState<number | undefined>(undefined);

  // Lists
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [safetyTriggered, setSafetyTriggered] = useState(false);
  const [safetyReason, setSafetyReason] = useState<string | undefined>(undefined);

  const socketRef = useRef<WebSocket | null>(null);

  // Connect to backend WebSocket
  useEffect(() => {
    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      try {
        const wsUrl = getBackendWs();
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleIncomingMessage(msg);
          } catch (e) {
            console.error("Error parsing WS message:", e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const handleIncomingMessage = (msg: any) => {
    switch (msg.type) {
      case "MISSION_STARTED":
        setCurrentJobId(msg.job_id);
        setIsRunning(true);
        setMissionStatus("RUNNING");
        break;

      case "AGENT_STEP":
        if (msg.data.step) setStep(msg.data.step);
        if (msg.data.current_url) setCurrentUrl(msg.data.current_url);
        if (msg.data.screenshot) setScreenshot(msg.data.screenshot);
        if (msg.data.action) {
          setActionMessage(`Executing ${msg.data.action.toUpperCase()} on target element`);
          setActiveSelector(msg.data.selector);
        } else if (msg.data.message) {
          setActionMessage(msg.data.message);
        }
        if (msg.data.confidence) setConfidence(msg.data.confidence);

        if (msg.data.thought) {
          setStepLogs((prev) => [
            ...prev,
            {
              step: msg.data.step || prev.length + 1,
              thought: msg.data.thought,
              action: msg.data.action || "observe",
              selector: msg.data.selector,
              value: msg.data.value,
              timestamp: msg.timestamp || new Date().toISOString(),
              success: true,
            },
          ]);
        }
        break;

      case "STEP_COMPLETED":
        if (msg.data.screenshot) setScreenshot(msg.data.screenshot);
        break;

      case "DEAL_DISCOVERED":
        setDeals((prev) => {
          const exists = prev.some((d) => d.title === msg.data.title);
          return exists ? prev : [msg.data, ...prev];
        });
        break;

      case "SAFETY_ALERT":
        setSafetyTriggered(true);
        setSafetyReason(msg.data.reason);
        setActionMessage(`Financial guardrail engaged: ${msg.data.reason}`);
        break;

      case "NOTIFICATION":
        setNotifications((prev) => [msg.payload, ...prev]);
        break;

      case "MISSION_STATUS":
        setMissionStatus(msg.data.status);
        if (msg.data.status === "COMPLETED" || msg.data.status === "SAFETY_HALT" || msg.data.status === "FAILED") {
          setIsRunning(false);
          setActionMessage(
            msg.data.status === "COMPLETED"
              ? "Mission completed successfully! Item safely in cart."
              : `Mission ended: ${msg.data.status}`
          );
        }
        break;

      default:
        break;
    }
  };

  const startMission = async (objective: string, targetUrl: string) => {
    setIsRunning(true);
    setStep(0);
    setStepLogs([]);
    setDeals([]);
    setSafetyTriggered(false);
    setSafetyReason(undefined);
    setActionMessage("Initializing headless browser & Multimodal Vision pipeline...");

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: "START_MISSION",
          objective,
          start_url: targetUrl,
        })
      );
    } else {
      try {
        const res = await fetch(`${backendHttp}/api/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objective, start_url: targetUrl }),
        });
        const data = await res.json();
        setCurrentJobId(data.job_id);
      } catch (e) {
        console.error("Failed to start mission via REST:", e);
        setIsRunning(false);
      }
    }
  };

  const cartTotal = deals.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="min-h-screen bg-alpine-950 text-sand-100 flex flex-col font-sans selection:bg-copper-600 selection:text-sand-50">
      {/* Top Application Header Bar */}
      <header className="bg-alpine-900/95 border-b border-alpine-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-alpine-850 border border-alpine-700/80 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-copper-500 fill-none stroke-[2]">
                <path d="M2 20L9 6L13 14L16 8L22 20H2Z" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-sand-100 tracking-tight">ShopPilot</h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-alpine-800 text-copper-400 border border-copper-500/30">
                  AUTONOMOUS AGENT
                </span>
              </div>
              <p className="text-xs text-alpine-400">Multimodal Browser Automation & Automated Deal Hunting</p>
            </div>
          </div>

          {/* Refined Sleek Status Pills (Screenshot 2 Style Enhanced) */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* AI Engine Status Pill */}
            <div className="flex items-center gap-2 bg-alpine-850 border border-alpine-750 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-copper-500" />
              <span className="text-alpine-400">ENGINE:</span>
              <span className="text-sand-100 font-semibold">GEMINI VISION</span>
            </div>

            {/* Agent Readiness Pill (Styled cleanly as requested) */}
            <div className="flex items-center gap-2 bg-alpine-850 border border-alpine-750 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
              <div className="w-2 h-2 rounded-full bg-copper-500"></div>
              <span className="text-alpine-400">AGENT:</span>
              <span className="text-sand-100 font-semibold">
                {isRunning ? "MISSION ACTIVE" : "READY"}
              </span>
            </div>

            {/* Live Dispatch / WebSocket Status Pill */}
            <div className="flex items-center gap-2 bg-alpine-850 border border-alpine-750 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute"></span>
                  <span className="pl-1 text-emerald-400 font-bold tracking-wide">
                    DISPATCH LIVE
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-copper-500"></span>
                  <span className="text-copper-400 font-bold tracking-wide">
                    CONNECTING...
                  </span>
                </>
              )}
            </div>

            {/* Demo Store Link Button */}
            <a
              href={mockStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-alpine-800 hover:bg-alpine-750 text-sand-200 border border-alpine-700 hover:border-copper-500/50 px-3 py-1.5 rounded-lg text-xs font-mono transition shadow-sm"
              title="Open Mock E-Commerce Store in New Tab"
            >
              <span>MOCK STORE</span>
              <ExternalLink className="w-3.5 h-3.5 text-copper-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Objective Natural Language Input Bar */}
        <GoalInputBar onStartMission={startMission} isRunning={isRunning} defaultStoreUrl={mockStoreUrl} />

        {/* Dual Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Live Browser Viewport & Action Log (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <LiveBrowserFeed
              screenshot={screenshot}
              currentUrl={currentUrl}
              step={step}
              maxSteps={maxSteps}
              status={missionStatus}
              actionMessage={actionMessage}
              activeSelector={activeSelector}
              confidence={confidence}
            />

            <ActionLogTimeline logs={stepLogs} />
          </div>

          {/* Right Panel: Extracted Deals, Cart & Safeguards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Extracted Deals Feed */}
            <div className="bg-alpine-900 border border-alpine-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-alpine-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-copper-500" />
                  <h3 className="font-bold text-sm text-sand-100 tracking-wide">
                    Extracted Deals & Cart Basket
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-copper-400 bg-alpine-800 px-2.5 py-1 rounded border border-alpine-700">
                  {deals.length} SELECTED
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {deals.length === 0 ? (
                  <div className="text-center py-8 text-alpine-400 text-xs font-mono">
                    Awaiting deal discovery. Launch a shopping mission to inspect items.
                  </div>
                ) : (
                  deals.map((deal, idx) => <DealCard key={idx} deal={deal} isInCart={true} />)
                )}
              </div>

              {deals.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-alpine-800 flex items-center justify-between">
                  <span className="text-xs text-alpine-300 font-mono">Simulated Cart Subtotal:</span>
                  <span className="text-2xl font-black text-copper-400 font-mono">${cartTotal.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Financial Safety Guardrail Status */}
            <SafetyIndicator
              interceptedCount={safetyTriggered ? 1 : 0}
              isTriggered={safetyTriggered}
              lastReason={safetyReason}
            />

            {/* Push Notifications & Webhooks Emitter */}
            <NotificationFeed notifications={notifications} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-alpine-950 border-t border-alpine-800/80 py-4 text-center text-xs text-alpine-400 font-mono">
        <p>ShopPilot: Autonomous Multimodal Browser Agent for Automated Deal Hunting and Checkout Simulations</p>
      </footer>
    </div>
  );
}
