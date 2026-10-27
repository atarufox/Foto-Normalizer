# Foto Normalizer — Documentazione Architetturale

## 1. Visione d'Insieme & Obiettivi

Foto Normalizer è un'applicazione web client-side, offline e local-first, progettata per normalizzare in sicurezza grandi archivi fotografici JPEG. L'architettura rispetta rigorosamente la separazione tra **estrazione evidenze (analisi in sola lettura)** e **decisioni/modifiche su disco (scrittura controllata e reversibile)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          FOTO NORMALIZER CORE                          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────┐                             ┌───────────────────┐
│     FASE 1: READ     │                             │   FASE 2: WRITE   │
│   (Sola Lettura)     │                             │   (Reversibile)   │
├──────────────────────┤                             ├───────────────────┤
│ • Scanner Ricorsivo  │                             │ • Safety Check    │
│ • Parser Marcatori   │                             │ • EXIF Patching   │
│ • Estrazione TIFF    │                             │ • Create/Write    │
│ • Target Resolving   │                             │ • Remove Original │
│ • O(1) Repo Indexing │                             │ • Snapshot Log    │
└──────────────────────┘                             └───────────────────┘
```

---

## 2. Modello dei Dati & Tipi Principali

### `PhotoItem`
Rappresenta l'entità primaria elaborata dall'applicazione:
- **Identificatori e Percorso**: `id`, `originalName`, `relativePath`, `extension`, `size`.
- **Riferimenti Filesystem**: `file` (`File`), `fileHandle` (`FileSystemFileHandle`), `parentDirHandle` (`FileSystemDirectoryHandle`).
- **Risultato Parsing**: `parseResult` (`ParseResult` contenente date, fotocamera, marcatori, anomalie).
- **Stato Risoluzione**: `targetName`, `targetDate`, `status` (`'pending' | 'valid' | 'already_ok' | 'collision_resolved' | 'warning' | 'error' | 'renamed' | 'rolled_back'`), `isCollision`, `secondsShifted`, `exifNeedsUpdate`.

### `ParseResult`
Contiene le evidenze estratte direttamente dal binario JPEG:
- `dateTimeOriginal`, `createDate`, `modifyDate`, `subSecTime`, `primaryDate`.
- `dateSource`: `'DateTimeOriginal' | 'CreateDate' | 'ModifyDate' | 'FileModified' | 'None'`.
- `markers`: lista ordinata dei marcatori JPEG (`SOI`, `APP1`, `SOF0`, `SOS`, `EOI`...).
- `rawTags`: mappa dei tag TIFF/EXIF identificati per ID esadecimale.
- `anomalies`: lista di anomalie (notice, warning, error bloccanti).
- `trailingBytesAfterEOI`: byte presenti oltre il marcatore EOI (preservati).

### `RollbackSnapshot` & `RollbackOperation`
Rappresenta un checkpoint di versione (`v1`, `v2`, ...):
- `operations`: elenco delle singole operazioni completate.
- `originalExifDate` & `exifModified`: permettono il ripristino in-place dei metadati originari oltre al nome del file.
- `batchScriptBat` / `batchScriptSh` / `manifestJson`: script eseguibili standalone per il ripristino fuori dal browser.

---

## 3. Pipeline di Scansione & Parsing (`src/lib/jpegParser.ts`)

Il parsing viene eseguito con un parser binario ad alte prestazioni che opera direttamente su un `Uint8Array` / `DataView`:

1. **SOI Verification**: controllo marcatore iniziale `0xFFD8`.
2. **Marcatori JPEG**: scansione sequenziale fino a `APP1` (Exif) o `SOF0`/`SOF2` (dimensioni).
3. **TIFF Header & IFD Parsing**:
   - Riconoscimento endianness (Little Endian `II` o Big Endian `MM`).
   - Parsing `IFD0`, `ExifIFD` (sub-IFD `0x8769`), `GPS` (sub-IFD `0x8825`).
   - Estrazione stringhe data conformi allo standard EXIF (`YYYY:MM:DD HH:MM:SS`).
4. **Binary Jump**: una volta raggiunto `SOS` (`0xFFDA`), la scansione degli header termina e il parser esegue un salto al termine del buffer (ultimi 4096 byte) per verificare la presenza di `EOI` (`0xFFD9`) e calcolare eventuali byte di coda (`trailingBytesAfterEOI`).

### Patch EXIF Binaria In-Place (`patchJpegExifDate`)
Quando la modalità `exif_increment` deve modificare una data di scatto per evitare una collisione:
- Viene individuato l'offset del valore ASCII nei tag `DateTimeOriginal` (0x9003), `CreateDate` (0x9004) o `ModifyDate` (0x0132).
- Vengono sovrascritti esattamente i 19 byte ASCII (`YYYY:MM:DD HH:MM:SS`).
- Gli offset TIFF, la struttura dei segmenti e il flusso compresso dell'immagine rimangono intatti al 100% (nessuna ricodifica o perdita qualitativa).

---

## 4. Risoluzione Collisioni & Repository Lookup (`src/lib/renameEngine.ts`)

L'algoritmo di risoluzione collisioni adotta la strategia canonica ad alta affidabilità:

1. **`exif_increment` (Standard Canonico)**:
   - Ordina le foto cronologicamente (per data EXIF, sotto-secondi, e nome/percorso naturale).
   - Verifica la disponibilità del timestamp canonico `YYYY-MM-DD_HH-MM-SS.jpg` sia nel batch corrente sia nell'archivio centrale collegato (Repository).
   - In caso di collisione oraria (stesso secondo), incrementa il timestamp di +1s, +2s... fino a individuare il primo slot temporale libero.
   - Sincronizza i tag EXIF (`DateTimeOriginal`, `CreateDate`, `ModifyDate`) tramite patch binaria in-place senza ricodifica e senza suffissi (`_001`/`_002`).
   - Mantiene piena compatibilità con il rollback in-app (ripristino bidirezionale nome + EXIF originale).

### Repository Centralizzato (20k+ foto)
Il caricamento della cartella Repository memorizza in un `Set<string>` i timestamp e i nomi file esistenti, consentendo controlli di collisione $O(1)$ immediati anche su grandi archivi fotografici.

---

## 5. Esecuzione Rinomina & Protocollo di Rollback (`src/App.tsx`)

### Modalità File System Access API
Quando l'utente seleziona una cartella con supporto nativo del browser:
1. **Safety Check**: controllo che `targetName` non esista già nella directory di destinazione (evita sovrascritture).
2. **Patch Metadati**: se `exifNeedsUpdate` è attivo, patch in memoria dei tag EXIF.
3. **Scrittura Nuovo File**: creazione e scrittura del file `targetName`.
4. **Eliminazione Vecchio File**: rimozione della voce `originalName` solo dopo che la scrittura è andata a buon fine.
5. **Aggiornamento Handle & Stato**: acquisizione del nuovo handle di file valido per mantenere funzionanti anteprima e ispezione.
6. **Snapshot**: registrazione delle sole operazioni effettivamente riuscite.

### Rollback Reversibile
- In-App: legge il file rinominato, ripristina la data EXIF originale con `patchJpegExifDate`, crea il file `originalName`, elimina `targetName` e aggiorna lo stato React.
- Standalone: esecuzione dello script `.bat` (Windows) o `.sh` (macOS/Linux) generato automaticamente nello snapshot.

---

## 6. Limitazioni Note del Browser

- **File Input Mode**: quando aperto in browser privi di File System Access API (o quando l'utente seleziona singoli file tramite input standard), il browser opera in sola lettura. L'applicazione pianifica la rinomina e fornisce lo script `.bat`/`.sh` da eseguire sul filesystem locale.
- **Formati RAW/TIFF**: la decodifica visuale diretta nel tag `<img>` supporta nativamente JPEG, PNG, WebP. Formati RAW proprietari o TIFF estraggono tutti i metadati e marcatori binari, ma l'anteprima visuale potrebbe richiedere decodifica JPEG standard.
