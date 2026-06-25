@echo off
echo Starting Docquiz AI...
cd /d "%~dp0scan-to-quiz"

echo Checking dependencies...
call npm install

echo Starting development server...
call npm run dev
pause
