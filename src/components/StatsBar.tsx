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
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
      {/* 1. Totale Foto */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
        <div className="p-2 rounded bg-slate-800 text-slate-300">
          <FileImage className="w-4 h-4" />
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Totale Foto</span>
          <span className="text-sm font-semibold text-slate-100 font-mono">
            {stats.total.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block">
            {formatBytes(stats.totalBytes)}
          </span>
        </div>
      </div>

      {/* 2. Da Rinominare */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
        <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <CheckCircle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Da Rinominare</span>
          <span className="text-sm font-semibold text-blue-400 font-mono">
            {stats.valid.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">Nuovo nome pronto</span>
        </div>
      </div>

      {/* 3. Già Conforme / Già OK */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
        <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Già Conforme (Skippate)</span>
          <span className="text-sm font-semibold text-emerald-400 font-mono">
            {stats.alreadyOk.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">Nome già corretto</span>
        </div>
      </div>

      {/* 4. Collisioni Risolte */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
        <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Collisioni Risolte</span>
          <span className="text-sm font-semibold text-amber-400 font-mono">
            {stats.collisions.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">Incremento EXIF +1s univoco</span>
        </div>
      </div>

      {/* 5. Errori Bloccanti */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
        <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Errori Bloccanti</span>
          <span className="text-sm font-semibold text-rose-400 font-mono">
            {stats.errors.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">Data assente o corrotto</span>
        </div>
      </div>

      {/* 6. Rinominate con Successo */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
        <div className="p-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <RotateCcw className="w-4 h-4" />
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Rinominate</span>
          <span className="text-sm font-semibold text-cyan-400 font-mono">
            {stats.renamed.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">Rollback disponibile</span>
        </div>
      </div>
    </div>
  );
};
