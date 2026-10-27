import React, { useState } from 'react';
import { RollbackSnapshot } from '../types';
import { downloadTextFile } from '../lib/renameEngine';
import {
  X,
  RotateCcw,
  FileDown,
  Terminal,
  AlertCircle,
  Copy,
  Check,
  History,
} from 'lucide-react';

interface RollbackModalProps {
  snapshots: RollbackSnapshot[];
  currentSnapshot: RollbackSnapshot | null;
  onSelectSnapshot: (snapshot: RollbackSnapshot) => void;
  onExecuteRollback: (snapshot: RollbackSnapshot) => Promise<void>;
  isRollingBack: boolean;
  onClose: () => void;
}

export const RollbackModal: React.FC<RollbackModalProps> = ({
  snapshots,
  currentSnapshot,
  onSelectSnapshot,
  onExecuteRollback,
  isRollingBack,
  onClose,
}) => {
  const [copiedType, setCopiedType] = useState<'bat' | 'sh' | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'scriptBat' | 'scriptSh'>('preview');

  const activeSnapshot = currentSnapshot || (snapshots.length > 0 ? snapshots[snapshots.length - 1] : null);

  if (!activeSnapshot) return null;

  const handleCopy = (text: string, type: 'bat' | 'sh') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const vNum = activeSnapshot.versionNumber || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-xs sm:text-base font-semibold text-slate-100 truncate">
                  Backup & Rollback
                </h3>
                <span className="text-[10px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Snapshot v{vNum}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {activeSnapshot.totalFiles} file · {new Date(activeSnapshot.createdAt).toLocaleTimeString()}
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

        {/* Snapshot Version Switcher (if multiple versions exist) */}
        {snapshots.length > 1 && (
          <div className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-slate-950/70 border-b border-slate-800 text-xs overflow-x-auto no-scrollbar">
            <span className="text-slate-500 flex items-center gap-1 font-mono shrink-0">
              <History className="w-3.5 h-3.5" />
              <span>Snapshot:</span>
            </span>
            {snapshots.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSnapshot(s)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors cursor-pointer shrink-0 ${
                  s.id === activeSnapshot.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                v{s.versionNumber} ({s.totalFiles} file)
              </button>
            ))}
          </div>
        )}

        {/* Action Tabs & Script Downloads */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 py-2 sm:py-2.5 border-b border-slate-800 bg-slate-950/50 text-xs gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'preview'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Operazioni ({activeSnapshot.operations.length})
            </button>
            <button
              onClick={() => setActiveTab('scriptBat')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'scriptBat'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Script .bat
            </button>
            <button
              onClick={() => setActiveTab('scriptSh')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'scriptSh'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Script .sh
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() =>
                downloadTextFile(activeSnapshot.batchScriptBat, `rollback_v${vNum}.bat`)
              }
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Scarica lo script per ripristinare i file su Windows da riga di comando"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              <span>.bat</span>
            </button>
            <button
              onClick={() =>
                downloadTextFile(activeSnapshot.batchScriptSh, `rollback_v${vNum}.sh`)
              }
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Scarica lo script per ripristinare i file su macOS o Linux da Terminale"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              <span>.sh</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-900/60 text-xs">
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-3 sm:p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2.5 sm:gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-[11px] sm:text-xs">
                  <span className="font-semibold block">Protezione Reversibile Snapshot v{vNum}</span>
                  Il ripristino in-app ripristina sia i nomi dei file originali sia i metadati EXIF modificati (se incrementati per collisioni). Gli script scaricabili (.bat/.sh) ripristinano i nomi dei file sul filesystem.
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-x-auto">
                <table className="min-w-[500px] w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 sm:px-4">Nome Originale</th>
                      <th className="py-2 px-3 sm:px-4">Nome Assegnato (Rinominato)</th>
                      <th className="py-2 px-3 sm:px-4 text-center">EXIF Modificato</th>
                      <th className="py-2 px-3 sm:px-4 text-center">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {activeSnapshot.operations.map((op) => (
                      <tr key={op.id} className="hover:bg-slate-850/50">
                        <td className="py-2 px-3 sm:px-4 text-emerald-400 font-medium">
                          {op.originalName}
                        </td>
                        <td className="py-2 px-3 sm:px-4 text-slate-300">{op.targetName}</td>
                        <td className="py-2 px-3 sm:px-4 text-center">
                          {op.exifModified ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Data ripristinabile
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Invariato</span>
                          )}
                        </td>
                        <td className="py-2 px-3 sm:px-4 text-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {op.status === 'restored' ? 'Ripristinato' : 'Pronto'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'scriptBat' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Terminal className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Script Windows Batch per ripristinare con doppio click:</span>
                </span>
                <button
                  onClick={() => handleCopy(activeSnapshot.batchScriptBat, 'bat')}
                  className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors cursor-pointer shrink-0 text-xs"
                >
                  {copiedType === 'bat' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia script</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 sm:p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] sm:text-xs overflow-auto max-h-96 leading-relaxed">
                {activeSnapshot.batchScriptBat}
              </pre>
            </div>
          )}

          {activeTab === 'scriptSh' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Terminal className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Script Bash per macOS e Linux (`bash rollback_v{vNum}.sh`):</span>
                </span>
                <button
                  onClick={() => handleCopy(activeSnapshot.batchScriptSh, 'sh')}
                  className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors cursor-pointer shrink-0 text-xs"
                >
                  {copiedType === 'sh' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia script</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 sm:p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] sm:text-xs overflow-auto max-h-96 leading-relaxed">
                {activeSnapshot.batchScriptSh}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950 gap-2">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
          >
            Chiudi
          </button>

          <button
            onClick={() => onExecuteRollback(activeSnapshot)}
            disabled={isRollingBack}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-all cursor-pointer shadow-sm active:scale-98"
          >
            {isRollingBack ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Ripristino in corso...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 text-white" />
                <span>Rollback Snapshot v{vNum}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
