import React from 'react';
import { IncrementalStats } from '../types';
import { FileImage, CheckCircle, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';

interface StatsBarProps {
  stats: IncrementalStats;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 p-2.5 sm:p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
      {/* 1. Totale Foto */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 min-w-0">
        <div className="p-1.5 sm:p-2 rounded bg-slate-800 text-slate-300 shrink-0">
          <FileImage className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-slate-400 block text-[10px] sm:text-[11px] truncate">Totale Foto</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-100 font-mono block">
            {stats.total.toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono block truncate">
            {formatBytes(stats.totalBytes)}
          </span>
        </div>
      </div>

      {/* 2. Da Rinominare */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 min-w-0">
        <div className="p-1.5 sm:p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-slate-400 block text-[10px] sm:text-[11px] truncate">Da Rinominare</span>
          <span className="text-xs sm:text-sm font-semibold text-blue-400 font-mono block">
            {stats.valid.toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">Nuovo nome pronto</span>
        </div>
      </div>

      {/* 3. Già Conforme / Già OK */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 min-w-0">
        <div className="p-1.5 sm:p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-slate-400 block text-[10px] sm:text-[11px] truncate" title="Già Conforme (Skippate)">Già Conforme</span>
          <span className="text-xs sm:text-sm font-semibold text-emerald-400 font-mono block">
            {stats.alreadyOk.toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">Nome già corretto</span>
        </div>
      </div>

      {/* 4. Collisioni Risolte */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 min-w-0">
        <div className="p-1.5 sm:p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-slate-400 block text-[10px] sm:text-[11px] truncate">Collisioni Risolte</span>
          <span className="text-xs sm:text-sm font-semibold text-amber-400 font-mono block">
            {stats.collisions.toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate" title="Incremento EXIF +1s univoco">+1s EXIF univoco</span>
        </div>
      </div>

      {/* 5. Errori Bloccanti */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 min-w-0">
        <div className="p-1.5 sm:p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
          <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-slate-400 block text-[10px] sm:text-[11px] truncate">Errori Bloccanti</span>
          <span className="text-xs sm:text-sm font-semibold text-rose-400 font-mono block">
            {stats.errors.toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">Data assente/corrotto</span>
        </div>
      </div>

      {/* 6. Rinominate con Successo */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 min-w-0">
        <div className="p-1.5 sm:p-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-slate-400 block text-[10px] sm:text-[11px] truncate">Rinominate</span>
          <span className="text-xs sm:text-sm font-semibold text-cyan-400 font-mono block">
            {stats.renamed.toLocaleString()}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">Rollback pronto</span>
        </div>
      </div>
    </div>
  );
};
