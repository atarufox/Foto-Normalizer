# Foto Normalizer (v0.8.0)

**Foto Normalizer** è uno strumento *privacy-first*, *local-first* ed eseguibile completamente *client-side* nel browser (anche come file HTML singolo autonomo offline), progettato per analizzare, validare, risolvere collisioni e normalizzare in modo sicuro archivi fotografici JPEG secondo la data di scatto canonica:

```
YYYY-MM-DD_HH-MM-SS.jpg
```

---

## 🌟 Principi Fondamentali

1. **Local-First & Zero Telemetria**: L'elaborazione avviene al 100% nel browser locale. Nessun dato, immagine o metadato viene inviato a server remoti o servizi cloud.
2. **Analisi Non Distruttiva**: Scansione ed estrazione metadati avvengono in sola lettura prima di qualsiasi proposta di rinomina.
3. **Integrità & Reversibilità**: Sistema di snapshot versionato (`v1`, `v2`, `...`) con script di ripristino batch (`.bat` / `.sh`) e rollback in-app capace di ripristinare sia i nomi dei file originali sia i metadati EXIF se modificati.
4. **Separazione Architetturale Rigida**: Isolamento netto tra il codice sorgente dell'applicazione (`src/`) e gli strumenti/script di compilazione e packaging (`build/`).

---

## 📂 Struttura del Progetto

La radice del progetto è organizzata secondo uno standard modulare orientato alla manutenibilità e all'integrazione con AI:

```
foto-normalizer/
├── src/                          # 📁 ESCLUSIVAMENTE SORGENTE APPLICAZIONE
│   ├── index.html                # Entry point HTML dell'app
│   ├── index.css                 # Stili globali & Tailwind CSS
│   ├── main.tsx                  # Bootstrap React
│   ├── App.tsx                   # Orchestrazione applicazione & logica di stato
│   ├── components/               # Componenti visuali modulari
│   │   ├── FileActionToolbar.tsx # Toolbar filtri & selezione batch
│   │   ├── Header.tsx            # Intestazione, badge & version modal trigger
│   │   ├── PhotoPreviewModal.tsx # Lightbox ad alta risoluzione & ispezione EXIF
│   │   ├── PhotoTable.tsx        # Tabella foto con scroll orizzontale nativo
│   │   ├── RollbackModal.tsx     # Gestione snapshot e rollback in-app
│   │   ├── StatsBar.tsx          # Schede statistiche reattive
│   │   └── VersionHistoryModal.tsx # Modale storico versioni e changelog
│   ├── lib/                      # Motori logici e binari
│   │   ├── jpegParser.ts         # Parser binario marcatori JPEG & TIFF/EXIF
│   │   └── renameEngine.ts       # Risoluzione collisioni & lookup archivio O(1)
│   └── types/                    # Definizioni TypeScript & costanti
│       └── index.ts
│
├── build/                        # 🛠️ STRUMENTI DI COMPILAZIONE & PACKAGING
│   ├── package.json              # Dipendenze Node, script di build e dev
│   ├── vite.config.ts            # Configurazione Vite & inliner singlefile
│   ├── tsconfig.json             # Configurazione TypeScript
│   ├── AVVIA_FOTO_NORMALIZER.bat # Launcher rapido Windows
│   ├── avvia_foto_normalizer.sh  # Launcher rapido Linux / macOS
│   ├── build.bat                 # Script di compilazione batch Windows
│   ├── build.sh                  # Script di compilazione shell Linux / macOS
│   ├── output/                   # 📦 Artefatti compilati generati (.html, .apk, .exe)
│   │   └── Foto_Normalizer_Standalone.html # Bundle HTML autonomo offline
│   └── scripts/                  # Script helper e sincronizzazione repository
│       ├── build.mjs             # Motore di bundling e copia artefatti
│       ├── github-sync.mjs       # Client API per sincronizzazione Git remota
│       └── push-sync.mjs         # Sincronizzazione atomica repository
│
├── README.md                     # 📖 Documentazione architettura e istruzioni
└── .gitignore                    # 🚫 Esclusioni Git (node_modules, build/output, ecc.)
```

---

## 🚀 Istruzioni di Sviluppo & Compilazione

Tutti i comandi di build e packaging vengono eseguiti all'interno della cartella `build/`:

### 1. Installazione Dipendenze (se necessaria)
```bash
cd build
npm install
```

### 2. Avvio Server di Sviluppo Locale
```bash
cd build
npm run dev
```

### 3. Compilazione del Pacchetto Autonomo Offline Single-File
```bash
cd build
npm run build
```
Oppure tramite gli script dedicati:
- **Windows**: fare doppio click su `build/build.bat`
- **Linux / macOS**: eseguire `./build/build.sh`

L'output compilato verrà generato direttamente in `build/output/Foto_Normalizer_Standalone.html`.

### 4. Avvio Diretto dell'Applicazione
- **Windows**: doppio click su `build/AVVIA_FOTO_NORMALIZER.bat`
- **Linux / macOS**: `./build/avvia_foto_normalizer.sh`

---

## 🔒 Sicurezza, Privacy & Integrità

- **Zero connessioni remote**: L'applicazione non contatta server esterni né invia telemetria.
- **Safety check fisico**: Prima della rinomina su disco, il motore verifica l'esistenza del file target per prevenire sovrascritture.
- **Ripristino bidirezionale EXIF**: Il sistema di rollback ripristina fedelmente sia i nomi originali dei file sia i metadati binari EXIF (`DateTimeOriginal`, `CreateDate`, `ModifyDate`) modificati per la risoluzione delle collisioni orarie.

---

## 📄 Licenza

Distribuito come software open-source / proprietario secondo i termini della repository.

---

**Ultimo aggiornamento:** 6 Novembre 2026, 02:15 (CET)
