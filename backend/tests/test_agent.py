import pytest
from app.agent.vision_llm import vision_llm, extract_product_keyword, extract_max_budget

def test_extract_product_keyword_watch():
    assert "Watch" in extract_product_keyword("find a watch under 5000")
    assert "Smartwatch" in extract_product_keyword("buy noise smartwatch under 3000 and add to cart")
    assert "Running Shoes" in extract_product_keyword("find running shoes under 7000 with discount")

def test_extract_max_budget():
    assert extract_max_budget("find a watch under 5000") == 5000.0
    assert extract_max_budget("4k monitor under 25000") == 25000.0
    assert extract_max_budget("shoes under 2.5k") == 2500.0

@pytest.mark.asyncio
async def test_heuristic_dismisses_popup():
    simplified_dom = """
    <div id="flash-promo-modal">
        <button id="btn-dismiss-popup">Dismiss</button>
    </div>
    """
    action = await vision_llm.analyze_and_plan(
        objective="Find 4k monitor under ₹25,000",
        current_url="http://127.0.0.1:8000/mock-store",
        screenshot_base64="",
        simplified_dom=simplified_dom,
        step_number=1,
        history=[]
    )
    assert action.action == "click"
    assert "dismiss" in action.selector.lower()
    assert "promo-popup-modal" in action.detected_elements

@pytest.mark.asyncio
async def test_heuristic_identifies_search():
    simplified_dom = """
    <input id="search-input" placeholder="Search products..." />
    <button id="btn-search">Search</button>
    """
    action = await vision_llm.analyze_and_plan(
        objective="find a watch under 5000",
        current_url="http://127.0.0.1:8000/mock-store",
        screenshot_base64="",
        simplified_dom=simplified_dom,
        step_number=2,
        history=[{"action": "click", "selector": "#btn-dismiss-popup"}]
    )
    assert action.action == "type"
    assert "search" in action.selector.lower()
    assert "Watch" in action.value

@pytest.mark.asyncio
async def test_heuristic_finds_watch_deal_under_budget():
    simplified_dom = """
    <div data-id="201" data-price="2499.00" data-title="Noise ColorFit Ultra 3 Smartwatch" data-store="Amazon.in" data-url="https://www.amazon.in/dp/example">
        <button id="add-to-cart-201" class="btn-add-to-cart">Add to Cart</button>
    </div>
    """
    action = await vision_llm.analyze_and_plan(
        objective="find a watch under 5000",
        current_url="http://127.0.0.1:8000/mock-store",
        screenshot_base64="",
        simplified_dom=simplified_dom,
        step_number=3,
        history=[
            {"action": "type", "selector": "#search-input"},
            {"action": "click", "selector": "#btn-search"}
        ]
    )
    assert action.action == "click"
    assert "add-to-cart" in action.selector
    assert action.deal_found is not None
    assert "watch" in action.deal_found.title.lower()
    assert action.deal_found.price <= 5000.0
    assert action.deal_found.store == "Amazon.in"
    assert "amazon.in" in action.deal_found.url
