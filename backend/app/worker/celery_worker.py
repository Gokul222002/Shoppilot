"""
Celery Worker Configuration for Distributed Asynchronous Browser Operations.
"""

import os
import asyncio
from celery import Celery
from app.config import settings

celery_app = Celery(
    "shoppilot_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300
)

@celery_app.task(name="shoppilot.run_browser_mission", bind=True)
def run_browser_mission_task(self, job_id: str, objective: str, start_url: str):
    """
    Celery entrypoint for distributed headless worker nodes.
    """
    from app.agent.planner import ShoppingMissionPlanner

    planner = ShoppingMissionPlanner(
        job_id=job_id,
        objective=objective,
        start_url=start_url
    )

    loop = asyncio.get_event_loop()
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    result = loop.run_until_complete(planner.execute())
    return result
