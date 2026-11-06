"""
Safety Guardrails for ShopPilot Autonomous Browser Agent.
Prevents unintended purchases, credit card entry, and real payment authorizations.
"""

import re
from pydantic import BaseModel
from typing import Optional, Tuple
from app.config import settings

class SafetyEvaluation(BaseModel):
    is_safe: bool
    risk_level: str  # "SAFE", "WARNING", "BLOCKED"
    reason: Optional[str] = None
    intercepted_action: Optional[str] = None

class SafetyGuardrail:
    def __init__(self):
        self.block_keywords = [kw.lower() for kw in settings.SAFETY_BLOCK_KEYWORDS]
        self.sensitive_field_patterns = [
            r"card", r"cvv", r"cvc", r"security.?code", r"expir", r"credit", r"payment", r"password"
        ]

    def evaluate_action(self, action_type: str, selector: str, text_payload: str = "", element_text: str = "") -> SafetyEvaluation:
        """
        Evaluate if an upcoming browser action is safe or must be intercepted.
        """
        if not settings.ENABLE_PURCHASE_PREVENTION:
            return SafetyEvaluation(is_safe=True, risk_level="SAFE")

        combined_text = f"{action_type} {selector} {text_payload} {element_text}".lower()

        # Check for direct payment submission phrases
        for kw in self.block_keywords:
            if kw in combined_text:
                return SafetyEvaluation(
                    is_safe=False,
                    risk_level="BLOCKED",
                    reason=f"Safety Guardrail Triggered: Prevented final payment trigger containing '{kw}'. Simulation halted before financial charge.",
                    intercepted_action=f"{action_type}({selector})"
                )

        # Check for typing into sensitive payment / card inputs
        if action_type.lower() in ["type", "fill", "press"]:
            for pattern in self.sensitive_field_patterns:
                if re.search(pattern, selector.lower()):
                    return SafetyEvaluation(
                        is_safe=False,
                        risk_level="BLOCKED",
                        reason=f"Safety Guardrail Triggered: Direct entry into sensitive payment field '{selector}' blocked.",
                        intercepted_action=f"{action_type}({selector})"
                    )

        # Warnings for checkout buttons (allowed to click to reach review screen, but flagged)
        if "checkout" in combined_text or "proceed to checkout" in combined_text:
            return SafetyEvaluation(
                is_safe=True,
                risk_level="WARNING",
                reason="Proceeding to checkout review screen under simulated sandbox monitoring.",
                intercepted_action=None
            )

        return SafetyEvaluation(is_safe=True, risk_level="SAFE", reason="Action verified safe.")

safety_guardrail = SafetyGuardrail()
