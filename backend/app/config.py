import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "ShopPilot Backend"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # AI / Vision LLM
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    VISION_MODEL_NAME: str = os.getenv("VISION_MODEL_NAME", "gemini-3.1-flash-lite")
    
    # Browser Automation
    HEADLESS: bool = True
    BROWSER_TIMEOUT_MS: int = 30000
    ACTION_DELAY_MS: int = 800
    MAX_STEPS: int = 15
    VIEWPORT_WIDTH: int = 1280
    VIEWPORT_HEIGHT: int = 800
    
    # Safety Guardrails
    ENABLE_PURCHASE_PREVENTION: bool = True
    SAFETY_BLOCK_KEYWORDS: list[str] = [
        "place your order",
        "complete purchase",
        "buy now with 1-click",
        "submit order",
        "confirm payment",
        "pay with",
        "credit card number",
        "cvv",
        "security code"
    ]
    
    # Notification & Webhook
    WEBHOOK_URL: Optional[str] = os.getenv("WEBHOOK_URL", "http://localhost:8000/api/webhook/mock")
    
    # Task Queue / Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_CELERY: bool = os.getenv("USE_CELERY", "false").lower() == "true"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
