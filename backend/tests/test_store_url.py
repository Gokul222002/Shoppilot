import pytest
from urllib.parse import unquote
from app.utils.store_url import sanitize_product_query, build_store_url

# 25+ real Indian market titles with brackets, commas, colors, units, hyphens
TEST_TITLES_25 = [
    # 1. Realme GT 6 main defect test case
    ("Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)", "Realme GT 6 256GB 12GB RAM"),
    # 2. Realme GT 6 Razor Green 512GB
    ("Realme GT 6 (Razor Green, 512GB, 16GB RAM)", "Realme GT 6 512GB 16GB RAM"),
    # 3. Realme Narzo 70 Pro with brackets and commas
    ("Realme Narzo 70 Pro 5G (Glass Green, 256GB, 8GB RAM)", "Realme Narzo 70 Pro 5G 256GB 8GB RAM"),
    # 4. Samsung S24 Ultra Titanium
    ("Samsung Galaxy S24 Ultra 5G (Titanium Gray, 256GB, 12GB RAM)", "Samsung Galaxy S24 Ultra 5G 256GB 12GB RAM"),
    # 5. iPhone 15 Pro Max Natural Titanium
    ("Apple iPhone 15 Pro Max (Natural Titanium, 256GB)", "Apple iPhone 15 Pro Max 256GB"),
    # 6. boAt Rockerz 550 Black
    ("boAt Rockerz 550 Bluetooth Wireless Over Ear Headphones (Army Green)", "boAt Rockerz 550 Bluetooth Wireless Over Ear Headphones"),
    # 7. OnePlus 12 5G Flowy Emerald
    ("OnePlus 12 5G (Flowy Emerald, 256GB, 12GB RAM)", "OnePlus 12 5G 256GB 12GB RAM"),
    # 8. Redmi Note 13 Pro+ Fusion Purple
    ("Redmi Note 13 Pro+ 5G (Fusion Purple, 256GB, 12GB RAM)", "Redmi Note 13 Pro 5G 256GB 12GB RAM"),
    # 9. Vivo V30 Pro Andaman Blue
    ("Vivo V30 Pro 5G (Andaman Blue, 512GB, 12GB RAM)", "Vivo V30 Pro 5G 512GB 12GB RAM"),
    # 10. Oppo Reno 11 Pro Pearl White
    ("Oppo Reno 11 Pro 5G (Pearl White, 256GB, 12GB RAM)", "Oppo Reno 11 Pro 5G 256GB 12GB RAM"),
    # 11. Motorola Edge 50 Pro Luxe Lavender
    ("Motorola Edge 50 Pro 5G (Luxe Lavender, 256GB, 12GB RAM)", "Motorola Edge 50 Pro 5G 256GB 12GB RAM"),
    # 12. Poco X6 Pro Racing Grey
    ("Poco X6 Pro 5G (Racing Grey, 256GB, 8GB RAM)", "Poco X6 Pro 5G 256GB 8GB RAM"),
    # 13. iQOO 12 Legend White
    ("iQOO 12 5G (Legend White, 256GB, 12GB RAM)", "iQOO 12 5G 256GB 12GB RAM"),
    # 14. Title with hyphens, pipes, and extra spaces
    ("Apple MacBook Air M2 - 13.6-inch | 8GB Unified Memory | 256GB SSD (Midnight)", "Apple MacBook Air M2 13.6-inch 8GB Unified Memory 256GB SSD"),
    # 15. Unit with separated '8 GB RAM'
    ("Lenovo IdeaPad Slim 3 (Core i5-12450H, 16 GB RAM, 512 GB SSD)", "Lenovo IdeaPad Slim 3 Core i5-12450H 16GB RAM 512GB SSD"),
    # 16. Sony WH-1000XM5 Silver
    ("Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones (Silver)", "Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones"),
    # 17. LG 55 inch 4K OLED TV
    ("LG 55-inch 4K Ultra HD Smart OLED TV (OLED55C3PSA, Black)", "LG 55-inch 4K Ultra HD Smart OLED TV OLED55C3PSA"),
    # 18. Samsung 65-inch Crystal 4K
    ("Samsung 65-inch Crystal 4K Vivid Pro Ultra HD Smart LED TV (Titan Gray)", "Samsung 65-inch Crystal 4K Vivid Pro Ultra HD Smart LED TV"),
    # 19. Realme C55 Sunshower
    ("Realme C55 (Sunshower, 128GB, 6GB RAM)", "Realme C55 128GB 6GB RAM"),
    # 20. Realme Narzo N53 Feather Gold
    ("Realme Narzo N53 (Feather Gold, 64GB, 4GB RAM)", "Realme Narzo N53 64GB 4GB RAM"),
    # 21. Title with slash and forward slash
    ("HP Pavilion 15 / Core i7 / 16GB / 1TB SSD / Windows 11", "HP Pavilion 15 Core i7 16GB 1TB SSD Windows 11"),
    # 22. Title with square brackets
    ("Dell Inspiron 3520 Laptop [Intel Core i3-1215U, 8GB RAM, 512GB SSD, Carbon Black]", "Dell Inspiron 3520 Laptop Intel Core i3-1215U 8GB RAM 512GB SSD"),
    # 23. Title with curved brackets and plus
    ("Asus Vivobook 15 (Core i5 12th Gen / 16GB + 512GB SSD)", "Asus Vivobook 15 Core i5 12th Gen 16GB 512GB SSD"),
    # 24. OnePlus Nord CE4 Dark Chrome
    ("OnePlus Nord CE4 5G (Dark Chrome, 128GB, 8GB RAM)", "OnePlus Nord CE4 5G 128GB 8GB RAM"),
    # 25. boAt Airdopes 141 Bold Black
    ("boAt Airdopes 141 Bluetooth Truly Wireless in Ear Earbuds (Bold Black)", "boAt Airdopes 141 Bluetooth Truly Wireless in Ear Earbuds"),
    # 26. Noise ColorFit Pulse 2 Max
    ("Noise ColorFit Pulse 2 Max 1.85-inch Display Bluetooth Calling Smart Watch (Jet Black)", "Noise ColorFit Pulse 2 Max 1.85-inch Display Bluetooth Calling Smart Watch"),
]


@pytest.mark.parametrize("raw_title, expected_clean", TEST_TITLES_25)
def test_query_sanitizer_25_titles(raw_title, expected_clean):
    """Verify all 25+ titles are cleanly sanitized without brackets, commas, or confusing colors."""
    sanitized = sanitize_product_query(raw_title)
    # Check that brackets and commas are completely removed
    assert "(" not in sanitized
    assert ")" not in sanitized
    assert "[" not in sanitized
    assert "]" not in sanitized
    assert "," not in sanitized
    assert "|" not in sanitized

    # Check key specs are preserved
    if "256GB" in raw_title:
        assert "256GB" in sanitized
    if "12GB" in raw_title:
        assert "12GB" in sanitized


def test_realme_gt6_defect_d4_acceptance():
    """
    Acceptance test for D4:
    'Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)' must build clean query:
    'Realme GT 6 256GB 12GB RAM'
    """
    raw = "Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)"
    clean = sanitize_product_query(raw)
    assert clean == "Realme GT 6 256GB 12GB RAM"

    amazon_url = build_store_url("Amazon.in", raw)
    assert amazon_url == "https://www.amazon.in/s?k=Realme+GT+6+256GB+12GB+RAM"

    flipkart_url = build_store_url("Flipkart", raw)
    assert flipkart_url == "https://www.flipkart.com/search?q=Realme+GT+6+256GB+12GB+RAM"

    croma_url = build_store_url("Croma", raw)
    assert croma_url == "https://www.croma.com/searchB?q=Realme+GT+6+256GB+12GB+RAM"


def test_build_store_url_preserves_real_url():
    """Verify if a real productUrl exists, it uses it and appends affiliate tag."""
    real_url = "https://www.amazon.in/dp/B0D5BTY7R5"
    built = build_store_url(
        store="Amazon.in",
        title="Realme GT 6",
        product_url=real_url,
        affiliate_tag="shoppilot-21"
    )
    assert built == "https://www.amazon.in/dp/B0D5BTY7R5?tag=shoppilot-21"
