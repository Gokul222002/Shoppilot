"""
Generates 100 labeled product pairs (50 Positives, 50 Negatives) for matcher benchmark.
"""

import json

positives = [
    ("Realme 12 Pro+ 5G (Submarine Blue, 256GB)", "REALME 12 Pro Plus 5G (Submarine Blue, 256 GB)", "Same phone, different casing/spacing"),
    ("Realme 12 Pro+ 5G (Navigator Beige, 128GB)", "Realme 12 Pro Plus 5G Beige 128 GB ROM", "Same phone, abbreviation"),
    ("Realme 12 Pro 5G (Submarine Blue, 128GB)", "Realme 12 Pro 5G (128GB Storage, Submarine Blue)", "Rearranged title tokens"),
    ("Realme Narzo 70 Pro 5G (Glass Green, 256GB)", "realme Narzo 70 Pro 5G 256GB Glass Green", "Lowercase store title"),
    ("Realme Narzo 60x 5G (Stellar Green, 128GB)", "Realme Narzo 60X 5G Stellar Green 128 GB", "Case difference"),
    ("Realme GT 6T 5G (Fluid Silver, 256GB)", "Realme GT 6T 5G 256GB Fluid Silver Smartphone", "Added smartphone suffix"),
    ("Realme P1 Pro 5G (Phoenix Red, 128GB)", "Realme P1 Pro 5G (128 GB, Phoenix Red)", "Punctuation variance"),
    ("Apple iPhone 15 (128 GB) - Black", "Apple iPhone 15 128GB Black Smartphone", "Retailer listing variance"),
    ("Apple iPhone 15 (256 GB) - Blue", "Apple iPhone 15 Blue 256GB", "Standard retailer title"),
    ("Apple iPhone 15 Plus (128 GB) - Pink", "Apple iPhone 15 Plus Pink 128GB", "Same variant"),
    ("Apple iPhone 15 Pro (256 GB) - Natural Titanium", "Apple iPhone 15 Pro 256GB Natural Titanium", "Same variant"),
    ("Apple iPhone 15 Pro Max (256 GB) - Blue Titanium", "Apple iPhone 15 Pro Max 256GB Blue Titanium", "Same variant"),
    ("Samsung Galaxy S24 Ultra 5G (Titanium Gray, 512GB)", "Samsung Galaxy S24 Ultra 512GB Titanium Gray", "Same variant"),
    ("Samsung Galaxy S24 Ultra 5G (Titanium Black, 256GB)", "Samsung Galaxy S24 Ultra 256GB Titanium Black", "Same variant"),
    ("Samsung Galaxy S24 5G (Onyx Black, 128GB)", "Samsung Galaxy S24 128GB Onyx Black", "Same phone"),
    ("Samsung Galaxy S24+ 5G (Cobalt Violet, 256GB)", "Samsung Galaxy S24 Plus 256GB Cobalt Violet", "Plus vs + notation"),
    ("Samsung Galaxy A55 5G (Awesome Navy, 128GB)", "Samsung Galaxy A55 128GB Awesome Navy", "Same phone"),
    ("Samsung Galaxy M34 5G (Prism Silver, 128GB)", "Samsung Galaxy M34 5G 128GB Prism Silver", "Same phone"),
    ("OnePlus 12 5G (Silky Black, 256GB)", "OnePlus 12 Silky Black 256GB Smartphone", "Same flagship"),
    ("OnePlus 12 5G (Flowy Emerald, 512GB)", "OnePlus 12 512GB Flowy Emerald", "Same flagship"),
    ("OnePlus 12R 5G (Cool Blue, 128GB)", "OnePlus 12R 128GB Cool Blue", "Same phone"),
    ("OnePlus Nord CE 4 5G (Dark Chrome, 128GB)", "OnePlus Nord CE4 128GB Dark Chrome", "CE 4 vs CE4"),
    ("OnePlus Open (Emerald Dusk, 512GB)", "OnePlus Open 512GB Emerald Dusk Foldable", "Same phone"),
    ("Xiaomi 14 (Black, 512GB)", "Xiaomi 14 512GB Black Leica Optics", "Promo tag addition"),
    ("Redmi Note 13 Pro+ 5G (Fusion Black, 256GB)", "Redmi Note 13 Pro Plus 5G 256GB Fusion Black", "Plus vs +"),
    ("Redmi Note 13 Pro 5G (Midnight Black, 128GB)", "Redmi Note 13 Pro 128GB Midnight Black", "Same model"),
    ("Redmi 13C 5G (Starlight Black, 128GB)", "Redmi 13C 5G 128GB Starlight Black", "Same model"),
    ("Vivo V30 Pro 5G (Andaman Blue, 512GB)", "Vivo V30 Pro 512GB Andaman Blue", "Same model"),
    ("Vivo T3 5G (Cosmic Blue, 128GB)", "Vivo T3 5G 128GB Cosmic Blue", "Same model"),
    ("Oppo Reno 11 Pro 5G (Pearl White, 256GB)", "Oppo Reno 11 Pro 256GB Pearl White", "Same model"),
    ("Motorola Edge 50 Pro 5G (Black Beauty, 256GB)", "Motorola Edge 50 Pro 256GB Black Beauty", "Same model"),
    ("Moto G84 5G (Marshmallow Blue, 256GB)", "Motorola Moto G84 5G 256GB Marshmallow Blue", "Moto vs Motorola"),
    ("Poco X6 Pro 5G (Spectre Black, 256GB)", "Poco X6 Pro 256GB Spectre Black", "Same model"),
    ("Poco F6 5G (Titanium, 256GB)", "Poco F6 5G 256GB Titanium", "Same model"),
    ("iQOO 12 5G (Legend White, 256GB)", "iQOO 12 256GB Legend White", "Same model"),
    ("iQOO Neo 9 Pro 5G (Fiery Red, 256GB)", "iQOO Neo 9 Pro 256GB Fiery Red", "Same model"),
    ("Apple MacBook Air M2 Chip (13.6-inch 8GB 256GB)", "Apple MacBook Air M2 13.6-inch 8GB/256GB", "Same laptop"),
    ("Apple MacBook Air M3 Chip (15.3-inch 16GB 512GB)", "Apple MacBook Air 15.3 M3 16GB 512GB", "Same laptop"),
    ("Dell XPS 13 9315 Laptop (Intel i7 16GB 512GB)", "Dell XPS 13 9315 i7-1250U 16GB 512GB SSD", "Processor tag variance"),
    ("HP Pavilion 15 Laptop (AMD Ryzen 5 16GB 512GB)", "HP Pavilion 15 Ryzen 5 16GB 512GB", "Same laptop"),
    ("Lenovo IdeaPad Slim 3 (Intel Core i5 16GB 512GB)", "Lenovo IdeaPad Slim 3 i5 16GB 512GB", "Same laptop"),
    ("Sony Bravia 55 inch 4K Ultra HD Smart Google TV", "Sony Bravia 55 inch 4K Smart TV", "Same television"),
    ("LG 55 inch 4K Ultra HD Smart OLED TV", "LG 55 inch OLED 4K Smart TV", "Same television"),
    ("Samsung 65 inch Crystal 4K Vivid Pro Smart TV", "Samsung 65 inch Crystal 4K Smart TV", "Same television"),
    ("Sony WH-1000XM5 Wireless Noise Cancelling Headphones", "Sony WH-1000XM5 ANC Wireless Headphones", "Noise cancelling vs ANC"),
    ("Apple AirPods Pro (2nd Generation) with MagSafe Case", "Apple AirPods Pro 2nd Gen USB-C MagSafe", "Generation wording"),
    ("boAt Airdopes 141 Bluetooth TWS Earbuds", "boAt Airdopes 141 Truly Wireless Earbuds", "TWS vs Truly Wireless"),
    ("Atomberg Renesa 1200mm BLDC Ceiling Fan with Remote", "Atomberg Renesa BLDC Motor 1200mm Ceiling Fan", "Spec phrasing"),
    ("Borosil Glass Mixing Bowl Set of 3", "Borosil Mixing Bowl Set of 3 Glass", "Word order"),
    ("Atomic Habits by James Clear Paperback", "Atomic Habits - James Clear (Paperback)", "Book title punctuation")
]

negatives = [
    ("Realme 12 Pro 5G (128GB)", "Realme 12 Pro 5G (256GB)", "Storage mismatch (128GB vs 256GB)"),
    ("Realme 12 Pro 5G (Submarine Blue 128GB)", "Realme 12 Pro+ 5G (Submarine Blue 128GB)", "Sub-model difference (12 Pro vs 12 Pro+)"),
    ("Realme 12 Pro+ 5G (128GB)", "Realme 12 Pro+ 5G (256GB)", "Storage mismatch (128GB vs 256GB)"),
    ("Realme Narzo 60 5G (128GB)", "Realme Narzo 60x 5G (128GB)", "Model difference (Narzo 60 vs 60x)"),
    ("Realme GT Neo 3 (256GB)", "Realme GT 6T (256GB)", "Different generation (GT Neo 3 vs GT 6T)"),
    ("Realme C53 (64GB)", "Realme C55 (64GB)", "Different model (C53 vs C55)"),
    ("Realme P1 5G (128GB)", "Realme P1 Pro 5G (128GB)", "Base vs Pro (P1 vs P1 Pro)"),
    ("Apple iPhone 15 (128 GB) - Black", "Apple iPhone 14 (128 GB) - Black", "Generation mismatch (iPhone 15 vs 14)"),
    ("Apple iPhone 15 (128 GB) - Black", "Apple iPhone 15 (256 GB) - Black", "Storage mismatch (128GB vs 256GB)"),
    ("Apple iPhone 15 (128 GB) - Black", "Apple iPhone 15 Plus (128 GB) - Black", "Model mismatch (iPhone 15 vs 15 Plus)"),
    ("Apple iPhone 15 Pro (128 GB)", "Apple iPhone 15 Pro Max (256 GB)", "Pro vs Pro Max"),
    ("Samsung Galaxy S24 5G (128GB)", "Samsung Galaxy S23 5G (128GB)", "Generation mismatch (S24 vs S23)"),
    ("Samsung Galaxy S24 5G (128GB)", "Samsung Galaxy S24 Ultra 5G (256GB)", "Base vs Ultra model"),
    ("Samsung Galaxy S24 Ultra 5G (256GB)", "Samsung Galaxy S24 Ultra 5G (512GB)", "Storage mismatch (256GB vs 512GB)"),
    ("Samsung Galaxy A55 5G (128GB)", "Samsung Galaxy A35 5G (128GB)", "Series difference (A55 vs A35)"),
    ("Samsung Galaxy M34 5G (128GB)", "Samsung Galaxy M14 5G (128GB)", "Series difference (M34 vs M14)"),
    ("OnePlus 12 5G (256GB)", "OnePlus 11 5G (256GB)", "Generation mismatch (OnePlus 12 vs 11)"),
    ("OnePlus 12 5G (256GB)", "OnePlus 12R 5G (256GB)", "Flagship vs R variant"),
    ("OnePlus 12 5G (256GB)", "OnePlus 12 5G (512GB)", "Storage mismatch (256GB vs 512GB)"),
    ("OnePlus Nord CE 4 (128GB)", "OnePlus Nord CE 3 (128GB)", "Generation mismatch (CE 4 vs CE 3)"),
    ("Xiaomi 14 (512GB)", "Xiaomi 13 Pro (256GB)", "Generation mismatch (Xiaomi 14 vs 13)"),
    ("Redmi Note 13 Pro (128GB)", "Redmi Note 13 Pro+ (256GB)", "Base Pro vs Pro+ and storage"),
    ("Redmi Note 13 5G (128GB)", "Redmi 13C 5G (128GB)", "Series difference (Note vs C)"),
    ("Vivo V30 Pro 5G (256GB)", "Vivo V29 Pro 5G (256GB)", "Generation mismatch (V30 vs V29)"),
    ("Vivo T3 5G (128GB)", "Vivo T2 5G (128GB)", "Generation mismatch (T3 vs T2)"),
    ("Oppo Reno 11 Pro (256GB)", "Oppo Reno 10 Pro (256GB)", "Generation mismatch (Reno 11 vs 10)"),
    ("Motorola Edge 50 Pro (256GB)", "Motorola Edge 40 Neo (128GB)", "Model difference (Edge 50 Pro vs 40 Neo)"),
    ("Moto G84 5G (256GB)", "Moto G54 5G (128GB)", "Model difference (G84 vs G54)"),
    ("Poco X6 Pro 5G (256GB)", "Poco X6 5G (128GB)", "Pro vs Non-Pro"),
    ("Poco F6 5G (256GB)", "Poco F5 5G (256GB)", "Generation mismatch (F6 vs F5)"),
    ("iQOO 12 5G (256GB)", "iQOO 11 5G (256GB)", "Generation mismatch (12 vs 11)"),
    ("iQOO Neo 9 Pro (256GB)", "iQOO Neo 7 Pro (128GB)", "Generation mismatch (Neo 9 vs 7)"),
    ("Apple MacBook Air M2 (13.6-inch)", "Apple MacBook Air M3 (13.6-inch)", "Processor mismatch (M2 vs M3)"),
    ("Apple MacBook Air M2 (13.6-inch 256GB)", "Apple MacBook Air M2 (13.6-inch 512GB)", "Storage mismatch (256GB vs 512GB)"),
    ("Apple MacBook Air M2 (13.6-inch)", "Apple MacBook Pro M2 (14.2-inch)", "Air vs Pro laptop"),
    ("Dell XPS 13 9315 (16GB 512GB)", "Dell Inspiron 15 3520 (8GB 512GB)", "Series difference (XPS vs Inspiron)"),
    ("HP Pavilion 15 (16GB 512GB)", "HP Envy x360 (16GB 512GB)", "Series difference (Pavilion vs Envy)"),
    ("Lenovo IdeaPad Slim 3 (512GB)", "Lenovo Legion Pro 5 (1TB)", "Product line difference (IdeaPad vs Legion)"),
    ("Sony Bravia 55 inch 4K TV", "Sony Bravia 65 inch 4K TV", "Size mismatch (55 inch vs 65 inch)"),
    ("LG 55 inch OLED 4K Smart TV", "LG 55 inch QNED 4K Smart TV", "Display technology (OLED vs QNED)"),
    ("Samsung 55 inch Crystal 4K TV", "Samsung 65 inch Crystal 4K TV", "Size mismatch (55 inch vs 65 inch)"),
    ("Sony WH-1000XM5 Wireless Headphones", "Sony WH-1000XM4 Wireless Headphones", "Generation mismatch (XM5 vs XM4)"),
    ("Apple AirPods Pro (2nd Gen)", "Apple AirPods (3rd Gen)", "Pro vs Standard AirPods"),
    ("boAt Airdopes 141 TWS Earbuds", "boAt Airdopes 131 TWS Earbuds", "Model difference (141 vs 131)"),
    ("Atomberg Renesa 1200mm Ceiling Fan", "Atomberg Renesa 900mm Ceiling Fan", "Size mismatch (1200mm vs 900mm)"),
    ("Apple iPhone 15 128GB Black", "Samsung Galaxy S24 128GB Black", "Brand mismatch (Apple vs Samsung)"),
    ("Realme 12 Pro 5G 128GB", "Redmi Note 13 Pro 128GB", "Brand mismatch (Realme vs Redmi)"),
    ("Dell XPS 13 16GB 512GB", "HP Pavilion 15 16GB 512GB", "Brand mismatch (Dell vs HP)"),
    ("Sony Bravia 55 inch 4K TV", "Samsung 55 inch Crystal 4K TV", "Brand mismatch (Sony vs Samsung)"),
    ("Sony WH-1000XM5 Headphones", "Bose QuietComfort 45 Headphones", "Brand mismatch (Sony vs Bose)")
]

dataset = []
for idx, (t1, t2, desc) in enumerate(positives, 1):
    dataset.append({
        "id": f"pair-pos-{idx:03d}",
        "title_a": t1,
        "title_b": t2,
        "label": 1,
        "type": "POSITIVE",
        "description": desc,
    })

for idx, (t1, t2, desc) in enumerate(negatives, 1):
    dataset.append({
        "id": f"pair-neg-{idx:03d}",
        "title_a": t1,
        "title_b": t2,
        "label": 0,
        "type": "NEGATIVE",
        "description": desc,
    })

with open("backend/tests/data/matcher_test_pairs.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2)

print(f"Generated {len(dataset)} labeled pairs ({len(positives)} Positives, {len(negatives)} Negatives).")
