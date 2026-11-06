#!/bin/bash
# Foto Normalizer - Build & Packaging Linux/macOS
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "  Compilazione Foto Normalizer (100% Single-File HTML)"
echo "========================================================"
echo ""

node "$DIR/scripts/build.mjs"

if [ $? -ne 0 ]; then
    echo "[ERRORE] Compilazione fallita!"
    exit 1
fi

echo ""
echo "========================================================"
echo "  [OK] Bundle generato: build/output/Foto_Normalizer_Standalone.html"
echo "========================================================"
