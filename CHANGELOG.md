# Changelog

Tutte le modifiche rilevanti a **Foto Normalizer** sono documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/), e il progetto segue il [Semantic Versioning](https://semver.org/).

---

## [0.7.0] - Ottobre 2026

### ✨ Nuove Funzionalità (Minor)
- **Selezione Multipla con Checkbox**: aggiunta colonna di selezione rapida a sinistra con supporto nativo per selezioni d'intervallo (`Shift + Click`) e selezioni arbitrarie (`Ctrl + Click` / `Cmd + Click`).
- **Rinomina Mirata ("Targeted Rename")**: possibilità di eseguire la rinomina esclusivamente sulle foto selezionate, con aggiornamento dinamico del pulsante d'azione nell'header (`Rinomina Selezionati (N)`).
- **Banner di Selezione Rapida**: toolbar contestuale con conteggi in tempo reale e filtri rapidi (*Solo Pronte*, *Solo Collisioni*, *Seleziona Tutte*, *Deseleziona*).
- **Pulizia Tabella**: rimossa la colonna "Azioni" ridondante in favore del click diretto su riga o miniatura per l'apertura dell'ispezione tecnica.

---

## [0.6.1] - Ottobre 2026

### 🚀 Release
- **Allineamento Versioning GitHub**: aggiornata la versione del pacchetto a `0.6.1` per la sincronizzazione e pubblicazione della repository GitHub.

---

## [0.6.0] - Ottobre 2026

### 🧹 Audit & Pulizia
- **Rimozione dipendenze non utilizzate**: eliminati da `package.json` i pacchetti `@google/genai`, `express`, `@types/express`, `dotenv`, `jszip`, `motion` non necessari per il runtime client-side.
- **Rimozione residui AI Studio**: eliminati metadati generati automaticamente (`MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` in `metadata.json`) e variabili `.env` superflue.
- **Rimozione import inutilizzati**: ripuliti componenti React (`HelpCircle` in `PhotoTable.tsx`, `RotateCcw`/`FolderTree` in `PhotoPreviewModal.tsx`, `CheckCircle2` in `RollbackModal.tsx`, icone non usate in `VersionHistoryModal.tsx`).

### 🛡️ Safety & Integrità Filesystem
- **Protezione anti-sovrascrittura**: verifica esplicita dell'esistenza fisica del file di destinazione sul filesystem prima di qualsiasi operazione di scrittura.
- **Sincronizzazione reale stato/disco**: eliminata la marcatura fasulla come `renamed` in caso di errori di scrittura su disco o durante l'uso del selettore file standard (modalità sola lettura).
- **Rollback con ripristino EXIF in-place**: esteso il sistema di rollback per ripristinare fedelmente sia i nomi dei file originali sia i metadati binari EXIF (`DateTimeOriginal`, `CreateDate`, `ModifyDate`) modificati durante la risoluzione collisioni orarie (`exif_increment`).
- **Gestione errori parziali**: in caso di fallimento su singoli file durante un batch di rinomina, lo snapshot include unicamente le operazioni effettivamente completate con successo.

### 🏷️ Versioning & Trasparenza
- **Costante unica di versione**: centralizzata la costante `APP_VERSION = '0.6.0'` in `src/types/index.ts` e utilizzata in tutti i componenti, launcher e script di export.
- **Trasparenza prestazioni**: chiarita la distinzione tra velocità del parser binario in memoria (~0.002s/foto) e throughput effettivo di I/O disco/rendering.

---

## [0.5.4] - Ottobre 2026

### Aggiunto
- **Lightbox a Schermo Intero al Click**: click diretto sull'anteprima foto per espandere l'immagine a dimensione massima mantenendo la navigazione continua.
- **Chiusura Rapida al Click Esterno**: click sullo sfondo oscurato per chiudere istantaneamente l'anteprima e tornare alla griglia principale.
- **Unificazione Preview & Ispezione EXIF**: integrazione completa tra anteprima visuale, specifiche di scatto, tabella tag EXIF e marcatori binari JPEG in un'unica interfaccia.

---

## [0.5.1] - Ottobre 2026

### Corretto
- **Risoluzione anteprime post-rinomina**: corretta la gestione degli handle del filesystem in modo da non cercare file con il vecchio nome dopo la rinomina.
- **Nomenclatura YYYY-MM-DD_HH-MM-SS.jpg senza suffissi**: implementata la modalità `exif_increment` con patch binaria in-place delle date EXIF e incremento progressivo di secondi per scatti contemporanei.

---

## [0.5.0] - Ottobre 2026

### Aggiunto
- **Unificazione Motore JPEG**: rimossa la duplicazione delle modalità Light/Deep a favore di un unico scanner binario ottimizzato.
- **Ordinamento su tutte le colonne**: ordinamento bidirezionale per nome originale, nome target, data, fotocamera, dimensione e stato.
- **Paginazione configurabile**: selezione rapida del numero di elementi per pagina (15, 25, 50, 100, 250, 500, Tutti).

---

## [0.4.6] - Ottobre 2026

### Ottimizzazioni
- **Parser JPEG Binary Jump**: scansione diretta degli header con salto immediato al blocco finale EOI dopo la lettura dei metadati.
- **Scansione ricorsiva delle sottocartelle**: supporto navigazione cartelle annidate e preservazione della struttura di directory.
- **Pulsante di interruzione scansione (STOP)**.

---

## [0.4.5] - Ottobre 2026

### Iniziale
- Versione base originaria con analisi EXIF e script di rinomina iniziale.
