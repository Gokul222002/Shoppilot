/**
 * Price Freshness Hierarchy and Accuracy Layer (ShopPilot Workstream 6 & 6B)
 * Implements client-side freshness checking:
 *  - live API: fresh within 15 mins
 *  - merchant feed: fresh within 6 hours
 *  - community: fresh within 48 hours
 *  - admin: fresh within 7 days
 *  - demo: simulated presentation (never expires)
 *
 * Expired prices display in grey with "May have changed, check the store" and are excluded from deal claims.
 */

import type { Offer } from "./mock-connector";

export interface FreshnessEvaluation {
  isFresh: boolean;
  isExpired: boolean;
  status: "fresh" | "expired" | "demo";
  warning?: string;
  badgeLabel: string;
  eligibleForDealClaim: boolean;
}

export const FRESHNESS_WINDOWS_MS: Record<string, number> = {
  live: 15 * 60 * 1000,           // 15 mins
  feed: 6 * 60 * 60 * 1000,       // 6 hours
  community: 48 * 60 * 60 * 1000, // 48 hours
  admin: 7 * 24 * 60 * 60 * 1000, // 7 days
  estimate: 14 * 24 * 60 * 60 * 1000, // 14 days
  demo: Infinity,
};

export function evaluatePriceFreshness(offer: Offer, now: number = Date.now()): FreshnessEvaluation {
  const source = (offer.dataSource || "demo").toLowerCase();
  const maxWindow = FRESHNESS_WINDOWS_MS[source] ?? FRESHNESS_WINDOWS_MS.demo;

  if (source === "demo") {
    return {
      isFresh: true,
      isExpired: false,
      status: "demo",
      badgeLabel: "Demo price",
      eligibleForDealClaim: false, // Suppress deal claims on demo data
    };
  }

  const dateStr = offer.lastUpdated;
  const updatedTime = dateStr ? new Date(dateStr).getTime() : 0;

  if (!updatedTime || isNaN(updatedTime)) {
    return {
      isFresh: false,
      isExpired: true,
      status: "expired",
      warning: "May have changed, check the store",
      badgeLabel: "Expired",
      eligibleForDealClaim: false,
    };
  }

  const ageMs = Math.max(0, now - updatedTime);
  const isExpired = ageMs > maxWindow;

  return {
    isFresh: !isExpired,
    isExpired,
    status: isExpired ? "expired" : "fresh",
    warning: isExpired ? "May have changed, check the store" : undefined,
    badgeLabel: isExpired ? "Price may have changed" : "Live price",
    eligibleForDealClaim: !isExpired,
  };
}

export function isPriceExpired(offer: Offer): boolean {
  return evaluatePriceFreshness(offer).isExpired;
}
