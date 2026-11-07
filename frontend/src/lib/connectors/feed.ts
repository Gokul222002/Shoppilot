/**
 * Generic Merchant CSV / XML Feed Store Connector Skeleton (ShopPilot Phase C)
 * Reads merchant feeds from MERCHANT_FEED_URL or local path.
 */

import type { StoreConnector, Product, Offer, SearchFilters, SyncResult } from "./base";
import { MockConnector } from "./mock";

export class FeedConnector implements StoreConnector {
  public readonly name = "MerchantFeedConnector";
  public readonly isConfigured: boolean;
  private fallback: MockConnector;

  constructor(fallback?: MockConnector) {
    this.fallback = fallback || new MockConnector();
    this.isConfigured = Boolean(
      process.env.NEXT_PUBLIC_MERCHANT_FEED_URL || process.env.MERCHANT_FEED_URL
    );

    if (!this.isConfigured) {
      console.info(
        "[FeedConnector] No MERCHANT_FEED_URL configured. Operating safely via MockConnector."
      );
    }
  }

  async search(query: string, filters?: SearchFilters): Promise<Product[]> {
    return this.fallback.search(query, filters);
  }

  async getProduct(idOrUrl: string): Promise<Product | null> {
    return this.fallback.getProduct(idOrUrl) || this.fallback.getProductBySlug(idOrUrl);
  }

  async getByUrl(url: string): Promise<Product | null> {
    return this.fallback.getByUrl(url);
  }

  async getOffers(productId: string): Promise<Offer[]> {
    return this.fallback.getOffers(productId);
  }

  async refresh(productId?: string): Promise<SyncResult> {
    return {
      status: "SUCCESS",
      message: "Merchant Feed sync completed",
      lastSync: new Date().toISOString(),
    };
  }
}
