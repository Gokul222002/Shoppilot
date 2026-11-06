import pytest
from app.agent.vision_llm import vision_llm

@pytest.mark.asyncio
async def test_heuristic_dismisses_popup():
    simplified_dom = """
    <div id="flash-promo-modal">
        <button id="btn-dismiss-popup">Dismiss</button>
    </div>
    """
    action = await vision_llm.analyze_and_plan(
        objective="Find 4k monitor under $300",
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
        objective="Find 4k monitor under $300",
        current_url="http://127.0.0.1:8000/mock-store",
        screenshot_base64="",
        simplified_dom=simplified_dom,
        step_number=2,
        history=[{"action": "click", "selector": "#btn-dismiss-popup"}]
    )
    assert action.action == "type"
    assert "search" in action.selector.lower()
    assert "Monitor" in action.value

@pytest.mark.asyncio
async def test_heuristic_finds_deal_under_budget():
    simplified_dom = """
    <div data-price="279.99" data-title="UltraView 27 4K Monitor">
        <button id="add-to-cart-101" class="btn-add-to-cart">Add to Cart</button>
    </div>
    """
    action = await vision_llm.analyze_and_plan(
        objective="Find 4k monitor under $300",
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
    assert action.deal_found.price <= 300.0
