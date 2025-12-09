@echo off
echo ==========================================
echo  VOICE NAVIGATION - LOCAL SETUP
echo ==========================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing dependencies...
pip install -q -r requirements.txt

echo.
echo ==========================================
echo  Starting Voice Navigation Agent...
echo ==========================================
echo.

python voice_navigation_local.py

pause
