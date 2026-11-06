"""
Mock E-Commerce Store Router and Interactive Shop Simulation.
Styled with the Trailhead Supply Co Alpine & Terracotta aesthetic (INR / ₹ Pricing).
Provides real-time deal links to Amazon.in and Flipkart.
"""

from fastapi import APIRouter, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional, List, Dict
from app.mock_store.products import MOCK_PRODUCTS, search_products

router = APIRouter(prefix="/mock-store", tags=["Mock Store"])

session_cart: List[Dict] = []

@router.get("", response_class=HTMLResponse)
async def mock_store_home(q: Optional[str] = Query(None)):
    """Render full HTML mock e-commerce store styled with Trailhead aesthetic and INR currency"""
    filtered_products = search_products(q) if q else MOCK_PRODUCTS

    products_html = ""
    for p in filtered_products:
        clean_title = p["title"].replace('"', '&quot;').replace("'", "")
        safe_js_title = p["title"].replace("'", "").replace('"', '')
        store_name = p.get("store", "Amazon.in")
        store_url = p.get("url", f"https://www.amazon.in/s?k={p['title']}")
        specs_badges = "".join([f'<span class="bg-[#1e2a24] text-[#b2c5bd] text-xs px-2 py-0.5 rounded font-mono border border-[#273830]">{s}</span>' for s in p.get("specs", [])[:3]])
        
        products_html += f"""
        <div class="product-card bg-[#151e19] rounded-2xl shadow-xl border border-[#223129] overflow-hidden hover:border-[#e07a5f]/60 transition duration-300 flex flex-col justify-between"
             data-id="{p['id']}" data-price="{p['price']}" data-title="{clean_title}" data-category="{p.get('category', '')}" data-store="{store_name}" data-url="{store_url}">
            <div class="relative">
                <img src="{p['image']}" alt="{clean_title}" class="w-full h-52 object-cover">
                <span class="absolute top-2.5 left-2.5 bg-[#1b2621]/90 backdrop-blur-md text-[#e07a5f] border border-[#e07a5f]/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                    {p.get('badge', 'VERIFIED DEAL')}
                </span>
                <span class="absolute top-2.5 right-2.5 bg-[#e07a5f] text-[#0e1411] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow">
                    -{p.get('discount_pct', 20)}% OFF
                </span>
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px] font-bold text-[#e07a5f] uppercase tracking-widest font-mono">{p.get('category', 'Gear')}</span>
                        <span class="text-[10px] font-bold text-[#8ba69b] font-mono bg-[#141d18] px-2 py-0.5 rounded border border-[#263730]">
                            {store_name}
                        </span>
                    </div>
                    <h3 class="font-bold text-[#f4f1de] text-base mt-1 line-clamp-2 uppercase tracking-wide">{p['title']}</h3>
                    <div class="flex items-center justify-between mt-2 text-[#e07a5f] text-xs font-mono">
                        <div class="flex items-center gap-1.5">
                            <span>★ {p.get('rating', 4.5)}</span>
                            <span class="text-[#72877e] text-xs">({p.get('reviews', 1200)} verified)</span>
                        </div>
                        <a href="{store_url}" target="_blank" rel="noreferrer" class="text-[#e07a5f] hover:underline flex items-center gap-1 font-semibold text-[11px]">
                            Live Link ↗
                        </a>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-3">
                        {specs_badges}
                    </div>
                </div>
                <div class="mt-5 pt-3.5 border-t border-[#223129] flex items-center justify-between gap-3">
                    <div>
                        <div class="text-2xl font-black text-[#f4f1de] font-mono">₹{p['price']:,.0f}</div>
                        <div class="text-xs text-[#72877e] line-through font-mono">₹{p.get('original_price', p['price'] * 1.3):,.0f}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <a href="{store_url}" target="_blank" rel="noreferrer"
                           class="bg-[#1b2621] hover:bg-[#223129] text-[#f4f1de] text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-lg border border-[#263730] transition flex items-center gap-1"
                           title="Visit real product page on {store_name}">
                            <span>↗</span>
                        </a>
                        <button id="add-to-cart-{p['id']}" onclick="addToCart('{p['id']}', '{safe_js_title}', {p['price']}, '{store_name}', '{store_url}')"
                                class="btn-add-to-cart bg-[#e07a5f] hover:bg-[#d1654a] text-[#0e1411] text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg shadow-md transition active:scale-95 flex items-center gap-1.5">
                            <span>🛒 Add to Cart</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TRAILHEAD INDIA | Live Multi-Store Deal Hunter</title>
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
            <span class="bg-[#e07a5f] text-[#0e1411] text-[9px] font-black px-1.5 py-0.5 rounded">MULTI-STORE LIVE</span>
            <span>TRAILHEAD SUPPLY CO. // REAL-TIME INDIAN DEAL HUNTER (AMAZON.IN · FLIPKART)</span>
        </div>
        <div class="text-[#72877e] hidden sm:block">BENGALURU / NEW DELHI • REAL-TIME DEALS IN INR (₹)</div>
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
                        <span class="badge-mono text-[9px] text-[#8ba69b] tracking-widest">DEAL HUNTER / INDIA</span>
                    </div>
                </a>
            </div>

            <!-- Search Bar Form -->
            <form onsubmit="event.preventDefault(); doFilterSearch();" class="flex-1 max-w-xl flex items-center relative">
                <input id="search-input" name="q" type="search" value="{q or ''}"
                       placeholder="Search watches, 4K monitors, running shoes, phones, tech..."
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
                    <span class="badge-mono text-[10px] text-[#e07a5f] font-bold tracking-widest uppercase">LIVE MULTI-STORE INVENTORY</span>
                </div>
                <h1 class="text-3xl font-black text-[#f4f1de] uppercase tracking-tight heading-font">Live Deal Hunter & Verified Storefront</h1>
                <p class="text-xs text-[#8ba69b] mt-1 font-mono">Showing {len(filtered_products)} live offers across Amazon India & Flipkart</p>
            </div>
            {f'<a href="/mock-store" class="text-xs font-bold text-[#e07a5f] hover:underline badge-mono">CLEAR FILTER</a>' if q else ''}
        </div>

        <div id="product-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products_html}
        </div>
    </main>

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
                    <div id="cart-total-price" class="text-2xl font-black text-[#f4f1de] font-mono">₹0</div>
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

        const termAliases = {{
            'watch': ['watch', 'smartwatch', 'analog', 'quartz', 'dial', 'chrono', 'titan', 'noise', 'boat', 'fire-boltt', 'casio', 'fastrack'],
            'smartwatch': ['smartwatch', 'watch', 'calling', 'amoled', 'noise', 'fire-boltt', 'boat', 'fastrack'],
            'shoe': ['shoe', 'shoes', 'sneaker', 'sneakers', 'running', 'marathon', 'nike', 'puma', 'hyperstride'],
            'shoes': ['shoe', 'shoes', 'sneaker', 'sneakers', 'running', 'marathon', 'nike', 'puma', 'hyperstride'],
            'monitor': ['monitor', 'display', 'screen', '4k', 'uhd', 'ips', 'ultraview', 'proscreen', 'acer', 'nitro'],
            'display': ['display', 'monitor', 'screen'],
            'headphone': ['headphone', 'headphones', 'earbuds', 'audio', 'soundpulse', 'sony', 'boat', 'oneplus'],
            'headphones': ['headphone', 'headphones', 'earbuds', 'audio', 'soundpulse', 'sony', 'boat', 'oneplus'],
            'laptop': ['laptop', 'vivobook', 'blade', 'asus', 'computer', 'notebook'],
            'phone': ['phone', 'mobile', 'smartphone', '5g', 'oneplus', 'iphone'],
            'mobile': ['mobile', 'phone', 'smartphone', '5g', 'oneplus', 'iphone']
        }};

        function doFilterSearch() {{
            const rawQuery = (document.getElementById('search-input').value || '').trim();
            if (rawQuery) {{
                window.location.href = '/mock-store?q=' + encodeURIComponent(rawQuery);
            }} else {{
                window.location.href = '/mock-store';
            }}
        }}

        function dismissPopup() {{
            const el = document.getElementById('flash-promo-modal');
            if (el) el.remove();
        }}

        function toggleCartModal() {{
            const modal = document.getElementById('cart-modal');
            modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
        }}

        function addToCart(id, title, price, store, url) {{
            cart.push({{ id, title, price, store: store || 'Amazon.in', url: url || '' }});
            document.getElementById('cart-count').innerText = cart.length;
            renderCart();
            window.dispatchEvent(new CustomEvent('cartUpdated', {{ detail: cart }}));
        }}

        function renderCart() {{
            const container = document.getElementById('cart-items-container');
            const totalEl = document.getElementById('cart-total-price');
            if (cart.length === 0) {{
                container.innerHTML = '<p class="text-xs text-[#72877e] text-center py-6 font-mono">Your cart is currently empty.</p>';
                totalEl.innerText = '₹0';
                return;
            }}
            let total = 0;
            container.innerHTML = cart.map(item => {{
                total += item.price;
                return `
                    <div class="flex items-center justify-between p-2.5 bg-[#0e1411] rounded-lg border border-[#212f29] text-xs">
                        <div>
                            <span class="font-bold text-[#f4f1de] uppercase heading-font block">${{item.title}}</span>
                            <span class="text-[10px] text-[#8ba69b] font-mono">${{item.store}}</span>
                        </div>
                        <div class="text-right">
                            <span class="font-mono font-bold text-[#e07a5f] block">₹${{item.price.toLocaleString('en-IN')}}</span>
                            ${{item.url ? `<a href="${{item.url}}" target="_blank" class="text-[10px] text-[#e07a5f] hover:underline">View Live ↗</a>` : ''}}
                        </div>
                    </div>
                `;
            }}).join('');
            totalEl.innerText = '₹' + total.toLocaleString('en-IN');
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
async def get_products(q: Optional[str] = Query(None)):
    products = search_products(q) if q else MOCK_PRODUCTS
    return JSONResponse(content={"products": products})
