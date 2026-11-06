@echo off
echo Starting ShopPilot Full-Stack Platform...
start "ShopPilot Backend" cmd /k "call "%~dp0start_backend.bat""
timeout /t 3 /nobreak >nul
start "ShopPilot Frontend" cmd /k "call "%~dp0start_frontend.bat""
echo ShopPilot is booting! Open http://localhost:3000 to interact with the agent.
