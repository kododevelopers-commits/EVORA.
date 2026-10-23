@echo off
title Evora - server log
rem The log lives outside the project folder on purpose: VS Code's Live Server
rem watches the project and reloads the page whenever a file in it changes.
rem If the log were inside the project, every request would change it, every
rem change would reload the page, and the page would send more requests -
rem an endless loop.
set "LOG=%LOCALAPPDATA%\Evora\server.log"

if not exist "%LOG%" (
  echo.
  echo   No log file yet at:
  echo   %LOG%
  echo.
  echo   The log is created when the backend runs as a scheduled task.
  echo   Start it by double-clicking start-evora.cmd, or run:
  echo     powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
  echo.
  pause
  exit /b 0
)

start "" notepad.exe "%LOG%"
