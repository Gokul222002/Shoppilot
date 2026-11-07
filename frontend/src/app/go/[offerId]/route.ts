import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { offerId: string } }
) {
  const { offerId } = params;

  let targetUrl = "https://www.amazon.in";
  let storeName = "Merchant";
  let productName = "Item";

  try {
    const raw = decodeURIComponent(offerId);

    // 1. Try decoding Base64 JSON payload
    try {
      const jsonStr = Buffer.from(raw, "base64").toString("utf-8");
      if (jsonStr.startsWith("{") && jsonStr.endsWith("}")) {
        const payload = JSON.parse(jsonStr);
        if (payload.url) targetUrl = payload.url;
        if (payload.store) storeName = payload.store;
        if (payload.product) productName = payload.product;
      }
    } catch {}

    // 2. Direct HTTP url fallback
    if (targetUrl === "https://www.amazon.in" && (raw.startsWith("http://") || raw.startsWith("https://"))) {
      targetUrl = raw;
    }

    // Server-side audit log for outbound affiliate click
    console.log(
      `[SHOPPILOT AFFILIATE DISPATCH] Store: ${storeName} | Product: "${productName}" | Target: ${targetUrl} | IP: ${request.ip || "127.0.0.1"}`
    );

    // Clean 307 Temporary Redirect to destination store (with affiliate link preservation)
    return NextResponse.redirect(new URL(targetUrl), 307);
  } catch (err) {
    console.error("[AFFILIATE REDIRECT ERROR]", err);
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
}
