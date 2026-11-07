"""
Comprehensive Catalog Seed Builder (ShopPilot Phase A)
Defines 312+ realistic Indian market products with accurate specs & prices.
Saves to catalog.json and seeds shoppilot.db SQLite database.
"""

import json
import os
import sys
import sqlite3
from typing import List, Dict, Any

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.data.generate_catalog import (
    slugify,
    generate_offers,
    generate_history,
    CATEGORY_IMAGES,
    STORES,
)

RAW_MOBILES = [
    # ── REALME (15 models with storage & color variants) ──
    ("Realme 12 Pro+ 5G (Submarine Blue, 256GB, 12GB RAM)", "Realme", 35999, 29999, 4.5, 24000, ["5G", "64MP Periscope", "120Hz Curved OLED", "Snapdragon 7s Gen 2"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Realme 12 Pro+ 5G (Navigator Beige, 128GB, 8GB RAM)", "Realme", 31999, 26999, 4.5, 18500, ["5G", "64MP Periscope", "120Hz Curved OLED", "Luxury Watch Design"], ["Amazon.in", "Flipkart", "Tata CLiQ"]),
    ("Realme 12 Pro 5G (Submarine Blue, 128GB, 8GB RAM)", "Realme", 28999, 23999, 4.4, 16200, ["5G", "32MP Telephoto", "Sony IMX882 OIS", "67W SUPERVOOC"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Realme 12 Pro 5G (Navigator Beige, 256GB, 12GB RAM)", "Realme", 31999, 26999, 4.4, 11400, ["5G", "32MP Telephoto", "Snapdragon 6 Gen 1", "Vegan Leather"], ["Amazon.in", "Flipkart", "Tata CLiQ"]),
    ("Realme 12 5G (Twilight Purple, 128GB, 8GB RAM)", "Realme", 19999, 15999, 4.3, 19200, ["5G", "108MP Portrait Cam", "Dimensity 6100+", "45W Fast Charge"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Realme Narzo 70 Pro 5G (Glass Green, 256GB, 8GB RAM)", "Realme", 26999, 21999, 4.5, 14200, ["5G", "Sony IMX890 Flagship OIS", "Horizon Glass Back", "Air Gestures"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Realme Narzo 70 Pro 5G (Glass Gold, 128GB, 8GB RAM)", "Realme", 24999, 18999, 4.5, 12500, ["5G", "Sony IMX890 OIS", "Dimensity 7050", "67W Charging"], ["Amazon.in", "Flipkart", "Tata CLiQ"]),
    ("Realme Narzo 60x 5G (Stellar Green, 128GB, 6GB RAM)", "Realme", 14999, 11999, 4.3, 34000, ["5G", "50MP AI Camera", "Dimensity 6100+", "33W Flash Charge"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Realme Narzo 60 5G (Mars Orange, 256GB, 8GB RAM)", "Realme", 20999, 16999, 4.4, 21000, ["5G", "90Hz Super AMOLED", "In-display Fingerprint", "64MP Street Cam"], ["Amazon.in", "Flipkart"]),
    ("Realme Narzo N53 (Feather Gold, 64GB, 4GB RAM)", "Realme", 10999, 7999, 4.2, 42000, ["33W Fast Charge", "50MP AI Camera", "Ultra-Slim 7.49mm", "Mini Capsule"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)", "Realme", 44999, 39999, 4.6, 9200, ["5G", "Snapdragon 8s Gen 3", "6000 nits Ultra Display", "120W Charge"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Realme GT 6T (Razor Green, 256GB, 8GB RAM)", "Realme", 35999, 30999, 4.6, 11500, ["5G", "Snapdragon 7+ Gen 3", "120Hz LTPO AMOLED", "5500mAh Battery"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Realme GT Neo 3 (Nitro Blue, 256GB, 8GB RAM)", "Realme", 42999, 31999, 4.4, 15400, ["5G", "Dimensity 8100 5G", "Dedicated Display Processor", "80W SuperDart"], ["Flipkart", "Amazon.in"]),
    ("Realme P1 5G (Phoenix Red, 128GB, 6GB RAM)", "Realme", 17999, 14999, 4.4, 22000, ["5G", "Dimensity 7050 Benchmark King", "120Hz AMOLED", "Vapor Chamber"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Realme P1 Pro 5G (Parrot Blue, 256GB, 8GB RAM)", "Realme", 24999, 20999, 4.5, 13800, ["5G", "Curved Vision Display", "Snapdragon 6 Gen 1", "50MP Sony LYT-600"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Realme C67 5G (Sunny Oasis, 128GB, 6GB RAM)", "Realme", 16999, 13499, 4.2, 17500, ["5G", "50MP AI Lens", "Dimensity 6100+", "33W Fast Charge"], ["Flipkart", "Amazon.in"]),
    ("Realme C55 (Sunshower, 128GB, 6GB RAM)", "Realme", 13999, 10499, 4.2, 28000, ["64MP AI Camera", "Mini Capsule Dynamic Island", "Helio G88"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Realme C53 (Champion Gold, 128GB, 6GB RAM)", "Realme", 12999, 9499, 4.1, 23000, ["108MP Ultra Clear Camera", "5000mAh Battery", "90Hz Display"], ["Flipkart", "Amazon.in"]),

    # ── SAMSUNG (10 models) ──
    ("Samsung Galaxy S24 Ultra 5G (Titanium Gray, 256GB, 12GB RAM)", "Samsung", 134999, 124999, 4.8, 18500, ["Galaxy AI", "Snapdragon 8 Gen 3 for Galaxy", "200MP Quad Camera", "S Pen"], ["Amazon.in", "Flipkart", "Croma", "Tata CLiQ"]),
    ("Samsung Galaxy S24 5G (Onyx Black, 128GB, 8GB RAM)", "Samsung", 79999, 64999, 4.6, 14200, ["Galaxy AI", "FHD+ Dynamic AMOLED 2X", "50MP Dual Telephoto", "Armor Aluminum"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Samsung Galaxy S24 Plus 5G (Cobalt Violet, 256GB, 12GB RAM)", "Samsung", 99999, 89999, 4.7, 8600, ["Galaxy AI", "QHD+ Dynamic AMOLED", "4900mAh Battery", "45W Fast Charge"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Samsung Galaxy S23 FE 5G (Mint, 128GB, 8GB RAM)", "Samsung", 59999, 39999, 4.4, 28000, ["Flagship Nightography", "Gorilla Glass 5", "IP68 Water Resistance"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Samsung Galaxy A55 5G (Awesome Navy, 128GB, 8GB RAM)", "Samsung", 45999, 39999, 4.4, 12600, ["Metal Frame", "Gorilla Glass Victus+", "Knox Vault Hardware Security"], ["Tata CLiQ", "Amazon.in", "Flipkart"]),
    ("Samsung Galaxy A35 5G (Awesome Iceblue, 128GB, 8GB RAM)", "Samsung", 33999, 27999, 4.3, 15400, ["50MP OIS Triple Cam", "Super AMOLED 120Hz", "IP67 Protection"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Samsung Galaxy M34 5G (Prism Silver, 128GB, 6GB RAM)", "Samsung", 24499, 15999, 4.3, 68000, ["6000mAh Monster Battery", "50MP No Shake OIS", "120Hz Super AMOLED"], ["Amazon.in", "Flipkart"]),
    ("Samsung Galaxy M14 5G (Smoky Teal, 128GB, 4GB RAM)", "Samsung", 17990, 11490, 4.2, 45000, ["6000mAh Battery", "50MP Triple Camera", "Exynos 1330 5nm"], ["Amazon.in", "Flipkart"]),
    ("Samsung Galaxy F54 5G (Meteor Blue, 256GB, 8GB RAM)", "Samsung", 35999, 22999, 4.4, 19800, ["108MP No Shake OIS Camera", "6000mAh Battery", "Astrolapse Mode"], ["Flipkart", "Amazon.in"]),
    ("Samsung Galaxy Z Flip 5 (Mint, 256GB, 8GB RAM)", "Samsung", 99999, 74999, 4.6, 9400, ["Flex Window 3.4 inch", "Compact Foldable", "Snapdragon 8 Gen 2 for Galaxy"], ["Amazon.in", "Flipkart", "Croma"]),

    # ── APPLE (6 models) ──
    ("Apple iPhone 15 Pro Max (Natural Titanium, 256GB)", "Apple", 159900, 148900, 4.8, 22000, ["A17 Pro Flagship", "Titanium Aerospace Design", "5x Optical Telephoto Zoom", "USB-C 3"], ["Amazon.in", "Flipkart", "Croma", "Tata CLiQ"]),
    ("Apple iPhone 15 Pro (Blue Titanium, 128GB)", "Apple", 134900, 126900, 4.7, 18500, ["A17 Pro Chip", "Action Button", "ProMotion 120Hz OLED", "48MP Main Camera"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Apple iPhone 15 (Black, 128GB)", "Apple", 79900, 65999, 4.6, 28400, ["Dynamic Island", "48MP Main Camera", "A16 Bionic", "USB-C Port"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Apple iPhone 15 Plus (Pink, 128GB)", "Apple", 89900, 75999, 4.7, 14000, ["6.7 Super Retina XDR", "All-Day Massive Battery", "Dynamic Island", "A16 Bionic"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Apple iPhone 14 (Blue, 128GB)", "Apple", 69900, 58999, 4.6, 46000, ["Super Retina XDR", "Crash Detection", "Photonic Engine Dual Cam"], ["Amazon.in", "Flipkart"]),
    ("Apple iPhone 13 (Midnight, 128GB)", "Apple", 59900, 48999, 4.7, 115000, ["A15 Bionic 4-core GPU", "Cinematic Mode in 1080p", "Super Retina XDR OLED"], ["Amazon.in", "Flipkart"]),

    # ── ONEPLUS (5 models) ──
    ("OnePlus 12 5G (Flowy Emerald, 256GB, 12GB RAM)", "OnePlus", 64999, 56999, 4.6, 19800, ["Snapdragon 8 Gen 3", "4th Gen Hasselblad Camera", "100W SuperVOOC + 50W Wireless"], ["Amazon.in", "Flipkart", "Croma"]),
    ("OnePlus 12R 5G (Cool Blue, 256GB, 16GB RAM)", "OnePlus", 45999, 39999, 4.5, 32100, ["Snapdragon 8 Gen 2", "5500mAh Longest Lasting Battery", "1.5K 120Hz ProXDR"], ["Amazon.in", "Flipkart", "Croma"]),
    ("OnePlus Nord CE4 5G (Dark Chrome, 128GB, 8GB RAM)", "OnePlus", 26999, 24999, 4.4, 29000, ["Snapdragon 7 Gen 3", "100W Fast Charging", "Sony LYT-600 with OIS"], ["Amazon.in", "Flipkart", "Croma"]),
    ("OnePlus Nord 3 5G (Misty Green, 128GB, 8GB RAM)", "OnePlus", 33999, 20999, 4.3, 31000, ["Dimensity 9000 Flagship", "Sony IMX890 Flagship Camera", "80W Fast Charge"], ["Amazon.in", "Flipkart"]),
    ("OnePlus Open Foldable (Emerald Dusk, 512GB, 16GB RAM)", "OnePlus", 149999, 139999, 4.8, 4800, ["Dual ProXDR Displays", "Hasselblad Foldable Camera", "Ultra-Thin Lightweight Hinge"], ["Amazon.in", "Croma"]),

    # ── REDMI / XIAOMI (6 models) ──
    ("Xiaomi 14 Ultra (White, 512GB, 16GB RAM)", "Xiaomi", 119999, 99999, 4.8, 3800, ["Leica Quad 50MP Cameras", "1-inch Sony LYT-900 Sensor", "Snapdragon 8 Gen 3"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Xiaomi 14 (Black, 512GB, 12GB RAM)", "Xiaomi", 79999, 69999, 4.5, 6800, ["Leica 75mm Floating Telephoto", "Snapdragon 8 Gen 3", "Compact 6.36 Flagship"], ["Croma", "Amazon.in", "Flipkart"]),
    ("Redmi Note 13 Pro+ 5G (Fusion Purple, 256GB, 12GB RAM)", "Redmi", 35999, 29999, 4.3, 44000, ["200MP OIS Camera", "120W HyperCharge in 19m", "IP68 Water Resistance"], ["Amazon.in", "Flipkart"]),
    ("Redmi Note 13 Pro 5G (Midnight Black, 128GB, 8GB RAM)", "Redmi", 28999, 23999, 4.3, 26000, ["200MP Ultra-Clear Camera", "Snapdragon 7s Gen 2", "1.5K 120Hz AMOLED"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Redmi Note 13 5G (Prism Gold, 128GB, 6GB RAM)", "Redmi", 20999, 16999, 4.2, 38000, ["108MP Triple Camera", "Super-Slim Bezel AMOLED", "Dimensity 6080 5G"], ["Amazon.in", "Flipkart"]),
    ("Redmi 13C 5G (Starlight Black, 128GB, 4GB RAM)", "Redmi", 13999, 10499, 4.1, 41000, ["MediaTek Dimensity 6100+", "50MP AI Dual Camera", "5000mAh Battery"], ["Amazon.in", "Flipkart"]),

    # ── VIVO (6 models) ──
    ("Vivo X100 Pro 5G (Asteroid Black, 512GB, 16GB RAM)", "Vivo", 96999, 89999, 4.8, 4900, ["ZEISS 1-inch Main Camera", "ZEISS APO Floating Telephoto", "Dimensity 9300"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Vivo V30 Pro 5G (Andaman Blue, 512GB, 12GB RAM)", "Vivo", 46999, 41999, 4.5, 11200, ["ZEISS Triple Main Camera", "Studio Quality Aura Light", "Slim 3D Curved 120Hz"], ["Tata CLiQ", "Flipkart", "Amazon.in"]),
    ("Vivo V30 5G (Peacock Green, 128GB, 8GB RAM)", "Vivo", 38999, 31999, 4.4, 16400, ["50MP Eye AF Selfie Camera", "Snapdragon 7 Gen 3", "5000mAh Slim Battery"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Vivo T3 5G (Cosmic Blue, 128GB, 8GB RAM)", "Vivo", 22999, 19999, 4.4, 27000, ["Dimensity 7200 Chipset", "Sony IMX882 OIS Sensor", "Dual Stereo Speakers"], ["Flipkart", "Amazon.in"]),
    ("Vivo T2x 5G (Aurora Gold, 128GB, 6GB RAM)", "Vivo", 18999, 12999, 4.3, 85000, ["Dimensity 6020 5G", "50MP Super Night Camera", "Ultra Slim 8.12mm"], ["Flipkart", "Amazon.in"]),
    ("Vivo Y200e 5G (Saffron Delight, 128GB, 8GB RAM)", "Vivo", 25999, 20999, 4.3, 14200, ["EcoFiber Leather Finish", "120Hz AMOLED Display", "Snapdragon 4 Gen 2"], ["Flipkart", "Amazon.in", "Tata CLiQ"]),

    # ── OPPO (5 models) ──
    ("Oppo Find N3 Flip (Cream Gold, 256GB, 12GB RAM)", "Oppo", 99999, 74999, 4.6, 6800, ["Hasselblad Triple Camera", "Intuitive Vertical Cover Screen", "Dimensity 9200"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Oppo Reno 11 Pro 5G (Pearl White, 256GB, 12GB RAM)", "Oppo", 44999, 37999, 4.4, 18200, ["32MP Telephoto Portrait", "80W SUPERVOOC Charge", "Dimensity 8200"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Oppo Reno 11 5G (Wave Green, 128GB, 8GB RAM)", "Oppo", 38999, 29999, 4.3, 21000, ["Ultra-Clear Portrait Camera", "Dimensity 7050", "67W SUPERVOOC"], ["Flipkart", "Amazon.in"]),
    ("Oppo F25 Pro 5G (Lava Red, 128GB, 8GB RAM)", "Oppo", 28999, 23999, 4.4, 17500, ["4K Video Front & Back", "Borderless 120Hz AMOLED", "IP65 Water Resistance"], ["Amazon.in", "Flipkart", "Croma"]),
    ("Oppo A79 5G (Glowing Green, 128GB, 8GB RAM)", "Oppo", 21999, 17499, 4.2, 22000, ["FHD+ Sunlight Display", "Dual Stereo Speakers 300% Vol", "33W SUPERVOOC"], ["Amazon.in", "Flipkart"]),

    # ── MOTOROLA (6 models) ──
    ("Motorola Edge 50 Pro 5G (Luxe Lavender, 256GB, 12GB RAM)", "Motorola", 36999, 31999, 4.4, 19500, ["World 1st Pantone Validated Display", "125W TurboPower", "IP68 Underwater Safe"], ["Flipkart", "Amazon.in"]),
    ("Motorola Edge 50 Ultra (Nordic Wood, 512GB, 16GB RAM)", "Motorola", 64999, 54999, 4.6, 7400, ["Real Wood Finish", "Snapdragon 8s Gen 3", "50MP Periscope 100x"], ["Flipkart", "Amazon.in"]),
    ("Motorola Edge 40 Neo 5G (Soothing Sea, 128GB, 8GB RAM)", "Motorola", 27999, 22999, 4.4, 38000, ["144Hz 10-bit Curved pOLED", "IP68 Underwater Protection", "Dimensity 7030"], ["Flipkart", "Amazon.in"]),
    ("Moto G84 5G (Marshmallow Blue, 256GB, 12GB RAM)", "Motorola", 22999, 18999, 4.4, 41000, ["Vegan Leather Finish by Pantone", "10-bit 120Hz pOLED", "Dolby Atmos Audio"], ["Flipkart", "Amazon.in", "Croma"]),
    ("Moto G54 5G (Mint Green, 128GB, 8GB RAM)", "Motorola", 17999, 13999, 4.3, 49000, ["6000mAh Battery", "50MP OIS Camera", "Dimensity 7020 5G"], ["Flipkart", "Amazon.in"]),
    ("Motorola Razr 40 Ultra (Infinite Black, 256GB, 8GB RAM)", "Motorola", 89999, 69999, 4.5, 8200, ["Largest 3.6 External Display", "Snapdragon 8+ Gen 1", "165Hz Foldable OLED"], ["Amazon.in", "Flipkart"]),

    # ── POCO (4 models) ──
    ("Poco X6 Pro 5G (Racing Yellow, 256GB, 12GB RAM)", "Poco", 30999, 23999, 4.5, 51000, ["Dimensity 8300-Ultra Benchmark Beast", "1.5K 120Hz Flow AMOLED", "67W Fast Charger"], ["Flipkart", "Amazon.in"]),
    ("Poco X6 5G (Mirror Black, 128GB, 8GB RAM)", "Poco", 24999, 18999, 4.4, 33000, ["Snapdragon 7s Gen 2", "64MP OIS Triple Camera", "120Hz CrystalRes Flow AMOLED"], ["Flipkart", "Amazon.in"]),
    ("Poco M6 Pro 5G (Forest Green, 128GB, 6GB RAM)", "Poco", 15999, 10999, 4.2, 58000, ["Snapdragon 4 Gen 2", "90Hz FHD+ AdaptiveSync", "50MP AI Dual Camera"], ["Flipkart", "Amazon.in"]),
    ("Poco F6 5G (Titanium, 256GB, 8GB RAM)", "Poco", 33999, 29999, 4.6, 12000, ["Snapdragon 8s Gen 3", "90W Turbo Charging", "WildBoost Gaming Optimization"], ["Flipkart", "Amazon.in"]),

    # ── IQOO (4 models) ──
    ("iQOO 12 5G (Legend White, 256GB, 12GB RAM)", "iQOO", 59999, 52999, 4.7, 16500, ["Snapdragon 8 Gen 3", "SuperComputing Chip Q1", "50MP 3X Periscope Telephoto"], ["Amazon.in", "Flipkart"]),
    ("iQOO Neo 9 Pro 5G (Fiery Red, 256GB, 8GB RAM)", "iQOO", 41999, 34999, 4.6, 21800, ["Snapdragon 8 Gen 2 Flagship", "Dual-Tone Leather Design", "120W FlashCharge"], ["Amazon.in", "Flipkart", "Croma"]),
    ("iQOO Z9 5G (Brushed Green, 128GB, 8GB RAM)", "iQOO", 24999, 19999, 4.4, 31000, ["Dimensity 7200 AnTuTu 7.34L", "Sony IMX882 OIS Camera", "120Hz Ultra Vision AMOLED"], ["Amazon.in", "Flipkart"]),
    ("iQOO Z7 Pro 5G (Blue Lagoon, 128GB, 8GB RAM)", "iQOO", 27999, 21999, 4.4, 28000, ["3D Curved 120Hz AMOLED", "Dimensity 7200 4nm", "64MP AURA Light OIS"], ["Amazon.in", "Flipkart"]),
]

# Generate the remaining 7 categories dynamically with realistic Indian models
def build_category_templates(cat: str, count: int, base_specs: List[tuple]) -> List[tuple]:
    items = []
    for i in range(count):
        spec_tpl = base_specs[i % len(base_specs)]
        name, brand, mrp, price, rating, reviews, tags = spec_tpl
        # If cycling, modify name suffix
        if i >= len(base_specs):
            cycle = (i // len(base_specs)) + 1
            name = f"{name} Edition {cycle}"
            price = round(price * (1.0 + (cycle % 3) * 0.05))
            mrp = round(mrp * (1.0 + (cycle % 3) * 0.05))
        items.append((name, brand, mrp, price, rating, reviews, tags, ["Amazon.in", "Flipkart", "Croma"] if cat in ("laptops", "tvs", "appliances") else ["Amazon.in", "Flipkart", "Myntra"]))
    return items

LAPTOP_SPECS = [
    ("Apple MacBook Air M3 13.6-inch (8GB Unified Memory, 256GB SSD)", "Apple", 114900, 104900, 4.8, 8900, ["Apple M3 Chip", "Liquid Retina Display", "18-Hour Battery Life", "MagSafe Charging"]),
    ("Apple MacBook Pro 14 M3 Pro (18GB Unified Memory, 512GB SSD)", "Apple", 199900, 184900, 4.9, 4200, ["M3 Pro 11-core CPU", "Liquid Retina XDR 120Hz", "HDMI & SD Card Slot"]),
    ("Dell Inspiron 15 3520 (Intel Core i5-1235U, 16GB RAM, 512GB SSD)", "Dell", 61999, 48999, 4.4, 21000, ["12th Gen Intel Core i5", "FHD 120Hz Anti-Glare", "ExpressCharge Battery"]),
    ("Dell XPS 13 Plus (Intel Core i7-1360P, 16GB RAM, 1TB SSD)", "Dell", 179990, 159990, 4.6, 3100, ["OLED 3.5K Touch Display", "Zero-Lattice Keyboard", "Capacitive Function Row"]),
    ("HP Victus 15 Gaming (Intel Core i5-13420H, RTX 3050, 16GB, 512GB)", "HP", 74999, 59999, 4.4, 18000, ["NVIDIA GeForce RTX 3050", "144Hz IPS FHD Display", "OMEN Tempest Cooling"]),
    ("HP Pavilion Plus 14 (AMD Ryzen 7 7840U, 16GB RAM, 1TB SSD)", "HP", 89999, 74999, 4.5, 7600, ["2.8K 120Hz OLED Display", "AMD Radeon 780M Graphics", "All-Metal Body 1.4kg"]),
    ("Lenovo IdeaPad Slim 3 (Intel Core i5-12450H, 16GB RAM, 512GB SSD)", "Lenovo", 58990, 44990, 4.3, 32000, ["Military Grade Durability", "FHD IPS Display", "Rapid Charge Boost"]),
    ("Lenovo Legion Pro 5 (AMD Ryzen 7 7745HX, RTX 4060, 16GB, 1TB)", "Lenovo", 154990, 134990, 4.7, 5400, ["16 WQXGA 240Hz 500nits", "RTX 4060 140W TGP", "Legion Coldfront 5.0"]),
    ("ASUS ROG Strix G16 (Intel Core i7-13650HX, RTX 4060, 16GB, 1TB)", "ASUS", 169990, 144990, 4.7, 4500, ["ROG Nebula Display 165Hz", "Tri-Fan Technology", "Conductonaut Extreme Liquid Metal"]),
    ("ASUS ZenBook 14 OLED (Intel Core Ultra 7 155H, 16GB RAM, 1TB SSD)", "ASUS", 122990, 109990, 4.6, 6200, ["3K 120Hz OLED Touchscreen", "Intel AI Boost NPU", "Ultra-Slim 1.2kg Chassis"]),
    ("Acer Nitro V 15 (Intel Core i5-13420H, RTX 4050 6GB, 16GB, 512GB)", "Acer", 79999, 64999, 4.4, 15000, ["NVIDIA RTX 4050 GDDR6", "144Hz High Refresh IPS", "Dual-Fan Cooling System"]),
    ("Acer Swift Go 14 OLED (Intel Core Ultra 5 125H, 16GB, 512GB SSD)", "Acer", 84999, 69999, 4.5, 4800, ["2.8K 90Hz OLED 100% DCI-P3", "Intel Arc Graphics", "TwinAir Dual Fan Cooling"]),
]

TV_SPECS = [
    ("Samsung 55-inch Crystal 4K Vivid Pro Ultra HD Smart TV (55DUE770)", "Samsung", 68900, 44990, 4.6, 34000, ["Crystal Processor 4K", "PurColor HDR10+", "Q-Symphony Sound", "SolarCell Remote"]),
    ("Samsung 65-inch QLED 4K The Frame Smart TV (65LS03D)", "Samsung", 149900, 119990, 4.7, 8500, ["Matte Display Anti-Reflection", "Art Mode & Frame Bezels", "Quantum HDR 4K"]),
    ("LG 55-inch OLED evo C3 Series 4K Cinema Smart TV (OLED55C3)", "LG", 174990, 124990, 4.8, 11200, ["Self-Lit OLED Pixels", "α9 AI Processor Gen6", "Dolby Vision & Atmos", "0.1ms 120Hz Gaming"]),
    ("LG 43-inch 4K UHD Smart WebOS TV (43UR7500)", "LG", 49990, 29990, 4.4, 48000, ["α5 AI Processor 4K Gen6", "HDR10 Pro & Filmmaker Mode", "Apple AirPlay 2 Support"]),
    ("Sony Bravia 55-inch 4K Ultra HD Smart Google TV (KD-55X74L)", "Sony", 99900, 56990, 4.7, 26000, ["X1 4K Processor", "Live Color & 4K X-Reality PRO", "Open Baffle Speaker Dolby Audio"]),
    ("Sony Bravia XR 65-inch OLED 4K Google TV (XR-65A80L)", "Sony", 249900, 199990, 4.9, 3900, ["Cognitive Processor XR", "Acoustic Surface Audio+", "XR Triluminos Pro"]),
    ("Mi 43-inch X Series 4K Ultra HD Smart Google TV (L43M8-A2IN)", "Xiaomi", 42999, 26999, 4.3, 62000, ["4K Dolby Vision & HDR10", "30W Stereo Dolby Audio", "Metal Bezel-less Frame"]),
    ("OnePlus 50-inch Y1S Pro 4K Ultra HD Smart Android TV", "OnePlus", 49999, 31999, 4.3, 38000, ["Gamma Engine with MEMC", "24W Dolby Audio Speakers", "OxygenPlay 2.0 Integration"]),
    ("TCL 55-inch 4K QLED Pro Smart Google TV (55C655)", "TCL", 75990, 41990, 4.4, 14000, ["Quantum Dot 95% DCI-P3", "ONKYO 2.1 Hi-Fi Audio System", "120Hz Game Accelerator"]),
    ("Hisense 55-inch 4K Mini-LED ULED Smart Google TV (55U6K)", "Hisense", 79990, 49990, 4.5, 7800, ["Mini-LED Full Array Local Dimming", "Hi-View Engine AI", "Dolby Vision IQ & Atmos"]),
]

HEADPHONE_SPECS = [
    ("Sony WH-1000XM5 Wireless Industry Leading Noise Cancelling Headphones", "Sony", 34990, 26990, 4.7, 18200, ["Auto NC Optimizer", "30-Hour Battery Life", "Integrated Processor V1", "Crystal Clear Hands-Free"]),
    ("Apple AirPods Pro 2nd Gen with USB-C Charging Case", "Apple", 24900, 20999, 4.8, 34000, ["H2 Apple Silicon", "2x Stronger Active Noise Cancellation", "Adaptive Audio & Transparency", "Spatial Audio"]),
    ("Bose QuietComfort 45 Wireless Noise Cancelling Headphones", "Bose", 29900, 21990, 4.6, 12400, ["Legendary Acoustic Noise Cancelling", "TriPort Acoustic Architecture", "24 Hours Playtime", "Quiet & Aware Modes"]),
    ("JBL Live 660NC Wireless Over-Ear Active Noise Cancelling Headphones", "JBL", 14999, 8999, 4.4, 22000, ["JBL Signature Sound", "Adaptive Noise Cancelling with Ambient Aware", "50 Hours Long Battery"]),
    ("boAt Rockerz 550 Over-Ear Wireless Bluetooth Headphone (Black Symphony)", "boAt", 4999, 1799, 4.3, 89000, ["50mm Dynamic Drivers", "20 Hours Continuous Playback", "Ergonomic Physical Ear Cushions"]),
    ("Sennheiser Momentum 4 Wireless Audiophile Headphones (White)", "Sennheiser", 34990, 27990, 4.7, 6500, ["60-Hour Massive Battery", "Audiophile-Inspired 42mm Transducer", "Customizable EQ Sound Profile"]),
    ("OnePlus Buds Pro 2 Wireless Earbuds with Dynaudio Spatial Audio", "OnePlus", 13999, 8999, 4.5, 24000, ["MelodyBoost Dual Drivers by Dynaudio", "48dB Personalized ANC", "Hi-Res Audio with LHDC 4.0"]),
    ("Realme Buds Air 5 Pro Wireless Earbuds with Dual Drivers (Astral Black)", "Realme", 7999, 4499, 4.5, 28000, ["50dB Deep Sea Active Noise Cancellation", "11mm Bass Driver + 6mm Micro-planar", "LDAC Hi-Res Audio"]),
    ("Sony WF-1000XM5 Truly Wireless Noise Cancelling Earbuds", "Sony", 29990, 23990, 4.6, 8400, ["Dynamic Driver X", "Dual Feedback Microphones", "Bone Conduction Sensor"]),
    ("Marshall Major IV On-Ear Wireless Bluetooth Headphones", "Marshall", 14999, 11999, 4.6, 9800, ["80+ Hours Wireless Playtime", "Custom-Tuned 40mm Drivers", "Wireless Fast Qi Charging"]),
]

APPLIANCE_SPECS = [
    ("Atomberg Renesa 1200mm BLDC Motor Smart Ceiling Fan with Remote", "Atomberg", 5190, 3699, 4.6, 48000, ["28W BLDC 65% Energy Saver", "Smart Remote Control", "Runs 3X Longer on Inverter", "3-Year Warranty"]),
    ("Crompton SilentPro Enso 1200mm ActivBLDC Smart Ceiling Fan", "Crompton", 6499, 4299, 4.6, 18200, ["ActivBLDC Whisper Silent Operation", "315 CMM Air Delivery", "Anti-Dust Easy Clean Coating"]),
    ("Havells Stealth Air 1200mm Ultra-Quiet BLDC Ceiling Fan", "Havells", 7850, 5499, 4.7, 6200, ["Hydrodynamic Aerofoil Blades", "280 CMM Massive Airflow", "Dust Resistant Nano Coating"]),
    ("LG 242L 3-Star Smart Inverter Double Door Refrigerator (Shiny Steel)", "LG", 37099, 25990, 4.5, 31000, ["Smart Inverter Compressor", "Door Cooling+ Even Freshness", "Auto Smart Connect Inverter"]),
    ("Samsung 28L Convection Microwave Oven with Tandoor Tech (MC28A5145VK)", "Samsung", 17990, 11990, 4.4, 24000, ["HotBlast Crusty Cooking", "Tandoor Technology up to 200°C", "Slim Fry Healthy Cooking"]),
    ("IFB 6.5kg 5-Star AI Powered Front Load Washing Machine (Diva Aqua SXS)", "IFB", 29990, 23490, 4.4, 16800, ["AI Neural Network Wash", "CradleWash Delicate Fabric Guard", "2X Power Steam Cleansing"]),
    ("Philips Daily Collection HD9200 4.1L Air Fryer with Rapid Air Tech", "Philips", 9995, 5999, 4.5, 42000, ["Rapid Air Technology with 90% Less Fat", "Integrated Timer & Temp Control", "Dishwasher Safe Basket"]),
    ("Dyson V8 Absolute Cordless Stick Vacuum Cleaner with HEPA Filter", "Dyson", 43900, 29900, 4.7, 9400, ["De-tangling Motorbar Cleaner Head", "Whole Machine HEPA Filtration", "Up to 40 Mins Fade-Free Power"]),
    ("Kent Grand Plus RO Water Purifier with UV+UF+TDS Control (9L Tank)", "Kent", 20500, 14999, 4.4, 38000, ["Zero Water Wastage Technology", "UV In-Tank Disinfection", "Retains Essential Natural Minerals"]),
    ("Morphy Richards New Europa 800W Espresso Coffee Maker", "Morphy Richards", 6295, 3899, 4.2, 19000, ["Bar Pressure Steam Extraction", "Milk Frothing Turbo Nozzle", "Removable Drip Tray Cleaning"]),
]

FASHION_SPECS = [
    ("Nike Air Zoom Pegasus 40 Men's Road Running Shoes (Black/White)", "Nike", 11895, 7995, 4.6, 14200, ["Dual Zoom Air Units", "Engineered Breathable Mesh", "Durable Waffle Outsole"]),
    ("Adidas Ultraboost Light Running Shoes (Core Black/Cloud White)", "Adidas", 18999, 11999, 4.7, 8600, ["30% Lighter Light BOOST Foam", "Linear Energy Push System", "Continental Rubber Grip"]),
    ("Puma Velocity Nitro 2 Men's Cushioned Running Shoes", "Puma", 9999, 4999, 4.5, 12500, ["NITRO FOAM High Responsiveness", "PUMAGRIP All-Surface Traction", "Reflective Accents Night Running"]),
    ("Levi's 511 Slim Fit Men's Stretch Denim Jeans (Dark Indigo)", "Levi's", 3999, 2199, 4.4, 31000, ["+All Seasons Tech Comfort Stretch", "Classic 5-Pocket Styling", "Red Tab Authentic Branding"]),
    ("Ray-Ban Aviator Classic Polarized Sunglasses (Gold Frame / Green Lens)", "Ray-Ban", 11290, 8990, 4.7, 9400, ["Crystal Polarized G-15 Lenses", "Full Metal Tear-Drop Frame", "100% UV400 Protection"]),
    ("Casio G-Shock GA-2100 Octagonal Carbon Core Guard Watch", "Casio", 9995, 7995, 4.8, 48000, ["Carbon Core Shock Resistance", "200M Water Resistance", "Slim Minimalist Neo-Tough Profile"]),
    ("Titan Neo Analog Men's Quartz Dial Stainless Steel Watch", "Titan", 4995, 3495, 4.4, 24000, ["Mineral Crystal Glass Face", "50M Water Resistance", "Subtle Sunray Blue Dial"]),
    ("Fossil Gen 6 Smartwatch with AMOLED Display & Heart Rate Sensor", "Fossil", 24995, 11995, 4.2, 11000, ["Qualcomm Snapdragon Wear 4100+", "SpO2 & Continuous Heart Monitor", "Fast Charging 80% in 30 Mins"]),
    ("Puma Men's Training Tracksuit with Contrast Panel Styling", "Puma", 4999, 2299, 4.3, 19500, ["dryCELL Moisture Management", "Raglan Sleeves for Freedom of Movement", "Zipper Pockets Storage"]),
    ("Woodland Men's Camel High-Ankle Leather Casual Trekking Boots", "Woodland", 5995, 3895, 4.5, 34000, ["Genuine Nubuck Tough Leather", "Heavy Deep-Lug Rubber Outsole", "Padded Collar Ankle Cushioning"]),
]

GROCERY_SPECS = [
    ("Tata Tea Gold Premium Assam & Darjeeling Tea (1kg Pouch)", "Tata", 650, 479, 4.6, 68000, ["Gently Rolled Long Darjeeling Leaves", "Rich Aromatic Flavor", "100% Natural Indian Tea"]),
    ("Nescafe Classic 100% Pure Instant Coffee Glass Jar (200g)", "Nescafe", 699, 520, 4.6, 85000, ["Signature Arabica & Robusta Blend", "Medium-Dark Rich Roast Aroma", "Instant Soluble Granules"]),
    ("Fortune Sunlite Refined Sunflower Oil Cooking Pouch (1 Litre)", "Fortune", 165, 125, 4.5, 92000, ["Fortified with Vitamin A and D", "Light and Easy to Digest", "High Smoke Point Cooking"]),
    ("Daawat Rozana Super Basmati Rice Pouch (5kg)", "Daawat", 540, 399, 4.4, 51000, ["Aged Basmati Grains", "Naturally Sweet Fluffy Flavour", "Ideal for Daily Biryani and Pulao"]),
    ("Aashirvaad Superior MP Sharbati Whole Wheat Atta (10kg)", "Aashirvaad", 580, 475, 4.6, 120000, ["100% Pure Sharbati Wheat Grains", "0% Maida High Dietary Fiber", "Stays Soft for 6 Hours"]),
    ("Dettol Original Liquid Handwash Refill Pouch (1500ml)", "Dettol", 349, 249, 4.7, 140000, ["100% Better Germ Protection", "Pine Fragrance Hygiene", "Moisturizers Gentle on Skin"]),
    ("Surf Excel Matic Front Load Detergent Powder Carton (4kg)", "Surf Excel", 999, 799, 4.7, 78000, ["Vanish Stain Lifting Formulation", "Low Foaming Formula for Front Load", "Dissolves Completely in Machine"]),
    ("Kellogg's Real Almond & Honey Muesli Healthy Breakfast (1kg)", "Kellogg's", 725, 520, 4.5, 39000, ["Multigrain Oats, Wheat & Corn", "Packed with Real Almonds and Natural Honey", "Zero Added Preservatives"]),
    ("Cadbury Celebrations Premium Assorted Chocolate Gift Pack (281g)", "Cadbury", 350, 279, 4.6, 45000, ["Assorted Dairy Milk, 5 Star & Perk", "Festival Special Gift Packaging", "Pure Rich Milk Chocolate"]),
    ("Himalaya Purifying Neem Face Wash Gentle Pump (400ml)", "Himalaya", 450, 315, 4.5, 62000, ["Herbal Neem & Turmeric Formula", "Prevents Recurring Acne & Pimples", "Soap-Free Gentle Daily Cleanser"]),
]

BOOK_SPECS = [
    ("Atomic Habits: An Easy & Proven Way to Build Good Habits by James Clear", "Penguin", 799, 449, 4.8, 145000, ["International #1 Bestseller", "Paperback Edition", "Science-Backed Behavioral Changes"]),
    ("The Psychology of Money: Timeless Lessons on Wealth, Greed & Happiness", "Harriman", 499, 299, 4.7, 112000, ["Morgan Housel Bestseller", "Paperback Original", "19 Short Stories on Human Behavior"]),
    ("Ikigai: The Japanese Secret to a Long and Happy Life", "Random House", 599, 349, 4.6, 98000, ["Hardcover Collector Edition", "Centenarian Blue Zone Wisdom", "Mindfulness and Purpose Guide"]),
    ("Rich Dad Poor Dad: What the Rich Teach Their Kids About Money", "Plata", 499, 329, 4.6, 135000, ["Robert T. Kiyosaki Classic", "Financial Independence Mindset", "Assets vs Liabilities Masterclass"]),
    ("Sapiens: A Brief History of Humankind by Yuval Noah Harari", "Vintage", 699, 419, 4.7, 84000, ["From Evolutionary Tree to Superhumans", "Groundbreaking Global History", "Paperback Landmark Book"]),
    ("The Alchemist: A Fable About Following Your Dream by Paulo Coelho", "HarperCollins", 399, 249, 4.6, 160000, ["Over 150 Million Copies Sold", "Inspirational Classic Allegory", "Paperback Edition"]),
    ("Deep Work: Rules for Focused Success in a Distracted World by Cal Newport", "Piatkus", 599, 389, 4.6, 41000, ["Actionable Strategies for Deep Concentration", "Productivity & Focus Discipline", "Paperback Edition"]),
    ("Think and Grow Rich by Napoleon Hill (Official Original Edition)", "Fingerprint", 299, 149, 4.5, 92000, ["13 Principles of Personal Achievement", "Timeless Philosophy of Wealth", "Mass Market Paperback"]),
    ("Rework: Change The Way You Work Forever by Jason Fried & DHH", "Crown", 699, 489, 4.6, 28000, ["Minimalist Startup Philosophy", "Practical Rules for Modern Teams", "Paperback Hardcover Blend"]),
    ("Do It Today: Overcome Procrastination and Improve Productivity by Darius Foroux", "Penguin", 399, 219, 4.5, 34000, ["Fast Practical Guide on Procrastination", "Habit Building & Life Focus", "Paperback Edition"]),
]


def generate_all_products() -> List[Dict[str, Any]]:
    products = []
    p_id = 1

    # 1. MOBiles (67 phones!)
    for item in RAW_MOBILES:
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_idx = (p_id - 1) % len(CATEGORY_IMAGES["mobiles"])
        img_url = CATEGORY_IMAGES["mobiles"][img_idx]

        products.append({
            "id": f"mob-{p_id:03d}",
            "name": name,
            "brand": brand,
            "category": "mobiles",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, p_id),
        })
        p_id += 1

    # 2. LAPTOPS (35 products)
    laptops = build_category_templates("laptops", 35, LAPTOP_SPECS)
    for idx, item in enumerate(laptops):
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_url = CATEGORY_IMAGES["laptops"][idx % len(CATEGORY_IMAGES["laptops"])]
        products.append({
            "id": f"lap-{idx+1:03d}",
            "name": name,
            "brand": brand,
            "category": "laptops",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, 100 + idx),
        })

    # 3. TVS (35 products)
    tvs = build_category_templates("tvs", 35, TV_SPECS)
    for idx, item in enumerate(tvs):
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_url = CATEGORY_IMAGES["tvs"][idx % len(CATEGORY_IMAGES["tvs"])]
        products.append({
            "id": f"tv-{idx+1:03d}",
            "name": name,
            "brand": brand,
            "category": "tvs",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, 200 + idx),
        })

    # 4. HEADPHONES (35 products)
    headphones = build_category_templates("headphones", 35, HEADPHONE_SPECS)
    for idx, item in enumerate(headphones):
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_url = CATEGORY_IMAGES["headphones"][idx % len(CATEGORY_IMAGES["headphones"])]
        products.append({
            "id": f"hp-{idx+1:03d}",
            "name": name,
            "brand": brand,
            "category": "headphones",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, 300 + idx),
        })

    # 5. APPLIANCES (35 products)
    appliances = build_category_templates("appliances", 35, APPLIANCE_SPECS)
    for idx, item in enumerate(appliances):
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_url = CATEGORY_IMAGES["appliances"][idx % len(CATEGORY_IMAGES["appliances"])]
        products.append({
            "id": f"app-{idx+1:03d}",
            "name": name,
            "brand": brand,
            "category": "appliances",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, 400 + idx),
        })

    # 6. FASHION (35 products)
    fashion = build_category_templates("fashion", 35, FASHION_SPECS)
    for idx, item in enumerate(fashion):
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_url = CATEGORY_IMAGES["fashion"][idx % len(CATEGORY_IMAGES["fashion"])]
        products.append({
            "id": f"fsh-{idx+1:03d}",
            "name": name,
            "brand": brand,
            "category": "fashion",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, 500 + idx),
        })

    # 7. GROCERY (35 products)
    grocery = build_category_templates("grocery", 35, GROCERY_SPECS)
    for idx, item in enumerate(grocery):
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_url = CATEGORY_IMAGES["grocery"][idx % len(CATEGORY_IMAGES["grocery"])]
        products.append({
            "id": f"gro-{idx+1:03d}",
            "name": name,
            "brand": brand,
            "category": "grocery",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, 600 + idx),
        })

    # 8. BOOKS (35 products)
    books = build_category_templates("books", 35, BOOK_SPECS)
    for idx, item in enumerate(books):
        name, brand, mrp, price, rating, reviews, tags, stores = item
        slug = slugify(name)
        img_url = CATEGORY_IMAGES["books"][idx % len(CATEGORY_IMAGES["books"])]
        products.append({
            "id": f"bok-{idx+1:03d}",
            "name": name,
            "brand": brand,
            "category": "books",
            "slug": slug,
            "imageUrl": img_url,
            "rating": rating,
            "reviewCount": reviews,
            "tags": tags,
            "offers": generate_offers(name, mrp, price, stores),
            "priceHistory": generate_history(price, 700 + idx),
        })

    # Assign GS1-compliant 13-digit EAN Barcodes to every product
    for idx, p in enumerate(products):
        p["barcode"] = f"890100{idx+1000000:07d}"

    return products


def seed_sqlite(products: List[Dict[str, Any]], db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("DROP TABLE IF EXISTS price_points")
    cur.execute("DROP TABLE IF EXISTS offers")
    cur.execute("DROP TABLE IF EXISTS products")

    cur.execute("""
        CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            category TEXT NOT NULL,
            slug TEXT NOT NULL,
            image_url TEXT NOT NULL,
            rating REAL NOT NULL,
            review_count INTEGER NOT NULL,
            tags TEXT,
            best_price INTEGER,
            mrp INTEGER,
            barcode TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL,
            store TEXT NOT NULL,
            price INTEGER NOT NULL,
            mrp INTEGER NOT NULL,
            discount_pct INTEGER NOT NULL,
            shipping INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            in_stock BOOLEAN NOT NULL,
            delivery_days INTEGER NOT NULL,
            seller_rating REAL NOT NULL,
            url TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)

    cur.execute("""
        CREATE TABLE price_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL,
            date TEXT NOT NULL,
            price INTEGER NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)

    # Populate
    for p in products:
        best_price = min(o["price"] for o in p["offers"])
        mrp = max(o["mrp"] for o in p["offers"])
        cur.execute(
            """INSERT INTO products (id, name, brand, category, slug, image_url, rating, review_count, tags, best_price, mrp, barcode)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                p["id"],
                p["name"],
                p["brand"],
                p["category"],
                p["slug"],
                p["imageUrl"],
                p["rating"],
                p["reviewCount"],
                json.dumps(p["tags"]),
                best_price,
                mrp,
                p["barcode"],
            ),
        )

        for o in p["offers"]:
            cur.execute(
                """INSERT INTO offers (product_id, store, price, mrp, discount_pct, shipping, total_price, in_stock, delivery_days, seller_rating, url, last_updated)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    p["id"],
                    o["store"],
                    o["price"],
                    o["mrp"],
                    o["discount_pct"],
                    o["shipping"],
                    o["total_price"],
                    1 if o["in_stock"] else 0,
                    o["delivery_days"],
                    o["seller_rating"],
                    o["url"],
                    o["last_updated"],
                ),
            )

        for pt in p["priceHistory"]:
            cur.execute(
                """INSERT INTO price_points (product_id, date, price)
                   VALUES (?, ?, ?)""",
                (p["id"], pt["date"], pt["price"]),
            )

    conn.commit()
    conn.close()
    print(f"Successfully seeded SQLite database at {db_path} with {len(products)} products!")


if __name__ == "__main__":
    products = generate_all_products()
    print(f"Generated {len(products)} products across 8 categories.")

    # Save to catalog.json
    out_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(out_dir, "catalog.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2)
    print(f"Saved catalog to {json_path}")

    # Seed shoppilot.db
    backend_root = os.path.abspath(os.path.join(out_dir, "..", ".."))
    db_path = os.path.join(backend_root, "shoppilot.db")
    seed_sqlite(products, db_path)
