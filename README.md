# Foto Normalizer (v0.7.0)

**Foto Normalizer** è uno strumento *privacy-first*, *local-first* ed eseguibile completamente *client-side* nel browser (anche come file HTML singolo autonomo offline), progettato per analizzare, validare, risolvere collisioni e normalizzare in modo sicuro gli archivi fotografici JPEG secondo la data di scatto canonica:

```
YYYY-MM-DD_HH-MM-SS.jpg
```

---

## 🌟 Principi Fondamentali

1. **Local-First & Zero Telemetria**: L'elaborazione avviene al 100% nel browser locale. Nessun dato, immagine o metadato viene inviato a server remoti o servizi cloud.
2. **Analisi Non Distruttiva**: Scansione ed estrazione metadati avvengono in sola lettura prima di qualsiasi proposta di rinomina.
3. **Integrità & Reversibilità**: Sistema di snapshot versionato (`v1`, `v2`, `...`) con script di ripristino batch (`.bat` / `.sh`) e rollback in-app capace di ripristinare sia i nomi dei file originali sia i metadati EXIF se modificati.
4. **Protezione da Sovrascritture**: Prima di ogni scrittura su disco viene verificata l'esistenza fisica del file di destinazione, impedendo sovrascritture accidentali.

---

## 🚀 Funzionalità Principali

- **Parser JPEG Binario Veloce**: Scansione diretta dei segmenti marcatori JPEG (`SOI`, `APP0`, `APP1`, `DQT`, `DHT`, `SOF0`, `SOF2`, `SOS`, `EOI`) ed estrazione dell'header TIFF/EXIF senza librerie esterne pesanti né ricodifica delle immagini.
- **Risoluzione Intelligente delle Collisioni**:
  - `exif_increment` (Standard Canonico): mantiene rigorosamente il formato `YYYY-MM-DD_HH-MM-SS.jpg` senza suffissi `_001`/`_002`, applicando uno scostamento sequenziale (+1s, +2s...) direttamente nei tag EXIF (`DateTimeOriginal`, `CreateDate`, `ModifyDate`) tramite patch binaria in-place.
- **Integrazione con Repository Esterno**: Indicizzazione di archivi centrali (20.000+ foto) con lookup $O(1)$ per evitare duplicazioni di nomi anche tra lotti diversi.
- **Visualizzatore & Ispezione EXIF Unificata**: Anteprima foto ad alta risoluzione con Lightbox a schermo intero (apribile con click diretto sulla foto o all'esterno per chiudere), controlli di zoom/rotazione, tabella di tutti i tag EXIF, marcatori binari JPEG e segnalazione anomalie/sicurezza.
- **Selezione Multipla Avanzata & Rinomina Mirata**: Selezione flessibile tramite checkbox, selezione d'intervallo con `Shift + Click` e selezione arbitraria con `Ctrl + Click`, toolbar contestuale e rinomina mirata solo delle foto selezionate.
- **Rollback Snapshot Versionato**: Generazione automatica di snapshot con manifest JSON e script eseguibili per Windows (`.bat`) e Unix/macOS (`.sh`).

---

## 📂 Struttura del Progetto

```
foto-normalizer/
├── index.html                   # Entry point applicazione web
├── Foto_Normalizer_Standalone.html # Versione autonoma a file singolo
├── AVVIA_FOTO_NORMALIZER.bat    # Launcher Windows
├── avvia_foto_normalizer.sh     # Launcher Linux/macOS
├── package.json                 # Dipendenze e script di build
├── vite.config.ts               # Configurazione Vite e bundle singlefile
├── src/
│   ├── main.tsx                 # Bootstrap React
│   ├── App.tsx                  # Componente principale & orchestrazione stato
│   ├── types/
│   │   └── index.ts             # Definizioni TypeScript e APP_VERSION
│   ├── lib/
│   │   ├── jpegParser.ts        # Parser binario JPEG ed editor EXIF in-place
│   │   └── renameEngine.ts      # Risoluzione collisioni e snapshot rollback
│   └── components/
│       ├── Header.tsx           # Barra superiore e badge di versione
│       ├── StatsBar.tsx         # Contatori incrementali e statistiche
│       ├── FileActionToolbar.tsx# Barra strumenti, filtri, sort e repository
│       ├── PhotoTable.tsx       # Griglia dati, paginazione e ordinamento
│       ├── PhotoPreviewModal.tsx# Modale unificata anteprima & ispettore EXIF
│       ├── RollbackModal.tsx    # Gestione rollback e download script
│       └── VersionHistoryModal.tsx # Changelog e storico snapshot
├── CHANGELOG.md                 # Registro cronologico delle versioni
└── ARCHITECTURE.md              # Documentazione architetturale dettagliata
```

---

## 🛠️ Installazione e Sviluppo

### Prerequisiti
- [Node.js](https://nodejs.org/) (versione 18 o superiore consigliata)

### Comandi Disponibili

```bash
# 1. Installazione dipendenze
npm install

# 2. Avvio server di sviluppo locale
npm run dev

# 3. Compilazione della build di produzione (crea anche il file standalone)
npm run build

# 4. Verifica dei tipi TypeScript
npm run lint
```

---

## 🔒 Sicurezza e Privacy

- **Nessuna connessione esterna**: l'applicazione non effettua richieste HTTP/HTTPS esterne durante l'uso.
- **Nessun tracking**: nessuna libreria di analitica o telemetria.
- **Sicurezza binaria**: il parser JPEG convalida offset, lunghezze e confini dei buffer per prevenire corruzioni o letture fuori limite.
- **Preservazione dati**: la rinomina binaria in-place modifica esclusivamente i 19 byte ASCII delle date EXIF senza toccare i dati dei pixel compressi (nessuna ricompressione JPEG con perdita di qualità).

---

## 📄 Licenza

Distribuito come software proprietario / open-source secondo le politiche del repository.

---

**Ultimo aggiornamento:** 27 Ottobre 2026, 17:00 (CET)

