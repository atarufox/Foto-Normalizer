import React from 'react';
import { History, Play, CheckCircle, Info } from 'lucide-react';
import { APP_VERSION } from '../types';

interface HeaderProps {
  folderName: string | null;
  onRename: () => void;
  onOpenRollback: () => void;
  onOpenVersionHistory: () => void;
  hasRollbackAvailable: boolean;
  canRename: boolean;
  isRenaming: boolean;
  renamedCount: number;
  snapshotsCount: number;
  selectedCount?: number;
  targetRenameCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  folderName,
  onRename,
  onOpenRollback,
  onOpenVersionHistory,
  hasRollbackAvailable,
  canRename,
  isRenaming,
  renamedCount,
  snapshotsCount,
  selectedCount = 0,
  targetRenameCount = 0,
}) => {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-30">
      {/* Zone 1: Wordmark & Versioning */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm shadow-xs">
          FN
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap">
              Foto Normalizer
            </span>
            <button
              onClick={onOpenVersionHistory}
              className="group flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-semibold cursor-pointer transition-colors"
              title="Visualizza informazioni su questa versione e cronologia changelog"
            >
              <span>v{APP_VERSION}</span>
              <Info className="w-3 h-3 text-emerald-400/70 group-hover:text-emerald-300" />
            </button>
          </div>
          {folderName && (
            <p className="text-xs text-slate-400 font-mono truncate max-w-sm">
              Cartella: <span className="text-slate-200">{folderName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Zone 2: Engine Status & Scope Indicator */}
      <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span className="font-medium">Motore Unificato JPEG/EXIF</span>
        </span>
        <span className="text-slate-600">·</span>
        <span className="font-mono text-emerald-300">Parsing binario in memoria</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">100% Offline / Client-Side</span>
      </div>

      {/* Zone 3: Actions & Versioning History */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenRollback}
          disabled={!hasRollbackAvailable}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
            hasRollbackAvailable
              ? 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-slate-700/80 cursor-pointer shadow-xs'
              : 'bg-slate-900/50 text-slate-500 border-slate-800/80 cursor-not-allowed opacity-50'
          }`}
          title="Visualizza i backup registrati ed esegui il rollback reversibile"
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Rollback & Snapshot {snapshotsCount > 0 ? `(${snapshotsCount})` : ''}</span>
        </button>

        <button
          onClick={onRename}
          disabled={!canRename || isRenaming}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shadow-sm ${
            canRename && !isRenaming
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-98'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
          title={
            selectedCount > 0
              ? `Rinomina in modo mirato solo le ${targetRenameCount} foto selezionate pronte per la rinomina`
              : 'Rinomina tutte le foto conformi e pronte sul filesystem'
          }
        >
          {isRenaming ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Rinomina in corso...</span>
            </>
          ) : renamedCount > 0 && targetRenameCount === 0 ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
              <span>Rinominati ({renamedCount})</span>
            </>
          ) : selectedCount > 0 ? (
            <>
              <Play className="w-3.5 h-3.5 text-white" />
              <span>Rinomina Selezionati ({targetRenameCount})</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-white" />
              <span>Esegui Rinomina {targetRenameCount > 0 ? `(${targetRenameCount})` : ''}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
