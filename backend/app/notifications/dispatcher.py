"""
Notification & Webhook Dispatcher for Deal Alerts and Cart Simulations.
"""

import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger("ShopPilot.Notifications")

class AlertPayload(BaseModel):
    id: str
    event_type: str  # "DEAL_FOUND", "ADDED_TO_CART", "SAFETY_HALT", "JOB_COMPLETED"
    title: str
    message: str
    data: Dict[str, Any]
    timestamp: str

class NotificationDispatcher:
    def __init__(self):
        self.notification_history: List[AlertPayload] = []

    async def broadcast_alert(
        self,
        event_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        ws_callback: Optional[Any] = None
    ) -> AlertPayload:
        payload = AlertPayload(
            id=f"notif_{int(datetime.utcnow().timestamp() * 1000)}",
            event_type=event_type,
            title=title,
            message=message,
            data=data or {},
            timestamp=datetime.utcnow().isoformat()
        )
        self.notification_history.append(payload)

        # 1. Send via WebSocket if callback is provided
        if ws_callback:
            try:
                await ws_callback({
                    "type": "NOTIFICATION",
                    "payload": payload.model_dump()
                })
            except Exception as e:
                logger.warning(f"Error emitting notification via WebSocket: {e}")

        # 2. Trigger External Webhook if configured
        if settings.WEBHOOK_URL:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    await client.post(
                        settings.WEBHOOK_URL,
                        json=payload.model_dump(),
                        headers={"Content-Type": "application/json", "X-ShopPilot-Agent": "1.0"}
                    )
                    logger.info(f"Webhook alert dispatched successfully to {settings.WEBHOOK_URL}")
            except Exception as e:
                logger.debug(f"Webhook delivery skipped or offline: {e}")

        return payload

dispatcher = NotificationDispatcher()
