@echo off
cd /d "%~dp0\..\backend"
echo ====================================================
echo Starting ShopPilot FastAPI & WebSocket Server (Port 8000)...
echo ====================================================
..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
