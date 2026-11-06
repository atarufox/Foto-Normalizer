@echo off
title Foto Normalizer - Build & Packaging
echo ========================================================
echo   Compilazione Foto Normalizer (100%% Single-File HTML)
echo ========================================================
echo.

cd /d "%~dp0"

if exist "%LOCALAPPDATA%\..\.gemini\antigravity\scratch\nodejs\node.exe" (
    set "NODE_CMD=%LOCALAPPDATA%\..\.gemini\antigravity\scratch\nodejs\node.exe"
) else (
    set "NODE_CMD=node"
)

echo Esecuzione build Vite da src/ a build/output/...
"%NODE_CMD%" "%~dp0scripts\build.mjs"

if %ERRORLEVEL% NEQ 0 (
    echo [ERRORE] Compilazione fallita!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   [OK] Bundle generato: build\output\Foto_Normalizer_Standalone.html
echo ========================================================
echo.
pause
