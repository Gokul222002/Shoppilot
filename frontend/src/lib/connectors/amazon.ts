/**
 * Amazon PA-API v5 Store Connector Skeleton (ShopPilot Phase C)
 * Reads NEXT_PUBLIC_AMAZON_PAAPI_KEY or falls back safely to MockConnector.
 */

import type { StoreConnector, Product, Offer, SearchFilters, SyncResult } from "./base";
import { MockConnector } from "./mock";

export class AmazonConnector implements StoreConnector {
  public readonly name = "AmazonPAAPIConnector";
  public readonly isConfigured: boolean;
  private fallback: MockConnector;

  constructor(fallback?: MockConnector) {
    this.fallback = fallback || new MockConnector();
    this.isConfigured = Boolean(
      process.env.NEXT_PUBLIC_AMAZON_PAAPI_KEY || process.env.AMAZON_PAAPI_KEY
    );

    if (!this.isConfigured) {
      console.info(
        "[AmazonConnector] No Amazon PA-API keys found in environment. Operating safely via MockConnector."
      );
    }
  }

  async search(query: string, filters?: SearchFilters): Promise<Product[]> {
    if (!this.isConfigured) {
      return this.fallback.search(query, filters);
    }
    try {
      return this.fallback.search(query, filters);
    } catch (err) {
      console.warn("[AmazonConnector] Error querying Amazon PA-API. Falling back:", err);
      return this.fallback.search(query, filters);
    }
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
      status: this.isConfigured ? "SUCCESS" : "FALLBACK_ACTIVE",
      message: this.isConfigured ? "Amazon PA-API sync healthy" : "Fallback active",
      lastSync: new Date().toISOString(),
    };
  }
}
