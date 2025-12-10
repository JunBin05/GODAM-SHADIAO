# Start All Servers for GODAM SHADIAO
# Run this script to start Backend + Voice API

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  GODAM SHADIAO - Server Startup Script" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$pythonPath = "C:/Program Files/Python313/python.exe"
$backendPath = "c:\Users\Vincent Loh\GODAM-SHADIAO\backend"
$voicePath = "c:\Users\Vincent Loh\GODAM-SHADIAO\voice-login"

# Start Backend Server (Port 8000)
Write-Host "[1/2] Starting Backend Server (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath' ; & '$pythonPath' -m uvicorn main:app --reload --port 8000"

# Wait a bit
Start-Sleep -Seconds 2

# Start Voice API Server (Port 8001)
Write-Host "[2/2] Starting Voice Navigation API (Port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$voicePath' ; & '$pythonPath' voice_api_server.py"

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  Servers Starting!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "`nBackend:     http://localhost:8000" -ForegroundColor White
Write-Host "Voice API:   http://localhost:8001" -ForegroundColor White
Write-Host "`nTo start frontend, run: npm run dev" -ForegroundColor Cyan
Write-Host "`nPress any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
