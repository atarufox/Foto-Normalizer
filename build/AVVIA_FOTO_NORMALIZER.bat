@echo off
title Foto Normalizer v0.8.0
echo ========================================================
echo   Avvio di Foto Normalizer v0.8.0 (100%% Locale)
echo   Motore unificato, anteprima Lightbox, sort e rollback
echo   Nessun server richiesto - Funziona offline nel browser
echo ========================================================
echo.

if not exist "%~dp0output\Foto_Normalizer_Standalone.html" (
    echo [INFO] Pacchetto non trovato in build\output. Compilazione in corso...
    call "%~dp0build.bat"
)

echo Apertura Foto Normalizer v0.8.0 nel browser...
start "" "%~dp0output\Foto_Normalizer_Standalone.html"
exit
