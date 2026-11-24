@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev-local.ps1" -OpenBrowser
if errorlevel 1 (
  echo.
  echo Local startup failed. Check the error above.
  pause
  exit /b 1
)
