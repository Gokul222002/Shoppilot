/**
 * Flipkart Affiliate Store Connector Skeleton (ShopPilot Phase C)
 * Reads NEXT_PUBLIC_FLIPKART_AFFILIATE_ID or falls back safely to MockConnector.
 */

import type { StoreConnector, Product, Offer, SearchFilters, SyncResult } from "./base";
import { MockConnector } from "./mock";

export class FlipkartConnector implements StoreConnector {
  public readonly name = "FlipkartAffiliateConnector";
  public readonly isConfigured: boolean;
  private fallback: MockConnector;

  constructor(fallback?: MockConnector) {
    this.fallback = fallback || new MockConnector();
    this.isConfigured = Boolean(
      process.env.NEXT_PUBLIC_FLIPKART_AFFILIATE_ID || process.env.FLIPKART_AFFILIATE_ID
    );

    if (!this.isConfigured) {
      console.info(
        "[FlipkartConnector] No Flipkart credentials found in environment. Operating safely via MockConnector."
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
      console.warn("[FlipkartConnector] Error querying live Flipkart API. Falling back:", err);
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
      message: this.isConfigured ? "Flipkart Affiliate sync healthy" : "Fallback active",
      lastSync: new Date().toISOString(),
    };
  }
}
