/**
 * Frontend Connector Registry (ShopPilot Phase C)
 * Provides centralized switching between mock and real store connectors.
 */

import type { StoreConnector } from "./base";
import { MockConnector } from "./mock";
import { AmazonConnector } from "./amazon";
import { FlipkartConnector } from "./flipkart";
import { FeedConnector } from "./feed";

class ConnectorRegistry {
  private mockConnector = new MockConnector();
  private amazonConnector = new AmazonConnector(this.mockConnector);
  private flipkartConnector = new FlipkartConnector(this.mockConnector);
  private feedConnector = new FeedConnector(this.mockConnector);

  get useMock(): boolean {
    const envVal = process.env.NEXT_PUBLIC_USE_MOCK_DATA;
    if (envVal !== undefined) {
      return envVal.toLowerCase() === "true" || envVal === "1";
    }
    return true; // Default to true when running without keys
  }

  getActiveConnector(): StoreConnector {
    if (this.useMock) {
      return this.mockConnector;
    }

    const primary = (process.env.NEXT_PUBLIC_PRIMARY_CONNECTOR || "amazon").toLowerCase();
    switch (primary) {
      case "flipkart":
        return this.flipkartConnector;
      case "feed":
        return this.feedConnector;
      case "amazon":
      default:
        return this.amazonConnector;
    }
  }

  getConnector(name: "mock" | "amazon" | "flipkart" | "feed"): StoreConnector {
    switch (name) {
      case "amazon":
        return this.amazonConnector;
      case "flipkart":
        return this.flipkartConnector;
      case "feed":
        return this.feedConnector;
      case "mock":
      default:
        return this.mockConnector;
    }
  }
}

export const connectorRegistry = new ConnectorRegistry();
