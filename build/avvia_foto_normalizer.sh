#!/bin/bash
# Foto Normalizer v0.8.0 - Launcher Linux / macOS
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FILE="$DIR/output/Foto_Normalizer_Standalone.html"

if [ ! -f "$FILE" ]; then
    echo "[INFO] Pacchetto non trovato in build/output. Compilazione in corso..."
    bash "$DIR/build.sh"
fi

echo "Apertura Foto Normalizer v0.8.0 nel browser..."
if which xdg-open > /dev/null; then
    xdg-open "$FILE"
elif which open > /dev/null; then
    open "$FILE"
else
    echo "Apri manualmente il file con il tuo browser:"
    echo "$FILE"
fi
