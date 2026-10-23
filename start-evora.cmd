@echo off
setlocal enabledelayedexpansion
title Evora - Backend Server
cd /d "%~dp0assets\server"

echo.
echo   E V O R A   -   backend server
echo   ------------------------------------------
echo   Site    http://localhost:3000
echo   Admin   http://localhost:3000/admin.html
echo   Health  http://localhost:3000/health
echo.
echo   Open the site at http://localhost:3000
echo   (the backend serves the pages AND the API - do not
echo    open the HTML files directly, orders will not work)
echo.
echo   To stop the server: press Ctrl+C, then Y.
echo.

rem --- find node -----------------------------------------------------------
set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" (
  echo   ERROR: Node.js was not found.
  echo   Install the LTS version from https://nodejs.org and try again.
  echo.
  pause
  exit /b 1
)

rem --- if it is already running, just open the site ------------------------
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo   The backend is already running on port 3000 - opening the site.
  echo.
  start "" http://localhost:3000
  timeout /t 2 /nobreak >nul
  exit /b 0
)

rem --- open the site once the server has had a moment to start -------------
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start "" http://localhost:3000"

:run
"%NODE_EXE%" server.js
set RC=!ERRORLEVEL!

echo.
if !RC!==0 (
  echo   Server stopped cleanly.
  goto :done
)

echo   The server crashed (exit code !RC!). Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto :run

:done
echo.
pause
