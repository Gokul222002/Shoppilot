/**
 * Mock Store Connector (ShopPilot Phase C)
 * Implements StoreConnector using the 315-product realistic seed catalog.
 */

import { MockConnector as BaseMockConnector } from "../mock-connector";
import type { StoreConnector, Product, Offer, SearchFilters, SyncResult } from "./base";

export class MockConnector extends BaseMockConnector implements StoreConnector {
  public readonly name = "MockConnector";
  public readonly isConfigured = true;

  getOffers(productId: string): Offer[] {
    const prod = this.getProduct(productId);
    return prod ? prod.offers : [];
  }

  getByUrl(url: string): Product | null {
    const clean = url.trim().toLowerCase();
    for (const p of this.getAllProducts()) {
      for (const off of p.offers) {
        if (off.url.toLowerCase() === clean) {
          return p;
        }
      }
    }
    return null;
  }

  refresh(productId?: string): SyncResult {
    return {
      status: "SUCCESS",
      message: "Mock catalog sync healthy",
      lastSync: new Date().toISOString(),
      itemsCount: this.getAllProducts().length,
    };
  }
}
