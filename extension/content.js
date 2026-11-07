/**
 * ShopPilot Chrome Extension Content Script
 * Injected on supported retail store product pages (Amazon.in, Flipkart.com, etc.)
 * Detects current product and shows a floating ShopPilot comparison pill.
 */

(function () {
  console.log("[ShopPilot] Content script injected on retailer page.");

  // Check if we are on a product page
  const isAmazon = window.location.hostname.includes("amazon");
  const isFlipkart = window.location.hostname.includes("flipkart");

  let productTitle = "";
  if (isAmazon) {
    const titleEl = document.getElementById("productTitle");
    if (titleEl) productTitle = titleEl.innerText.trim();
  } else if (isFlipkart) {
    const titleEl = document.querySelector(".B_NuCI") || document.querySelector("h1");
    if (titleEl) productTitle = titleEl.innerText.trim();
  }

  if (!productTitle && document.title) {
    productTitle = document.title.split("|")[0].split("-")[0].trim();
  }

  if (productTitle.length > 5) {
    injectComparisonBadge(productTitle);
  }

  function injectComparisonBadge(title) {
    if (document.getElementById("shoppilot-injected-badge")) return;

    const badge = document.createElement("div");
    badge.id = "shoppilot-injected-badge";
    badge.style.position = "fixed";
    badge.style.bottom = "20px";
    badge.style.right = "20px";
    badge.style.zIndex = "999999";
    badge.style.background = "#030712";
    badge.style.color = "#ffffff";
    badge.style.border = "1px solid #f97316";
    badge.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
    badge.style.borderRadius = "30px";
    badge.style.padding = "8px 16px";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "bold";
    badge.style.fontFamily = "system-ui, -apple-system, sans-serif";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.gap = "8px";
    badge.style.cursor = "pointer";

    badge.innerHTML = `
      <span style="background: #ea580c; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">ShopPilot</span>
      <span>Compare 5 Stores on ShopPilot →</span>
    `;

    badge.onclick = () => {
      window.open(`http://localhost:3000/search?q=${encodeURIComponent(title.slice(0, 40))}`, "_blank");
    };

    document.body.appendChild(badge);
  }
})();
