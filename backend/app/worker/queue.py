"""
Asynchronous Job Queue Manager for Non-Blocking Browser Tasks.
Supports native AsyncIO Background Tasks with optional Redis/Celery integration.
"""

import asyncio
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.config import settings
from app.agent.planner import ShoppingMissionPlanner

logger = logging.getLogger("ShopPilot.Worker")

class JobManager:
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.active_planners: Dict[str, ShoppingMissionPlanner] = {}

    def create_job(self, objective: str, start_url: Optional[str] = None) -> str:
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        self.jobs[job_id] = {
            "id": job_id,
            "objective": objective,
            "start_url": start_url or f"http://127.0.0.1:{settings.PORT}/mock-store",
            "status": "QUEUED",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result": None,
            "error": None
        }
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.jobs.get(job_id)

    def list_jobs(self) -> list[Dict[str, Any]]:
        return list(self.jobs.values())

    async def execute_job_async(self, job_id: str, ws_callback: Optional[Any] = None):
        job = self.jobs.get(job_id)
        if not job:
            return

        job["status"] = "RUNNING"
        job["updated_at"] = datetime.utcnow().isoformat()

        planner = ShoppingMissionPlanner(
            job_id=job_id,
            objective=job["objective"],
            start_url=job["start_url"]
        )
        self.active_planners[job_id] = planner

        try:
            result = await planner.execute(ws_callback=ws_callback)
            job["status"] = result.get("status", "COMPLETED")
            job["result"] = result
            job["updated_at"] = datetime.utcnow().isoformat()
        except Exception as e:
            logger.error(f"Execution failed for job {job_id}: {e}")
            job["status"] = "FAILED"
            job["error"] = str(e)
            job["updated_at"] = datetime.utcnow().isoformat()
        finally:
            self.active_planners.pop(job_id, None)

job_manager = JobManager()
