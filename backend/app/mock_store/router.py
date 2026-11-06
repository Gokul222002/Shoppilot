"""
Mock E-Commerce Store Router and Interactive Shop Simulation.
Styled with the Trailhead Supply Co Alpine & Terracotta aesthetic.
"""

from fastapi import APIRouter, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional, List, Dict
from app.mock_store.products import MOCK_PRODUCTS

router = APIRouter(prefix="/mock-store", tags=["Mock Store"])

session_cart: List[Dict] = []

@router.get("", response_class=HTMLResponse)
async def mock_store_home(q: Optional[str] = Query(None)):
    """Render full HTML mock e-commerce store styled with Trailhead aesthetic"""
    filtered_products = MOCK_PRODUCTS
    if q:
        q_clean = q.lower()
        filtered_products = [
            p for p in MOCK_PRODUCTS
            if q_clean in p["title"].lower() or q_clean in p["category"].lower() or any(q_clean in s.lower() for s in p["specs"])
        ]

    products_html = ""
    for p in filtered_products:
        clean_title = p["title"].replace('"', '&quot;').replace("'", "")
        safe_js_title = p["title"].replace("'", "").replace('"', '')
        specs_badges = "".join([f'<span class="bg-[#1e2a24] text-[#b2c5bd] text-xs px-2 py-0.5 rounded font-mono border border-[#273830]">{s}</span>' for s in p["specs"][:3]])
        products_html += f"""
        <div class="product-card bg-[#151e19] rounded-2xl shadow-xl border border-[#223129] overflow-hidden hover:border-[#e07a5f]/60 transition duration-300 flex flex-col justify-between"
             data-id="{p['id']}" data-price="{p['price']}" data-title="{clean_title}">
            <div class="relative">
                <img src="{p['image']}" alt="{clean_title}" class="w-full h-52 object-cover">
                <span class="absolute top-2.5 left-2.5 bg-[#1b2621]/90 backdrop-blur-md text-[#e07a5f] border border-[#e07a5f]/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                    {p['badge']}
                </span>
                <span class="absolute top-2.5 right-2.5 bg-[#e07a5f] text-[#0e1411] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow">
                    -{p['discount_pct']}% OFF
                </span>
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <span class="text-[10px] font-bold text-[#e07a5f] uppercase tracking-widest font-mono">{p['category']}</span>
                    <h3 class="font-bold text-[#f4f1de] text-base mt-1 line-clamp-2 uppercase tracking-wide">{p['title']}</h3>
                    <div class="flex items-center gap-1.5 mt-2 text-[#e07a5f] text-xs font-mono">
                        <span>★ {p['rating']}</span>
                        <span class="text-[#72877e] text-xs">({p['reviews']} field reviews)</span>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-3">
                        {specs_badges}
                    </div>
                </div>
                <div class="mt-5 pt-3.5 border-t border-[#223129] flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-black text-[#f4f1de] font-mono">${p['price']:.2f}</div>
                        <div class="text-xs text-[#72877e] line-through font-mono">${p['original_price']:.2f}</div>
                    </div>
                    <button id="add-to-cart-{p['id']}" onclick="addToCart('{p['id']}', '{safe_js_title}', {p['price']})"
                            class="btn-add-to-cart bg-[#e07a5f] hover:bg-[#d1654a] text-[#0e1411] text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg shadow-md transition active:scale-95 flex items-center gap-1.5">
                        <span>🛒 Add to Cart</span>
                    </button>
                </div>
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TRAILHEAD SUPPLY CO. | Flagship Demo Store</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Plus Jakarta Sans', sans-serif; }}
        h1, h2, h3, .heading-font {{ font-family: 'Oswald', sans-serif; }}
        .badge-mono {{ font-family: 'Space Mono', monospace; }}
    </style>
</head>
<body class="bg-[#0e1411] min-h-screen text-[#f4f1de] antialiased">

    <!-- Top Announcement Bar -->
    <header class="bg-[#141d18] text-[#8ba69b] text-[11px] py-2 px-4 flex justify-between items-center border-b border-[#212f29] badge-mono">
        <div class="flex items-center gap-2">
            <span class="bg-[#e07a5f] text-[#0e1411] text-[9px] font-black px-1.5 py-0.5 rounded">FIELD READY</span>
            <span>TRAILHEAD SUPPLY CO. // OFFICIAL MOCK STORE SANDBOX</span>
        </div>
        <div class="text-[#72877e] hidden sm:block">COLORADO, USA • 39°44'N 104°59'W</div>
    </header>

    <!-- Navigation Bar -->
    <nav class="bg-[#141d18]/90 border-b border-[#212f29] sticky top-0 z-30 shadow-xl backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <a href="/mock-store" class="flex items-center gap-3 text-[#f4f1de]">
                    <div class="w-9 h-9 border border-[#f4f1de]/30 rounded flex items-center justify-center bg-[#1b2621]">
                        <svg viewBox="0 0 24 24" class="w-5 h-5 stroke-[#f4f1de] fill-none stroke-[2]">
                            <path d="M2 20L9 6L13 14L16 8L22 20H2Z" stroke-linejoin="round" stroke-linecap="round" />
                        </svg>
                    </div>
                    <div>
                        <span class="heading-font text-xl font-bold tracking-wider uppercase block leading-none">TRAILHEAD</span>
                        <span class="badge-mono text-[9px] text-[#8ba69b] tracking-widest">SUPPLY CO. / DENVER</span>
                    </div>
                </a>
            </div>

            <!-- Search Bar Form -->
            <form onsubmit="event.preventDefault(); doFilterSearch();" class="flex-1 max-w-xl flex items-center relative">
                <input id="search-input" name="q" type="search" value="{q or ''}"
                       placeholder="Search products, monitors, electronics, gear..."
                       class="w-full bg-[#0e1411] border border-[#263730] text-[#f4f1de] rounded-lg pl-4 pr-24 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#e07a5f] focus:border-[#e07a5f] transition placeholder-[#5e8072]" />
                <button id="btn-search" type="button" onclick="doFilterSearch()"
                        class="absolute right-1 top-1 bottom-1 bg-[#e07a5f] hover:bg-[#d1654a] text-[#0e1411] text-xs font-bold uppercase tracking-wider px-4 rounded-md transition heading-font">
                    Search
                </button>
            </form>

            <!-- Cart Trigger Button -->
            <div class="flex items-center gap-4">
                <button id="nav-cart-btn" onclick="toggleCartModal()"
                        class="relative bg-[#1b2621] hover:bg-[#223129] text-[#f4f1de] font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 border border-[#263730] transition">
                    <span>🛒 Cart</span>
                    <span id="cart-count" class="bg-[#e07a5f] text-[#0e1411] text-xs px-2 py-0.5 rounded-full font-black">0</span>
                </button>
            </div>
        </div>
    </nav>

    <!-- Main Store Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="flex items-center justify-between mb-8 pb-4 border-b border-[#212f29]">
            <div>
                <div class="flex items-center gap-2 mb-1.5">
                    <div class="w-6 h-0.5 bg-[#e07a5f]"></div>
                    <span class="badge-mono text-[10px] text-[#e07a5f] font-bold tracking-widest uppercase">CATALOG INVENTORY</span>
                </div>
                <h1 class="text-3xl font-black text-[#f4f1de] uppercase tracking-tight heading-font">Field Gear & Smart Tech Deals</h1>
                <p class="text-xs text-[#8ba69b] mt-1 font-mono">Showing {len(filtered_products)} verified items available in active warehouse</p>
            </div>
            {f'<a href="/mock-store" class="text-xs font-bold text-[#e07a5f] hover:underline badge-mono">CLEAR FILTER</a>' if q else ''}
        </div>

        <div id="product-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products_html}
        </div>
    </main>

    <!-- Dynamic Promotional Flash Deal Popup Overlay -->
    <div id="flash-promo-modal" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-[#141d18] rounded-2xl max-w-md w-full p-7 shadow-2xl border border-[#2c3e37] text-center relative">
            <button id="btn-dismiss-popup" onclick="dismissPopup()"
                    class="btn-dismiss-popup absolute top-3.5 right-3.5 text-[#8ba69b] hover:text-[#f4f1de] bg-[#1c2822] rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                ✕
            </button>
            <div class="w-12 h-12 bg-[#223129] text-[#e07a5f] border border-[#e07a5f]/30 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl">
                🎁
            </div>
            <div class="w-6 h-0.5 bg-[#e07a5f] mx-auto mb-2"></div>
            <h3 class="text-xl font-bold text-[#f4f1de] uppercase heading-font tracking-wide">Expedition Coupon Detected!</h3>
            <p class="text-xs text-[#8ba69b] mt-2 leading-relaxed">
                Use code <span class="font-mono font-bold text-[#e07a5f] bg-[#0e1411] px-1.5 py-0.5 rounded border border-[#223129]">TRAIL15</span> to claim an extra $15 discount on any monitor or technical gear.
            </p>
            <div class="mt-6 flex gap-2 justify-center">
                <button onclick="dismissPopup()" class="bg-[#e07a5f] hover:bg-[#d1654a] text-[#0e1411] text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg shadow-lg heading-font">
                    Dismiss & Continue Browsing
                </button>
            </div>
        </div>
    </div>

    <!-- Cart Modal Drawer -->
    <div id="cart-modal" class="fixed inset-0 bg-black/60 z-50 hidden items-center justify-center p-4">
        <div class="bg-[#141d18] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#2c3e37]">
            <div class="flex justify-between items-center pb-3 border-b border-[#212f29]">
                <h3 class="font-bold text-lg text-[#f4f1de] uppercase heading-font">Shopping Cart Review</h3>
                <button onclick="toggleCartModal()" class="text-[#8ba69b] hover:text-[#f4f1de] text-lg font-bold">✕</button>
            </div>
            <div id="cart-items-container" class="py-4 space-y-3 max-h-60 overflow-y-auto">
                <p class="text-xs text-[#72877e] text-center py-6 font-mono">Your cart is currently empty.</p>
            </div>
            <div class="pt-4 border-t border-[#212f29] flex items-center justify-between">
                <div>
                    <span class="text-[11px] text-[#8ba69b] badge-mono">Simulated Total:</span>
                    <div id="cart-total-price" class="text-2xl font-black text-[#f4f1de] font-mono">$0.00</div>
                </div>
                <button id="btn-checkout" onclick="simulateCheckout()"
                        class="bg-[#e07a5f] hover:bg-[#d1654a] text-[#0e1411] text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg shadow transition heading-font">
                    Simulate Checkout →
                </button>
            </div>
        </div>
    </div>

    <!-- Simulated Checkout Confirmation Modal -->
    <div id="checkout-confirmed-modal" class="fixed inset-0 bg-black/75 z-50 hidden items-center justify-center p-4">
        <div class="bg-[#141d18] rounded-2xl max-w-md w-full p-7 shadow-2xl text-center border border-[#2c3e37]">
            <div class="w-12 h-12 bg-[#1b2621] text-[#e07a5f] border border-[#e07a5f]/40 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                ✓
            </div>
            <h3 class="text-xl font-bold text-[#f4f1de] uppercase heading-font">Checkout Simulation Verified</h3>
            <p class="text-xs text-[#8ba69b] mt-2 leading-relaxed">
                The agent safely reached the checkout review screen without processing real financial charges.
            </p>
            <button onclick="closeCheckoutModal()" class="mt-6 bg-[#e07a5f] text-[#0e1411] text-xs font-bold uppercase tracking-wider px-6 py-2 rounded-lg heading-font">
                Close
            </button>
        </div>
    </div>

    <script>
        let cart = [];

        function doFilterSearch() {{
            const rawQuery = (document.getElementById('search-input').value || '').toLowerCase().trim();
            const terms = rawQuery ? rawQuery.split(/\\s+/) : [];
            const cards = document.querySelectorAll('.product-card');
            cards.forEach(card => {{
                const title = (card.getAttribute('data-title') || '').toLowerCase();
                const matches = terms.length === 0 || terms.every(term => title.includes(term) || (term === 'monitor' && title.includes('display')));
                if (matches) {{
                    card.style.display = 'flex';
                }} else {{
                    card.style.display = 'none';
                }}
            }});
        }}

        function dismissPopup() {{
            const el = document.getElementById('flash-promo-modal');
            if (el) el.remove();
        }}

        function toggleCartModal() {{
            const modal = document.getElementById('cart-modal');
            modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
        }}

        function addToCart(id, title, price) {{
            cart.push({{ id, title, price }});
            document.getElementById('cart-count').innerText = cart.length;
            renderCart();
            window.dispatchEvent(new CustomEvent('cartUpdated', {{ detail: cart }}));
        }}

        function renderCart() {{
            const container = document.getElementById('cart-items-container');
            const totalEl = document.getElementById('cart-total-price');
            if (cart.length === 0) {{
                container.innerHTML = '<p class="text-xs text-[#72877e] text-center py-6 font-mono">Your cart is currently empty.</p>';
                totalEl.innerText = '$0.00';
                return;
            }}
            let total = 0;
            container.innerHTML = cart.map(item => {{
                total += item.price;
                return `
                    <div class="flex items-center justify-between p-2.5 bg-[#0e1411] rounded-lg border border-[#212f29] text-xs">
                        <span class="font-bold text-[#f4f1de] uppercase heading-font">${{item.title}}</span>
                        <span class="font-mono font-bold text-[#e07a5f]">$${{item.price.toFixed(2)}}</span>
                    </div>
                `;
            }}).join('');
            totalEl.innerText = '$' + total.toFixed(2);
        }}

        function simulateCheckout() {{
            document.getElementById('cart-modal').style.display = 'none';
            document.getElementById('checkout-confirmed-modal').style.display = 'flex';
        }}

        function closeCheckoutModal() {{
            document.getElementById('checkout-confirmed-modal').style.display = 'none';
        }}
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

@router.get("/api/products")
async def get_products():
    return JSONResponse(content={"products": MOCK_PRODUCTS})
