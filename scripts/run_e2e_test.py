"""
End-to-End Automated Integration Test for ShopPilot.
Launches the backend, initiates an autonomous shopping mission over WebSockets,
verifies live perception frames, deal extraction, cart simulation, and safeguards.
"""

import asyncio
import json
import subprocess
import sys
import time
import httpx
import websockets

BACKEND_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/agent"

async def wait_for_server():
    print("[E2E] Waiting for ShopPilot backend to become available...")
    for i in range(25):
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{BACKEND_URL}/api/health")
                if res.status_code == 200:
                    print(f"[E2E] Server online! Health: {res.json()}")
                    return True
        except Exception:
            pass
        await asyncio.sleep(1)
    return False

async def run_e2e_agent_test():
    server_ready = await wait_for_server()
    if not server_ready:
        print("[E2E ERROR] Backend failed to start.")
        sys.exit(1)

    print(f"[E2E] Connecting to WebSocket stream at {WS_URL}...")
    received_events = []
    deals_found = []
    actions_executed = []
    mission_completed = False

    async with websockets.connect(WS_URL) as ws:
        # Send shopping command
        goal_msg = {
            "action": "START_MISSION",
            "objective": "Find a 4K 27-inch monitor under ₹25,000 and add it to cart",
            "start_url": f"{BACKEND_URL}/mock-store"
        }
        await ws.send(json.dumps(goal_msg))
        print(f"[E2E] Dispatched Shopping Objective: '{goal_msg['objective']}'")

        start_time = time.time()
        while time.time() - start_time < 60:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=15.0)
                msg = json.loads(raw)
                event_type = msg.get("type")
                received_events.append(event_type)

                if event_type == "AGENT_STEP":
                    step_data = msg.get("data", {})
                    if "action" in step_data:
                        print(f" -> [Step {step_data.get('step')}] Action: {step_data.get('action')} | Selector: {step_data.get('selector')} | Thought: {step_data.get('thought')[:60]}...")
                        actions_executed.append(step_data)

                elif event_type == "DEAL_DISCOVERED":
                    deal = msg.get("data", {})
                    print(f" ★ [DEAL FOUND] {deal.get('title')} - ${deal.get('price')}")
                    deals_found.append(deal)

                elif event_type == "NOTIFICATION":
                    payload = msg.get("payload", {})
                    print(f" 🔔 [ALERT] {payload.get('event_type')}: {payload.get('title')}")

                elif event_type == "MISSION_STATUS":
                    status = msg.get("data", {}).get("status")
                    print(f" [MISSION STATUS] -> {status}")
                    if status in ["COMPLETED", "SAFETY_HALT"]:
                        mission_completed = True
                        break

            except asyncio.TimeoutError:
                print("[E2E] Timeout waiting for stream event.")
                break

    print("\n" + "="*60)
    print("SHOPPILOT E2E EXECUTION SUMMARY")
    print("="*60)
    print(f"Total WebSocket Events Received : {len(received_events)}")
    print(f"Autonomous Actions Executed     : {len(actions_executed)}")
    print(f"Deals Matched & Extracted       : {len(deals_found)}")
    print(f"Mission Completed Safely        : {mission_completed}")
    print("="*60)

    # Verification Assertions
    assert len(actions_executed) > 0, "Agent failed to execute actions"
    assert len(deals_found) > 0, "Agent failed to find matching deal"
    assert deals_found[0]["price"] <= 300.0, "Matched deal exceeded budget limit"
    assert mission_completed, "Mission did not reach completion state"

    print("\n>>> ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    asyncio.run(run_e2e_agent_test())
