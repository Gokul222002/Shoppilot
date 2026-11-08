/**
 * Centralized API configuration helper for ShopPilot.
 * Intelligently resolves the backend API URL across:
 * - Production deployments on Render
 * - Local development
 * - Mobile/remote browser sessions
 */

export function getApiBase(): string {
  // 1. Explicitly configured build-time or runtime environment variable
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== "http://127.0.0.1:8000") {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // 2. Client-side browser execution: check host
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://127.0.0.1:8000";
    }
  }

  // 3. Production Render backend fallback
  return "https://shoppilot-backend-jts2.onrender.com";
}

export function getWsBase(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "ws://127.0.0.1:8000";
    }
  }
  return "wss://shoppilot-backend-jts2.onrender.com";
}
