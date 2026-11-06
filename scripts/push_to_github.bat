@echo off
cd /d "%~dp0\.."
echo ====================================================
echo ShopPilot: Push to GitHub
echo ====================================================
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/shoppilot.git): "

if "%REPO_URL%"=="" (
    echo Error: Repository URL cannot be empty.
    pause
    exit /b 1
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo Pushing to %REPO_URL%...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================================
    echo SUCCESS! Repository pushed to GitHub successfully.
    echo You can now deploy it on Render using render.yaml!
    echo ====================================================
) else (
    echo.
    echo Error during push. Please check your permissions or token.
)
pause
