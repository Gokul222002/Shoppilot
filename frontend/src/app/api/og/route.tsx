import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title") || "ShopPilot Price Comparison";
    const price = searchParams.get("price") || "";
    const store = searchParams.get("store") || "Multiple Stores";
    const subtitle =
      searchParams.get("subtitle") ||
      "Compare real-time prices across Amazon, Flipkart, Croma & Tata CLiQ";
    const discount = searchParams.get("discount") || "";
    const badge = searchParams.get("badge") || "BEST PRICE";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#030712",
            padding: "60px 70px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(249, 115, 22, 0.15) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 40%)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#ffffff",
                }}
              >
                ⚡
              </div>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#ffffff",
                }}
              >
                Shop<span style={{ color: "#f97316" }}>Pilot</span>
              </span>
            </div>
            <div
              style={{
                backgroundColor: "rgba(249, 115, 22, 0.12)",
                border: "1px solid rgba(249, 115, 22, 0.3)",
                borderRadius: "9999px",
                padding: "8px 20px",
                color: "#fb923c",
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {badge}
            </div>
          </div>

          {/* Product details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "20px 0" }}>
            <div
              style={{
                fontSize: title.length > 40 ? "46px" : "56px",
                fontWeight: 900,
                color: "#f3f4f6",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                maxWidth: "960px",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: "24px",
                color: "#9ca3af",
                maxWidth: "850px",
                lineHeight: 1.35,
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Price & Store Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #1f2937",
              paddingTop: "32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
              {price ? (
                <>
                  <span
                    style={{
                      fontSize: "52px",
                      fontWeight: 900,
                      color: "#10b981",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {price}
                  </span>
                  {discount && (
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        color: "#34d399",
                        padding: "6px 14px",
                        borderRadius: "8px",
                      }}
                    >
                      {discount}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: "28px", fontWeight: 700, color: "#e5e7eb" }}>
                  India's Real-Time Price Comparison
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px", color: "#6b7280" }}>Available at:</span>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#ffffff",
                  backgroundColor: "#111827",
                  padding: "8px 18px",
                  borderRadius: "10px",
                  border: "1px solid #374151",
                }}
              >
                {store}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate OG image: ${e.message}`, { status: 500 });
  }
}
