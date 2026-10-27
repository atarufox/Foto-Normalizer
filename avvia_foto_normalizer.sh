#!/bin/bash
# Foto Normalizer v0.6.1 - Launcher Linux / macOS
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FILE="$DIR/Foto_Normalizer_Standalone.html"

echo "Apertura Foto Normalizer v0.6.1 nel browser..."
if which xdg-open > /dev/null; then
    xdg-open "$FILE"
elif which open > /dev/null; then
    open "$FILE"
else
    echo "Apri manualmente il file con il tuo browser:"
    echo "$FILE"
fi
