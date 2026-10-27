import React from 'react';
import { RollbackSnapshot, APP_VERSION } from '../types';
import {
  X,
  History,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface VersionHistoryModalProps {
  snapshots: RollbackSnapshot[];
  onClose: () => void;
  onOpenRollback: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  snapshots,
  onClose,
  onOpenRollback,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-xs sm:text-base font-semibold text-slate-100 truncate">
                  Versioning & Changelog
                </h3>
                <span className="text-[10px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  v{APP_VERSION} Corrente
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Evoluzione del progetto, log di versione e snapshot di rollback
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 text-xs text-slate-300">
          {/* Active Rollback Snapshot Registry */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Snapshot di Rollback Registrati ({snapshots.length})</span>
              </div>
              {snapshots.length > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenRollback();
                  }}
                  className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium cursor-pointer transition-colors"
                >
                  Gestisci Rollback
                </button>
              )}
            </div>

            {snapshots.length === 0 ? (
              <p className="text-slate-500">
                Nessuna operazione di rinomina ancora eseguita in questa sessione. Al primo &quot;Esegui Rinomina&quot;, verrà creato automaticamente lo snapshot versionato <code>v1</code> con script reversibili.
              </p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-emerald-400 font-semibold">
                        Snapshot v{s.versionNumber}
                      </span>
                      <span className="text-slate-400 ml-2">
                        · {s.totalFiles} file rinominati · {new Date(s.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      ID: {s.id.slice(0, 16)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Changelog Timeline */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Cronologia Versioni Applicazione
            </h4>

            {/* Version 0.7.2 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-emerald-400">v0.7.2</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                    Ultima Release
                  </span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">27 Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Allineamento Changelog In-App:</strong> Integrata la cronologia completa delle versioni direttamente nella modale informativa consultabile con un click sul badge di versione in alto a sinistra.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.7.1 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-200">v0.7.1</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">27 Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Ottimizzazione Mobile &amp; Layout Responsive:</strong> Risolti i problemi di overflow e visualizzazione su dispositivi compatti (es. Motorola Moto G85, ~393px viewport). Header fluido, statistiche a 2 colonne, toolbar swipeable e tabella con scorrimento orizzontale nativo.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.7.0 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-200">v0.7.0</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Selezione Multipla con Checkbox:</strong> Nuova colonna sinistra per selezionare foto singole, intervalli con <code>Shift + Click</code> o selezioni multiple con <code>Ctrl + Click</code> / <code>Cmd + Click</code>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rinomina Mirata (&quot;Targeted Rename&quot;):</strong> Esecuzione della rinomina applicabile esclusivamente alle foto selezionate, con aggiornamento dinamico dell&apos;azione principale.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Pulizia Tabella:</strong> Rimossa la colonna &quot;Azioni&quot; ridondante; apertura immediata della preview cliccando direttamente su riga o miniatura.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.6.1 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-300">v0.6.1</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Allineamento Versioning GitHub:</strong> Configurazione sincronizzazione automatica repository e uniformazione versioni pacchetto.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.6.0 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-300">v0.6.0</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Audit &amp; Pulizia Dipendenze:</strong> Rimossi moduli npm non utilizzati (<code>@google/genai</code>, <code>express</code>, <code>dotenv</code>, <code>jszip</code>, <code>motion</code>) e configurazioni residue dei template AI Studio.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rollback Completo con Ripristino EXIF:</strong> Il rollback in-app ripristina fedelmente sia i nomi originali dei file sia i metadati binari EXIF (DateTimeOriginal, CreateDate, ModifyDate) quando incrementati per collisioni.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Safety &amp; Protezione Sovrascrittura:</strong> Verifica di collisione fisica su disco prima della scrittura. Gli errori parziali lasciano uno stato pulito e lo snapshot include unicamente i file realmente rinominati su disco.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Unificazione Versioning &amp; Trasparenza:</strong> Centralizzata la costante <code>APP_VERSION</code> e chiarita la distinzione tra velocità di parsing in memoria (~0.002s) e throughput I/O reale del filesystem.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.5.4 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-300">v0.5.4</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Visualizzazione Ingrandita con un Click sull&apos;Immagine:</strong> Cliccando direttamente sulla foto nella modale unificata, l&apos;anteprima si espande immediatamente a dimensione massima a schermo intero (lightbox ingrandito), preservando la navigazione continua tra tutte le foto (frecce a schermo, tastiera <code>←</code> e <code>→</code>).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Chiusura Rapida al Click Fuori dalla Preview:</strong> Cliccando all&apos;esterno dell&apos;anteprima (sullo sfondo scuro sfumato), l&apos;utente ritorna istantaneamente alla tabella principale della schermata iniziale.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Unificazione Completa Anteprima &amp; Ispezione EXIF:</strong> Sia il click sulla miniatura che sulla riga/descrizione aprono un&apos;unica finestra ricca di controlli di zoom, rotazione, specifiche tecniche, marcatori binari e diagnostica.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.5.1 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-300">v0.5.1</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Risoluzione anteprima post-rinomina:</strong> Corretto il caricamento dell&apos;anteprima (Lightbox e miniature) dopo l&apos;esecuzione della rinomina su disco. L&apos;applicazione recupera istantaneamente il nuovo handle di file aggiornato senza cercare il vecchio nome eliminato.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Nomenclatura rigorosa YYYY-MM-DD_HH-MM-SS.jpg senza suffissi:</strong> Eliminati i suffissi <code>_001</code> e <code>_002</code>. Ogni file segue rigorosamente lo standard orario. In caso di scatti nello stesso secondo, il motore calcola l&apos;offset sequenziale (+1s, +2s...), modifica in-place i metadati EXIF del JPEG (DateTimeOriginal, CreateDate, ModifyDate) e rinomina il file in perfetta sincronia con la nuova data EXIF.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.5.0 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-200">v0.5.0</span>
                <span className="text-slate-500 font-mono text-[11px]">Ottobre 2026</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Unificazione motore unico:</strong> rimossa la superflua separazione Light/Deep. Lettura completa e veloce (~0.002s) di tutti i campi EXIF e marcatori senza modalità separate.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Ordinamento (Sort) completo su ogni colonna:</strong> Nome originale, Nuovo nome, Data di scatto, Dimensione, Fotocamera, Stato e Sottocartella (ordinamento bidirezionale asc/desc + selettore rapido).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Anteprima ad alta risoluzione & Lightbox:</strong> Zoom, rotazione, navigazione galleria e visualizzazione parametri di scatto (ISO, tempi, diaframma).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Menu a tendina foto per pagina:</strong> Scelta rapida tra 15, 25, 50, 100, 250, 500 o tutte le foto in un unico stream.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Risoluzione collisioni trasparente:</strong> Chiarita la causa dei suffissi <code>_001</code> / <code>_002</code> per foto scattate nello stesso identico secondo.
                  </span>
                </li>
              </ul>
            </div>

            {/* Version 0.4.6 */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-200">v0.4.6</span>
                <span className="text-slate-500 font-mono text-[11px]">Ottimizzazione Binary Jump</span>
              </div>
              <ul className="space-y-1 text-slate-400">
                <li>• Parser JPEG binario con salti marcatori diretti (0.0024s vs 0.458s).</li>
                <li>• Rimozione falsi allarmi bloccanti su ExposureCompensation.</li>
                <li>• Supporto scansione ricorsiva delle sottocartelle e pulsante STOP.</li>
              </ul>
            </div>

            {/* Version 0.4.5 */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-400">v0.4.5</span>
                <span className="text-slate-600 font-mono text-[11px]">Base Originale</span>
              </div>
              <p className="text-slate-500">
                Implementazione originaria basata su script Python e validazione approfondita ExifTool.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs">
          <span className="text-slate-400">
            Foto Normalizer · Architettura 100% Client-Side & Local-First
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
