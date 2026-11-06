@echo off
cd /d "%~dp0\..\frontend"
echo ====================================================
echo Starting ShopPilot Next.js Command Center (Port 3000)...
echo ====================================================
node .\node_modules\next\dist\bin\next dev -p 3000
pause
