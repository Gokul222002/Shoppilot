"""
ShopPilot: Autonomous Multimodal Browser Agent Backend
FastAPI Server with WebSockets, REST Endpoints, and Real-Time Stream Emitter.
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.mock_store.router import router as mock_store_router
from app.worker.queue import job_manager
from app.notifications.dispatcher import dispatcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ShopPilot.Main")

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.debug(f"Failed to send to client: {e}")
                self.disconnect(connection)

ws_manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ShopPilot Backend Server...")
    yield
    logger.info("Shutting down ShopPilot Backend Server...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous Multimodal Browser Agent for Automated Deal Hunting and Checkout Simulations",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Mock E-Commerce Store Router
app.include_router(mock_store_router)

# Request / Response Schemas
class CreateJobRequest(BaseModel):
    objective: str
    start_url: Optional[str] = None

class WebhookTestPayload(BaseModel):
    id: Optional[str] = None
    event_type: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# In-memory webhook log for UI inspection
received_webhooks: List[Dict[str, Any]] = []

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "vision_model": settings.VISION_MODEL_NAME,
        "gemini_active": bool(settings.GEMINI_API_KEY),
        "safety_guardrails": settings.ENABLE_PURCHASE_PREVENTION
    }

@app.post("/api/jobs")
async def create_job(payload: CreateJobRequest, background_tasks: BackgroundTasks):
    """
    Launch an autonomous browser deal hunting mission.
    """
    if not payload.objective.strip():
        raise HTTPException(status_code=400, detail="Objective cannot be empty.")

    start_url = payload.start_url or f"http://127.0.0.1:{settings.PORT}/mock-store"
    job_id = job_manager.create_job(objective=payload.objective, start_url=start_url)

    # Launch asynchronously
    background_tasks.add_task(
        job_manager.execute_job_async,
        job_id=job_id,
        ws_callback=ws_manager.broadcast
    )

    return {
        "job_id": job_id,
        "status": "QUEUED",
        "objective": payload.objective,
        "start_url": start_url
    }

@app.get("/api/jobs")
async def list_jobs():
    return {"jobs": job_manager.list_jobs()}

@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/notifications")
async def get_notifications():
    return {"notifications": [n.model_dump() for n in dispatcher.notification_history]}

@app.post("/api/webhook/mock")
async def mock_webhook_receiver(payload: Dict[str, Any]):
    """Receives and stores dispatched alerts for testing webhook pipelines"""
    logger.info(f"Received webhook: {payload.get('event_type')} - {payload.get('title')}")
    received_webhooks.append(payload)
    return {"received": True, "count": len(received_webhooks)}

@app.get("/api/webhook/logs")
async def get_webhook_logs():
    return {"webhooks": received_webhooks}

@app.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    """
    Real-time streaming channel for live browser screenshots, action execution, and notifications.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial welcome and state snapshot
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to ShopPilot Real-time Agent Stream",
            "active_jobs": len(job_manager.list_jobs())
        }))

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "START_MISSION":
                    objective = msg.get("objective", "Find a 4K 27-inch monitor under $300 and add to cart")
                    start_url = msg.get("start_url") or f"http://127.0.0.1:{settings.PORT}/mock-store"
                    job_id = job_manager.create_job(objective=objective, start_url=start_url)
                    
                    asyncio.create_task(
                        job_manager.execute_job_async(job_id=job_id, ws_callback=ws_manager.broadcast)
                    )
                    await websocket.send_text(json.dumps({
                        "type": "MISSION_STARTED",
                        "job_id": job_id
                    }))
                elif action == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception as e:
                logger.error(f"Error handling websocket message: {e}")

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        ws_manager.disconnect(websocket)
