/**
 * StoreConnector Interface (ShopPilot Phase C)
 * Standard contract for multi-store price discovery providers.
 */

import type { Product, Offer, SearchFilters, PricePoint } from "../mock-connector";

export type { Product, Offer, SearchFilters, PricePoint };

export interface SyncResult {
  status: "SUCCESS" | "ERROR" | "FALLBACK_ACTIVE";
  message?: string;
  lastSync?: string;
  itemsCount?: number;
}

export interface StoreConnector {
  readonly name: string;
  readonly isConfigured: boolean;

  search(query: string, filters?: SearchFilters): Promise<Product[]> | Product[];
  getProduct(idOrUrl: string): Promise<Product | null> | Product | null;
  getByUrl(url: string): Promise<Product | null> | Product | null;
  getOffers(productId: string): Promise<Offer[]> | Offer[];
  refresh(productId?: string): Promise<SyncResult> | SyncResult;
}
