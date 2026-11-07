"use client";

import { useEffect } from "react";

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[ShopPilot PWA] Service Worker registered:", registration.scope);
          })
          .catch((error) => {
            console.warn("[ShopPilot PWA] Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
