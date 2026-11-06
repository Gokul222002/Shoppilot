import pytest
from app.agent.safety import SafetyGuardrail

def test_safety_guardrail_blocks_payment_submission():
    guard = SafetyGuardrail()

    # Test "place your order"
    eval_result = guard.evaluate_action(
        action_type="click",
        selector="#place-order-btn",
        element_text="Place your order"
    )
    assert not eval_result.is_safe
    assert eval_result.risk_level == "BLOCKED"
    assert "Prevented final payment trigger" in eval_result.reason

def test_safety_guardrail_blocks_credit_card_input():
    guard = SafetyGuardrail()

    eval_result = guard.evaluate_action(
        action_type="type",
        selector="input[name='card_number']",
        text_payload="4111222233334444"
    )
    assert not eval_result.is_safe
    assert eval_result.risk_level == "BLOCKED"
    assert "sensitive payment field" in eval_result.reason

def test_safety_guardrail_permits_safe_search_and_cart():
    guard = SafetyGuardrail()

    eval_result = guard.evaluate_action(
        action_type="click",
        selector="#add-to-cart-101",
        element_text="Add to Cart"
    )
    assert eval_result.is_safe
    assert eval_result.risk_level == "SAFE"

def test_safety_guardrail_flags_checkout_warning():
    guard = SafetyGuardrail()

    eval_result = guard.evaluate_action(
        action_type="click",
        selector="#btn-checkout",
        element_text="Proceed to Checkout"
    )
    assert eval_result.is_safe
    assert eval_result.risk_level == "WARNING"
