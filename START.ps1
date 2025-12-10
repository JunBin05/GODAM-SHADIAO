# GODAM SHADIAO - One Command Startup
# Starts Backend (8000) with Voice Model included

Write-Host "`n🚀 Starting GODAM SHADIAO Backend...`n" -ForegroundColor Cyan

$python = "C:/Program Files/Python313/python.exe"

# Start Backend on 8000 (includes voice navigation)
Write-Host "Starting Backend with Voice Model (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Vincent Loh\GODAM-SHADIAO\backend' ; & '$python' -m uvicorn main:app --reload --port 8000"

Write-Host "`n✅ Backend started!" -ForegroundColor Green
Write-Host "   Backend + Voice: http://localhost:8000" -ForegroundColor White
Write-Host "`n   Voice models will load on first use`n" -ForegroundColor Gray
Write-Host "To start frontend: npm run dev`n" -ForegroundColor Cyan
