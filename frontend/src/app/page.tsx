"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Wifi,
  WifiOff,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Activity,
  Settings,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play
} from "lucide-react";
import { GoalInputBar } from "../components/GoalInputBar";
import { LiveBrowserFeed } from "../components/LiveBrowserFeed";
import { ActionLogTimeline, StepLog } from "../components/ActionLogTimeline";
import { DealCard, DealItem } from "../components/DealCard";
import { SafetyIndicator } from "../components/SafetyIndicator";
import { NotificationFeed, PushNotification } from "../components/NotificationToast";

// Helper function to create realistic SVG browser preview frames for interactive simulation
const createSimSvg = (title: string, subtitle: string, badge: string, highlightAction?: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="1000" height="600">
    <rect width="1000" height="600" fill="#0e1411"/>
    <rect x="0" y="0" width="1000" height="60" fill="#141d18"/>
    <text x="30" y="38" fill="#f4f1de" font-family="monospace" font-size="18" font-weight="bold">TRAILHEAD SUPPLY CO. // INDIA FLAGSHIP (INR ₹)</text>
    <rect x="750" y="16" width="220" height="30" rx="6" fill="#1b2621" stroke="#263730"/>
    <text x="770" y="36" fill="#8ba69b" font-family="monospace" font-size="13">🛒 Cart (1) | ₹22,999</text>
    <rect x="30" y="90" width="940" height="470" rx="16" fill="#151e19" stroke="#223129"/>
    <text x="60" y="145" fill="#e07a5f" font-family="monospace" font-size="14" font-weight="bold">${badge}</text>
    <text x="60" y="190" fill="#f4f1de" font-family="sans-serif" font-size="28" font-weight="bold">${title}</text>
    <text x="60" y="230" fill="#8ba69b" font-family="monospace" font-size="16">${subtitle}</text>
    <rect x="60" y="280" width="420" height="230" rx="12" fill="#101713" stroke="#263730"/>
    <text x="90" y="325" fill="#f4f1de" font-family="sans-serif" font-size="20" font-weight="bold">UltraView 27" 4K UHD IPS Monitor</text>
    <text x="90" y="360" fill="#e07a5f" font-family="monospace" font-size="24" font-weight="bold">₹22,999 <tspan font-size="14" fill="#72877e" text-decoration="line-through">₹28,999</tspan></text>
    <text x="90" y="400" fill="#8ba69b" font-family="monospace" font-size="13">✓ 3840x2160 UHD  ✓ IPS 144Hz 1ms  ✓ HDR400</text>
    <rect x="90" y="435" width="180" height="42" rx="8" fill="#e07a5f"/>
    <text x="125" y="461" fill="#0e1411" font-family="sans-serif" font-size="14" font-weight="bold">🛒 ADD TO CART</text>
    ${highlightAction ? `
    <rect x="520" y="280" width="410" height="230" rx="12" fill="#1c2620" stroke="#e07a5f" stroke-width="2"/>
    <text x="545" y="325" fill="#e07a5f" font-family="monospace" font-size="14" font-weight="bold">VISION-AI PERCEPTION ACTIVE</text>
    <text x="545" y="365" fill="#f4f1de" font-family="sans-serif" font-size="18" font-weight="bold">${highlightAction}</text>
    <text x="545" y="410" fill="#10b981" font-family="monospace" font-size="14">Confidence Score: 98.4%</text>
    <text x="545" y="450" fill="#8ba69b" font-family="monospace" font-size="12">Element: Target bound validated in viewport</text>
    ` : ''}
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};

export default function ShopPilotDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Backend URL configuration
  const [backendUrl, setBackendUrl] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Dynamic URL resolvers
  const resolveUrls = (inputUrl?: string) => {
    let base = inputUrl || backendUrl;
    if (!base && typeof window !== "undefined") {
      base = localStorage.getItem("shoppilot_backend_url") || "";
    }
    if (!base) {
      base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    }

    base = base.trim().replace(/\/+$/, "");
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      base = `https://${base}`;
    }

    const httpUrl = base;
    let wsBase = httpUrl.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
    const wsUrl = wsBase.endsWith("/ws/agent") ? wsBase : `${wsBase}/ws/agent`;

    return { httpUrl, wsUrl };
  };

  const { httpUrl: backendHttp, wsUrl: backendWs } = resolveUrls();
  const mockStoreUrl = `${backendHttp}/mock-store`;

  // Agent State
  const [currentUrl, setCurrentUrl] = useState(mockStoreUrl);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [maxSteps] = useState(6);
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
  const simTimerRef = useRef<any>(null);

  // Load saved backend URL from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shoppilot_backend_url");
      if (saved) {
        setBackendUrl(saved);
      } else if (process.env.NEXT_PUBLIC_API_URL) {
        setBackendUrl(process.env.NEXT_PUBLIC_API_URL);
      }
    }
  }, []);

  // Connect to backend WebSocket whenever backendUrl changes
  useEffect(() => {
    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      try {
        const { wsUrl } = resolveUrls();
        if (wsUrl.includes("xxxx")) {
          setIsConnected(false);
          return;
        }

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
          reconnectTimer = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        reconnectTimer = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) socketRef.current.close();
    };
  }, [backendUrl]);

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

      case "DEAL_EXTRACTED":
        if (msg.data) {
          setDeals((prev) => {
            const exists = prev.some((d) => d.title === msg.data.title);
            if (!exists) return [...prev, msg.data];
            return prev;
          });
        }
        break;

      case "SAFETY_INTERCEPT":
        setSafetyTriggered(true);
        setSafetyReason(msg.data.reason || "Payment form submission blocked by safety firewall.");
        break;

      case "NOTIFICATION":
        if (msg.data) {
          setNotifications((prev) => [
            {
              id: msg.data.id || Math.random().toString(),
              event_type: msg.data.event_type || "DEAL_FOUND",
              title: msg.data.title || "Deal Alert",
              message: msg.data.message || "",
              timestamp: msg.data.timestamp || new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);
        }
        break;

      case "MISSION_COMPLETED":
        setIsRunning(false);
        setMissionStatus("COMPLETED");
        setActionMessage("Shopping mission finished successfully!");
        break;

      default:
        break;
    }
  };

  // Autonomous Interactive Simulation Mode (Runs if backend is cold/disconnected)
  const runInteractiveSimulation = (objective: string) => {
    setIsRunning(true);
    setMissionStatus("RUNNING");
    setStep(1);
    setCurrentUrl(`${backendHttp}/mock-store`);
    setActionMessage("Navigating to Trailhead India Sandbox Store...");
    setScreenshot(createSimSvg("Trailhead Supply Co. / India Storefront", "Active Storefront Loaded - Scanning DOM Hierarchy", "STEP 1: NAVIGATION"));
    setStepLogs([
      {
        step: 1,
        thought: "Initialized Playwright Chromium viewport. Navigating to Trailhead India catalog repository.",
        action: "navigate",
        selector: "window.location",
        value: `${backendHttp}/mock-store`,
        timestamp: new Date().toISOString(),
        success: true
      }
    ]);

    simTimerRef.current = setTimeout(() => {
      setStep(2);
      setActionMessage("Detected Festival Coupon popup overlay. Dismissing...");
      setActiveSelector("#btn-dismiss-popup");
      setConfidence(0.98);
      setScreenshot(createSimSvg("Festival Promo Overlay Detected", "Modal element #flash-promo-modal intercepting click events", "STEP 2: POPUP INTERCEPTION", "Clicking #btn-dismiss-popup"));
      setStepLogs(prev => [
        ...prev,
        {
          step: 2,
          thought: "Detected dynamic promotional coupon banner overlaying page. Executing dismiss action to clear DOM access.",
          action: "click",
          selector: "#btn-dismiss-popup",
          timestamp: new Date().toISOString(),
          success: true
        }
      ]);

      simTimerRef.current = setTimeout(() => {
        setStep(3);
        const queryTerm = objective.toLowerCase().includes("shoe") ? "Running Shoes" : objective.toLowerCase().includes("headphone") ? "Headphones" : "4K 27-inch Monitor";
        setActionMessage(`Typing "${queryTerm}" into store search bar...`);
        setActiveSelector("#search-input");
        setConfidence(0.96);
        setScreenshot(createSimSvg(`Inventory Search: "${queryTerm}"`, "Applying client-side keyword filtering to product grid", "STEP 3: SEARCH DISCOVERY", `Typing into #search-input`));
        setStepLogs(prev => [
          ...prev,
          {
            step: 3,
            thought: `Located header search input. Typing query '${queryTerm}' to filter candidate items within budget.`,
            action: "type",
            selector: "#search-input",
            value: queryTerm,
            timestamp: new Date().toISOString(),
            success: true
          }
        ]);

        simTimerRef.current = setTimeout(() => {
          setStep(4);
          setActionMessage("Found matching deal: UltraView 27\" 4K UHD IPS Monitor at ₹22,999 (Under budget ₹25,000)");
          setActiveSelector("#add-to-cart-101");
          setConfidence(0.95);
          setScreenshot(createSimSvg("Matched Product: UltraView 27\" 4K UHD", "Price verified at ₹22,999 (Within target ₹25,000 threshold)", "STEP 4: SPEC & BUDGET MATCH", "Clicking #add-to-cart-101"));

          const matchedDeal: DealItem = {
            title: 'UltraView 27" 4K UHD IPS Monitor',
            price: 22999,
            original_price: 28999,
            discount_percentage: 21,
            rating: 4.8,
            currency: "₹"
          };
          setDeals([matchedDeal]);

          setStepLogs(prev => [
            ...prev,
            {
              step: 4,
              thought: "Identified optimal match meeting all 4K UHD specs and budget constraint. Initiating Add-to-Cart sequence.",
              action: "click",
              selector: "#add-to-cart-101",
              timestamp: new Date().toISOString(),
              success: true
            }
          ]);

          simTimerRef.current = setTimeout(() => {
            setStep(5);
            setActionMessage("Opening cart drawer to verify basket contents...");
            setActiveSelector("#nav-cart-btn");
            setScreenshot(createSimSvg("Cart Drawer Review", "Item verified in basket. Proceeding to safe checkout simulation.", "STEP 5: BASKET VERIFICATION", "Opening Cart Drawer"));
            setStepLogs(prev => [
              ...prev,
              {
                step: 5,
                thought: "Item placed in cart. Inspecting cart drawer subtotal (₹22,999) before navigating to checkout simulation.",
                action: "click",
                selector: "#nav-cart-btn",
                timestamp: new Date().toISOString(),
                success: true
              }
            ]);

            simTimerRef.current = setTimeout(() => {
              setStep(6);
              setIsRunning(false);
              setMissionStatus("COMPLETED");
              setActionMessage("Checkout simulated successfully! Safety Guardrail verified.");
              setSafetyTriggered(true);
              setSafetyReason("Autonomous agent reached checkout review. Real credit card payment was blocked by ShopPilot Safety Guardrail.");
              setScreenshot(createSimSvg("Checkout Simulation Verified", "Safety guardrail intercepted financial authorization safely.", "STEP 6: SAFE COMPLETION"));
              
              setNotifications(prev => [
                {
                  id: "sim-notif-1",
                  event_type: "ADDED_TO_CART",
                  title: "Deal Secured in Cart!",
                  message: 'UltraView 27" 4K UHD IPS Monitor successfully added for ₹22,999.',
                  timestamp: new Date().toLocaleTimeString(),
                },
                ...prev
              ]);

              setStepLogs(prev => [
                ...prev,
                {
                  step: 6,
                  thought: "Mission Complete: Deal extracted, verified in cart, checkout simulated, and simulated push webhook alert dispatched.",
                  action: "finish",
                  timestamp: new Date().toISOString(),
                  success: true
                }
              ]);
            }, 1800);
          }, 1800);
        }, 1800);
      }, 1800);
    }, 1800);
  };

  const startMission = async (objective: string, targetUrl: string) => {
    setIsRunning(true);
    setStep(0);
    setStepLogs([]);
    setDeals([]);
    setSafetyTriggered(false);
    setSafetyReason(undefined);
    setActionMessage("Initializing headless browser & Multimodal Vision pipeline...");

    // If connected via real WebSocket, execute live mission
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: "START_MISSION",
          objective,
          start_url: targetUrl,
        })
      );
    } else {
      // Attempt REST API launch
      try {
        const res = await fetch(`${backendHttp}/api/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objective, start_url: targetUrl }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentJobId(data.job_id);
          return;
        }
      } catch (e) {
        // Fallback to high-fidelity interactive simulation
      }
      runInteractiveSimulation(objective);
    }
  };

  const stopMission = () => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setIsRunning(false);
    setMissionStatus("IDLE");
    setActionMessage("Mission halted by user.");
  };

  // Test ping backend URL
  const pingBackend = async () => {
    setIsPinging(true);
    setPingStatus("Pinging backend service...");
    try {
      const { httpUrl } = resolveUrls();
      const res = await fetch(`${httpUrl}/api/health`, { method: "GET", mode: "cors" });
      if (res.ok) {
        setPingStatus("🟢 Backend is Online & Ready!");
      } else {
        setPingStatus(`⚠️ Returned HTTP ${res.status}`);
      }
    } catch (e: any) {
      setPingStatus("⏳ Backend is waking up or unreachable. Free tier may take ~30s to spin up.");
    } finally {
      setIsPinging(false);
    }
  };

  const saveBackendUrl = (newUrl: string) => {
    setBackendUrl(newUrl);
    if (typeof window !== "undefined") {
      localStorage.setItem("shoppilot_backend_url", newUrl);
    }
    setIsSettingsOpen(false);
  };

  const cartTotal = deals.reduce((acc, curr) => acc + curr.price, 0);
  const isPlaceholderUrl = backendHttp.includes("xxxx");

  return (
    <div className="min-h-screen bg-alpine-950 text-sand-100 flex flex-col font-sans selection:bg-copper-600 selection:text-sand-50">
      {/* Top Warning Banner if Backend contains placeholder */}
      {isPlaceholderUrl && (
        <div className="bg-copper-950/90 border-b border-copper-700/60 px-4 py-2 text-xs text-copper-200 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-copper-400 shrink-0" />
            <span>
              Backend URL has placeholder &quot;xxxx&quot;. Running in <strong>Interactive Simulation Mode</strong>. Click here to set your actual Render URL:
            </span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="bg-copper-600 hover:bg-copper-500 text-sand-50 font-bold px-3 py-1 rounded text-[11px] uppercase tracking-wider transition"
          >
            Configure Backend
          </button>
        </div>
      )}

      {/* Top Application Header Bar */}
      <header className="bg-alpine-900/95 border-b border-alpine-800 sticky top-0 z-40 backdrop-blur-md">
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
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-400">
                  INR ₹
                </span>
              </div>
              <p className="text-xs text-alpine-400">Multimodal Browser Automation & Deal Hunting in Indian Rupees</p>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* AI Engine Status Pill */}
            <div className="flex items-center gap-2 bg-alpine-850 border border-alpine-750 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-copper-500" />
              <span className="text-alpine-400">ENGINE:</span>
              <span className="text-sand-100 font-semibold">GEMINI VISION</span>
            </div>

            {/* Agent Readiness Pill */}
            <div className="flex items-center gap-2 bg-alpine-850 border border-alpine-750 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
              <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-copper-400 animate-pulse" : "bg-emerald-400"}`}></div>
              <span className="text-alpine-400">AGENT:</span>
              <span className="text-sand-100 font-semibold">
                {isRunning ? "MISSION ACTIVE" : "READY"}
              </span>
            </div>

            {/* Live Dispatch / WebSocket Status Pill */}
            <div className="flex items-center gap-2 bg-alpine-850 border border-alpine-750 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-400 font-bold tracking-wide">
                    DISPATCH LIVE
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-copper-400"></span>
                  <span className="text-copper-400 font-bold tracking-wide">
                    SIMULATOR READY
                  </span>
                </>
              )}
            </div>

            {/* Backend URL Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 bg-alpine-800 hover:bg-alpine-750 text-sand-200 border border-alpine-700 hover:border-copper-500/50 px-3 py-1.5 rounded-lg text-xs font-mono transition shadow-sm"
              title="Configure Backend Service URL"
            >
              <Settings className="w-3.5 h-3.5 text-copper-400" />
              <span>BACKEND</span>
            </button>

            {/* Demo Store Link */}
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
        <GoalInputBar
          onStartMission={startMission}
          isRunning={isRunning}
          onStopMission={stopMission}
          defaultStoreUrl={mockStoreUrl}
        />

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
                    Extracted Deals & Cart Basket (INR ₹)
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
                  <span className="text-2xl font-black text-copper-400 font-mono">₹{cartTotal.toLocaleString("en-IN")}</span>
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

      {/* Backend Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-alpine-900 border border-alpine-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-alpine-400 hover:text-sand-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-sand-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-copper-500" />
              Configure Backend Service URL
            </h3>
            <p className="text-xs text-alpine-400 mt-2 leading-relaxed font-mono">
              Enter your live Render backend URL or local FastAPI instance. This connects the Playwright headless browser and WebSocket dispatcher.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-mono text-sand-300 mb-1">Backend Base URL:</label>
                <input
                  type="text"
                  defaultValue={backendHttp}
                  id="backend-url-input"
                  placeholder="https://shoppilot-backend.onrender.com or http://127.0.0.1:8000"
                  className="w-full bg-alpine-950 border border-alpine-750 rounded-xl px-4 py-2.5 text-xs text-sand-100 placeholder:text-alpine-600 focus:outline-none focus:ring-1 focus:ring-copper-500 font-mono"
                />
              </div>

              {pingStatus && (
                <div className="p-3 bg-alpine-950 rounded-lg border border-alpine-800 text-xs font-mono text-sand-200">
                  {pingStatus}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={pingBackend}
                  disabled={isPinging}
                  className="bg-alpine-800 hover:bg-alpine-750 text-sand-200 px-4 py-2 rounded-lg text-xs font-mono border border-alpine-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin" : ""}`} />
                  <span>Test Health Ping</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("backend-url-input") as HTMLInputElement;
                    if (input) saveBackendUrl(input.value);
                  }}
                  className="ml-auto bg-copper-600 hover:bg-copper-500 text-sand-50 font-bold px-5 py-2 rounded-lg text-xs font-mono transition"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-alpine-950 border-t border-alpine-800/80 py-4 text-center text-xs text-alpine-400 font-mono">
        <p>ShopPilot: Autonomous Multimodal Browser Agent for Automated Deal Hunting and Checkout Simulations</p>
      </footer>
    </div>
  );
}
