"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Database,
  Clock,
  ExternalLink,
  Layers,
  Activity,
  ArrowLeft,
  FileText,
  GitPullRequest,
} from "lucide-react";

interface ReviewQueueItem {
  id: string;
  title_a: string;
  title_b: string;
  brand: string;
  confidence_score: number;
  stage: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

interface StoreItem {
  name: string;
  enabled: boolean;
  offer_count: number;
}

interface ConnectorItem {
  key: string;
  name: string;
  is_configured: boolean;
  is_active: boolean;
  status: string;
  last_sync: string | null;
  last_error: string | null;
}

interface SchedulerStats {
  last_run: string | null;
  summary: any;
  total_points_recorded: number;
  total_skipped_unchanged: number;
  unique_tracked_offers: number;
  recent_price_points: any[];
}

const SAMPLE_CSV_PREVIEW = `product_id,barcode,product_name,store,price,mrp,delivery_days,seller_rating,in_stock,shipping_fee,region,currency,url
mob-001,8901001000000,Realme 12 Pro+ 5G (Submarine Blue 256GB),Tata CLiQ,22499,29999,2,4.6,true,0,IN,INR,https://www.tatacliq.com/realme-12-pro-plus-5g-256gb
mob-006,8901001000005,Realme Narzo 70 Pro 5G (Glass Green 256GB),Tata CLiQ,18499,24999,3,4.4,true,0,IN,INR,https://www.tatacliq.com/realme-narzo-70-pro-5g
mob-011,8901001000010,Samsung Galaxy S24 Ultra 5G (Titanium Gray 512GB),Vijay Sales,126999,134999,1,4.8,true,0,IN,INR,https://www.vijaysales.com/samsung-galaxy-s24-ultra-512gb
mob-021,8901001000020,Apple iPhone 15 (128 GB) - Black,Croma,66990,79900,1,4.7,true,0,IN,INR,https://www.croma.com/apple-iphone-15-128gb-black
mob-031,8901001000030,OnePlus 12 5G (Silky Black 256GB),Reliance Digital,61499,69999,2,4.5,true,0,IN,INR,https://www.reliancedigital.in/oneplus-12-5g-256gb
lap-001,8901001000060,Apple MacBook Air M2 Chip (13.6-inch 8GB 256GB),Tata CLiQ,87990,99900,2,4.9,true,0,IN,INR,https://www.tatacliq.com/apple-macbook-air-m2-8gb-256gb`;

export default function AdminPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [scheduler, setScheduler] = useState<SchedulerStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [reviewActionMsg, setReviewActionMsg] = useState<string | null>(null);
  const [evalPairA, setEvalPairA] = useState("Realme 12 Pro+ 5G 256GB");
  const [evalPairB, setEvalPairB] = useState("Realme 12 Pro 5G 256GB");
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [feedInput, setFeedInput] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [storesRes, syncRes, schedRes, queueRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stores`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/api/admin/sync-status`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/api/admin/scheduler`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/api/admin/review-queue`).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (storesRes?.stores) setStores(storesRes.stores);
      if (syncRes?.connectors) setConnectors(syncRes.connectors);
      if (schedRes) setScheduler(schedRes);
      if (queueRes?.queue) setReviewQueue(queueRes.queue);
    } catch (err) {
      console.error("Error fetching admin telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const toggleStore = async (storeName: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stores/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: storeName, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setStores((prev) =>
          prev.map((s) => (s.name === storeName ? { ...s, enabled: !currentEnabled } : s))
        );
      }
    } catch (err) {
      console.error("Toggle store error:", err);
    }
  };

  const triggerSync = async (connectorKey: string, simulateFailure: boolean = false) => {
    try {
      setSyncingKey(connectorKey);
      await fetch(`${API_BASE}/api/admin/connectors/${connectorKey}/trigger-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_failure: simulateFailure }),
      });
      await fetchAdminData();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncingKey(null);
    }
  };

  const uploadFeed = async () => {
    if (!feedInput.trim()) return;
    try {
      setUploadStatus("Uploading & merging feed...");
      const res = await fetch(`${API_BASE}/api/admin/feed/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_csv: feedInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus(
          `Feed merged successfully: ${data.offers_merged} offers merged from ${data.rows_read} rows.`
        );
        fetchAdminData();
      } else {
        setUploadStatus(`Upload failed: ${data.detail || "Server error"}`);
      }
    } catch (err: any) {
      setUploadStatus(`Network error: ${err.message}`);
    }
  };

  const runScheduler = async (shiftSample: boolean = false) => {
    try {
      setSchedulerMessage("Running scheduler cycle...");
      const res = await fetch(`${API_BASE}/api/admin/scheduler/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "all", shift_sample_price: shiftSample }),
      });
      const data = await res.json();
      setSchedulerMessage(
        `Cycle complete: ${data.price_points_recorded} PricePoints recorded, ${data.unchanged_skipped} unchanged skipped.`
      );
      fetchAdminData();
    } catch (err: any) {
      setSchedulerMessage(`Scheduler error: ${err.message}`);
    }
  };

  const handleReviewAction = async (itemId: string, action: "approve" | "reject") => {
    try {
      setReviewActionMsg(`Processing review action for ${itemId}...`);
      const res = await fetch(`${API_BASE}/api/admin/review-queue/${itemId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setReviewActionMsg(`Match item ${itemId} was marked as ${action.toUpperCase()}D.`);
        fetchAdminData();
      } else {
        setReviewActionMsg(`Failed: ${data.detail || "Server error"}`);
      }
    } catch (err: any) {
      setReviewActionMsg(`Action error: ${err.message}`);
    }
  };

  const handleEvaluatePair = async () => {
    if (!evalPairA.trim() || !evalPairB.trim()) return;
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/matcher/evaluate-pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_a: evalPairA, title_b: evalPairB }),
      });
      const data = await res.json();
      setEvalResult(data);
    } catch (err: any) {
      setEvalResult({ error: err.message });
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to ShopPilot
              </Link>
              <span className="text-slate-600">|</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin Role: Gokul (Superadmin)
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2 flex items-center gap-2">
              ShopPilot Control Center
              <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                Phase D: ML Matching & Review Queue
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Store connectors, merchant feed ingestion, scheduler telemetry, and ML matching candidate review queue.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Telemetry
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Section 1: Store Toggles */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ToggleRight className="w-5 h-5 text-indigo-400" /> Store Enablement & Offer Filtering
              </h2>
              <p className="text-sm text-slate-400">
                Disabling a store immediately removes all its offers from universal search and product compare pages.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {stores.filter((s) => s.enabled).length} / {stores.length} Stores Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stores.map((s) => (
              <div
                key={s.name}
                className={`p-4 rounded-lg border transition ${
                  s.enabled
                    ? "bg-slate-800/60 border-slate-700/80"
                    : "bg-slate-950/60 border-rose-950/60 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">{s.name}</span>
                  <button
                    onClick={() => toggleStore(s.name, s.enabled)}
                    className={`p-1 rounded-md transition ${
                      s.enabled
                        ? "text-emerald-400 hover:text-emerald-300"
                        : "text-slate-500 hover:text-slate-400"
                    }`}
                    title={s.enabled ? "Disable this store" : "Enable this store"}
                  >
                    {s.enabled ? (
                      <ToggleRight className="w-7 h-7" />
                    ) : (
                      <ToggleLeft className="w-7 h-7" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{s.offer_count} offers</span>
                  <span
                    className={`font-semibold ${
                      s.enabled ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {s.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Connector Sync Monitor */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> Store Connectors Sync Monitor
            </h2>
            <p className="text-sm text-slate-400">
              Real connectors with automatic rate-limit backoff and safe offline fallback. Connector errors show here without breaking shopper pages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors.map((c) => (
              <div
                key={c.key}
                className={`p-5 rounded-lg border ${
                  c.status === "ERROR"
                    ? "bg-rose-950/20 border-rose-800/60"
                    : c.status === "FALLBACK_ACTIVE"
                    ? "bg-amber-950/20 border-amber-800/60"
                    : "bg-slate-800/60 border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{c.name}</span>
                    {c.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      c.status === "ERROR"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : c.status === "FALLBACK_ACTIVE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {c.status === "ERROR" && <XCircle className="w-3.5 h-3.5" />}
                    {c.status === "FALLBACK_ACTIVE" && <AlertTriangle className="w-3.5 h-3.5" />}
                    {c.status === "HEALTHY" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {c.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Configured:</span>
                    <span className={c.is_configured ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                      {c.is_configured ? "Yes (API Keys Present)" : "No (Offline Fallback Active)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Sync:</span>
                    <span className="font-mono text-slate-300">
                      {c.last_sync ? new Date(c.last_sync).toLocaleTimeString() : "Never"}
                    </span>
                  </div>
                  {c.last_error && (
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 mt-2 font-mono text-[11px]">
                      ⚠️ {c.last_error}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() => triggerSync(c.key, false)}
                    disabled={syncingKey === c.key}
                    className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded text-xs font-semibold transition"
                  >
                    {syncingKey === c.key ? "Syncing..." : "Trigger Sync"}
                  </button>
                  {c.key === "amazon" && (
                    <button
                      onClick={() => triggerSync("amazon", true)}
                      title="Simulate a 429 rate limit error to test admin failure reporting without breaking pages"
                      className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 rounded text-xs font-medium transition"
                    >
                      Simulate 429 Error
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Merchant Feed Ingestion */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-sky-400" /> Merchant Feed Ingestion (CSV / XML)
            </h2>
            <p className="text-sm text-slate-400">
              Upload merchant product feeds to merge new store offers into existing catalog products via barcode or ID.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFeedInput(SAMPLE_CSV_PREVIEW)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" /> Load Sample Merchant Feed (Tata CLiQ & Croma)
              </button>
              <span className="text-xs text-slate-500">
                Sample includes offers for Realme 12 Pro, iPhone 15, and Samsung S24 Ultra.
              </span>
            </div>

            <textarea
              value={feedInput}
              onChange={(e) => setFeedInput(e.target.value)}
              placeholder="Paste merchant CSV feed content with product_name, barcode, store, price, mrp, url..."
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-between">
              <button
                onClick={uploadFeed}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition"
              >
                <UploadCloud className="w-4 h-4" /> Upload & Merge Feed CSV
              </button>
              {uploadStatus && (
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-3 py-1.5 rounded border border-emerald-800/40">
                  {uploadStatus}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Price Pipeline Scheduler */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Price Pipeline Scheduler
              </h2>
              <p className="text-sm text-slate-400">
                Tier 1 (popular & tracked items) refreshes frequently; stores PricePoints on change and skips unchanged prices.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => runScheduler(false)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition"
              >
                Run Cycle (Skip Unchanged)
              </button>
              <button
                onClick={() => runScheduler(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition"
              >
                Simulate Price Shift & Run
              </button>
            </div>
          </div>

          {schedulerMessage && (
            <div className="mb-4 p-2.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-semibold">
              ⏱️ {schedulerMessage}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400">PricePoints Recorded</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {scheduler?.total_points_recorded ?? 0}
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400">Unchanged Prices Skipped</span>
              <p className="text-2xl font-bold text-indigo-400 mt-1">
                {scheduler?.total_skipped_unchanged ?? 0}
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400">Tracked Product Offers</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {scheduler?.unique_tracked_offers ?? 0}
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400">Last Scheduler Run</span>
              <p className="text-sm font-mono text-slate-300 mt-2">
                {scheduler?.last_run
                  ? new Date(scheduler.last_run).toLocaleTimeString()
                  : "Pending initial run"}
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Candidate Match Review Queue (ML Stage 2 & 3 Guards) */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl" id="review-queue-section">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">
                  Candidate Match Review Queue (ML Guards)
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                  Order: Barcode → Specs → Embedding
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Candidate pairs with confidence between <span className="text-amber-300 font-mono">0.50</span> and <span className="text-emerald-300 font-mono">0.84</span> are held here instead of merging automatically. (Threshold: <span className="text-emerald-400 font-mono font-bold">≥ 0.85 auto-merge</span>).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full font-semibold">
                {reviewQueue.filter((q) => q.status === "PENDING").length} Pending Verification
              </span>
              <span className="text-xs px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full font-semibold">
                Total: {reviewQueue.length}
              </span>
            </div>
          </div>

          {reviewActionMsg && (
            <div className="mb-4 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-lg text-xs font-medium text-indigo-300 flex items-center justify-between">
              <span>⚡ {reviewActionMsg}</span>
              <button onClick={() => setReviewActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {reviewQueue.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Review queue is clear. All incoming connector pairs matched with &ge; 0.85 confidence or rejected.
            </div>
          ) : (
            <div className="space-y-4">
              {reviewQueue.map((item) => {
                const confPercent = (item.confidence_score * 100).toFixed(1);
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border transition ${
                      item.status === "APPROVED"
                        ? "bg-emerald-950/20 border-emerald-800/40"
                        : item.status === "REJECTED"
                        ? "bg-rose-950/20 border-rose-800/40"
                        : "bg-slate-800/60 border-slate-700/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {item.id}
                        </span>
                        <span className="text-xs uppercase font-bold text-slate-400">
                          Brand: <span className="text-white">{item.brand}</span>
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          • Stage: {item.stage}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                            item.confidence_score >= 0.85
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : item.confidence_score >= 0.70
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          }`}
                        >
                          {confPercent}% Match Confidence
                        </span>

                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            item.status === "APPROVED"
                              ? "bg-emerald-500 text-slate-950"
                              : item.status === "REJECTED"
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500 text-slate-950"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                      <div className="p-3 bg-slate-950/80 rounded border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Existing Catalog Product (A)
                        </div>
                        <div className="font-medium text-slate-100">{item.title_a}</div>
                      </div>
                      <div className="p-3 bg-slate-950/80 rounded border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Incoming Feed Candidate (B)
                        </div>
                        <div className="font-medium text-slate-100">{item.title_b}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700/60">
                      <p className="text-xs text-amber-300/90 font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {item.reason}
                      </p>

                      {item.status === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewAction(item.id, "approve")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Merge
                          </button>
                          <button
                            onClick={() => handleReviewAction(item.id, "reject")}
                            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject Candidate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 6: Live ML Matcher Diagnostic Console */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl mb-12">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" /> Live ML Matcher Diagnostic Tool
            </h2>
            <p className="text-sm text-slate-400">
              Test two arbitrary product titles through the multi-stage matcher to inspect Barcode, Spec Filter, and Dense Embedding similarity decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Title A (Reference Product):</label>
              <input
                type="text"
                value={evalPairA}
                onChange={(e) => setEvalPairA(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Title B (Candidate Listing):</label>
              <input
                type="text"
                value={evalPairB}
                onChange={(e) => setEvalPairB(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleEvaluatePair}
              disabled={evaluating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded text-xs font-semibold flex items-center gap-2 transition"
            >
              {evaluating ? "Evaluating Pipeline..." : "Run Matcher Diagnostic"}
            </button>
            <span className="text-xs text-slate-500">
              Evaluates barcode match, tier modifier, hardware specs, and vector cosine similarity.
            </span>
          </div>

          {evalResult && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-3">
                <span className="text-slate-300 font-semibold">
                  Diagnostic Result: Stage [{evalResult.stage}]
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    evalResult.status === "AUTO_MERGED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : evalResult.status === "PENDING_ADMIN_REVIEW"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  Status: {evalResult.status} ({((evalResult.confidence || 0) * 100).toFixed(1)}% Confidence)
                </span>
              </div>
              <div className="text-slate-300 mb-1">
                <span className="text-slate-500">Decision Reason: </span>
                {evalResult.reason}
              </div>
              <pre className="text-[11px] text-slate-400 mt-2 overflow-x-auto bg-slate-900/60 p-2 rounded">
                {JSON.stringify(evalResult, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
