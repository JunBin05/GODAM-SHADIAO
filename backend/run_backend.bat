@echo off
echo Starting MyID Voice Assistant Backend...
echo.
cd /d "%~dp0"
"C:/Program Files/Python313/python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
