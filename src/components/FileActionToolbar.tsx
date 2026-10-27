import React, { useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Play,
  Square,
  FileDown,
  Search,
  Filter,
  FolderTree,
  ArrowUpDown,
  Settings2,
  Database,
  RefreshCw,
  X,
} from 'lucide-react';
import { SortField, SortOrder, CollisionMode } from '../types';

interface FileActionToolbarProps {
  onOpenDirectory: () => void;
  onSelectFiles: (files: FileList) => void;
  onStartAnalysis: () => void;
  onStopScan: () => void;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  canAnalyze: boolean;
  isProcessing: boolean;
  onExportRollbackScripts: () => void;
  canExportRollback: boolean;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  folderName: string | null;
  totalLoaded: number;
  pageSize: number | 'all';
  onPageSizeChange: (size: number | 'all') => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  collisionMode: CollisionMode;
  onCollisionModeChange: (mode: CollisionMode) => void;
  onSelectRepository: () => void;
  onClearRepository: () => void;
  repositoryFolderName: string | null;
  repositoryFileCount: number;
  isScanningRepository: boolean;
  collisionCount?: number;
}

export const FileActionToolbar: React.FC<FileActionToolbarProps> = ({
  onOpenDirectory,
  onSelectFiles,
  onStartAnalysis,
  onStopScan,
  includeSubfolders,
  onToggleIncludeSubfolders,
  canAnalyze,
  isProcessing,
  onExportRollbackScripts,
  canExportRollback,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  folderName,
  totalLoaded,
  pageSize,
  onPageSizeChange,
  sortField,
  sortOrder,
  onSortChange,
  collisionMode,
  onCollisionModeChange,
  onSelectRepository,
  onClearRepository,
  repositoryFolderName,
  repositoryFileCount,
  isScanningRepository,
  collisionCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFiles(e.target.files);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 p-2.5 sm:p-4 bg-slate-900/60 border-b border-slate-800 max-w-full">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard for folder picker
        webkitdirectory="true"
        directory="true"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Row 1: Primary Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Left: Folder Picker, Subfolders toggle, Analizza and STOP buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={onOpenDirectory}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-98"
            title="Seleziona la cartella principale contenente le fotografie"
          >
            <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-100 shrink-0" />
            <span className="truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
              {folderName ? `Cartella: ${folderName}` : 'Seleziona Cartella'}
            </span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>File Singoli</span>
          </button>

          {/* Subfolders Toggle Flag */}
          <label className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer select-none hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={includeSubfolders}
              onChange={(e) => onToggleIncludeSubfolders(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer shrink-0"
            />
            <FolderTree className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-medium whitespace-nowrap">Sottocartelle</span>
          </label>

          {/* Pulsante Analizza */}
          <button
            onClick={onStartAnalysis}
            disabled={!canAnalyze || isProcessing}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-sm ${
              canAnalyze && !isProcessing
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
            title="Avvia o riesegui la scansione e l'analisi dei metadati EXIF"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Analisi in corso...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                <span>Analizza Foto</span>
              </>
            )}
          </button>

          {/* Pulsante STOP (visibile durante la scansione) */}
          {isProcessing && (
            <button
              onClick={onStopScan}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md animate-pulse active:scale-98 whitespace-nowrap"
              title="Interrompi immediatamente l'analisi in corso"
            >
              <Square className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>STOP</span>
            </button>
          )}
        </div>

        {/* Right: Repository Archive Connection, Collision Strategy & Rollback Script Export */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          {/* Central Repository Archive (20k+ photos) */}
          {repositoryFolderName ? (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-700/60 text-xs shadow-xs">
              <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-medium hidden xs:inline">Repository:</span>
                <span
                  className="text-indigo-200 font-semibold max-w-[100px] xs:max-w-[130px] truncate"
                  title={repositoryFolderName}
                >
                  {repositoryFolderName}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-900/90 text-indigo-300 font-mono text-[10px] font-bold">
                  {repositoryFileCount.toLocaleString()}
                </span>
              </div>
              <button
                onClick={onSelectRepository}
                title="Ricarica / Aggiorna indice Repository"
                className="p-1 hover:bg-indigo-900 rounded text-indigo-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={onClearRepository}
                title="Scollega Repository"
                className="p-1 hover:bg-rose-950/80 rounded text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSelectRepository}
              disabled={isScanningRepository}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer whitespace-nowrap active:scale-98"
              title="Collega una cartella Repository / Archivio (supporta 20.000+ foto) per evitare duplicati e collisioni orarie"
            >
              {isScanningRepository ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin shrink-0" />
                  <span>Indicizzazione Repo...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="hidden sm:inline">Collega Repository (Archivio 20k+)</span>
                  <span className="sm:hidden">Repository (20k+)</span>
                </>
              )}
            </button>
          )}

          {/* Collision Mode Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300"
            title="Standard canonico Foto Normalizer: in caso di collisione oraria (nel set o con l'archivio Repository), il timestamp viene posticipato di +1s sequenziale con sincronizzazione EXIF in-place e formato YYYY-MM-DD_HH-MM-SS.jpg senza suffissi."
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 hidden sm:inline">Regola collisioni:</span>
            <span className="font-mono text-emerald-400 font-medium">Incrementa EXIF (+1s)</span>
          </div>

          {canExportRollback && (
            <button
              onClick={onExportRollbackScripts}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all cursor-pointer whitespace-nowrap"
              title="Esporta script per ripristinare i file (.bat / .sh) in caso di necessità"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Esporta Script Rollback</span>
              <span className="sm:hidden">Script Rollback</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Filter Tabs, Sort Selector, Page Size Selector, Search */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-2 border-t border-slate-850">
        {/* Left: Filter Tabs with horizontal smooth scroll on mobile */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto no-scrollbar max-w-full">
          <Filter className="w-3 h-3 text-slate-500 ml-1.5 mr-0.5 shrink-0" />
          {[
            { id: 'all', label: 'Tutti' },
            { id: 'valid', label: 'Da Rinominare' },
            { id: 'already_ok', label: 'Già OK' },
            {
              id: 'collision',
              label: (
                <span className="flex items-center gap-1.5">
                  <span>Collisioni</span>
                  {collisionCount !== undefined && collisionCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                      {collisionCount}
                    </span>
                  )}
                </span>
              ),
            },
            { id: 'error', label: 'Errori' },
            { id: 'renamed', label: 'Rinominati' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === tab.id
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Quick Sort Dropdown + Foto per Pagina Dropdown + Search Input */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400 hidden xs:inline">Ordina:</span>
            <select
              value={`${sortField}_${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('_') as [SortField, SortOrder];
                onSortChange(f, o);
              }}
              className="bg-transparent text-slate-200 text-xs font-mono focus:outline-hidden cursor-pointer"
            >
              <option value="originalName_asc" className="bg-slate-900 text-slate-200">Nome orig. (A-Z)</option>
              <option value="originalName_desc" className="bg-slate-900 text-slate-200">Nome orig. (Z-A)</option>
              <option value="targetName_asc" className="bg-slate-900 text-slate-200">Nome target (A-Z)</option>
              <option value="targetName_desc" className="bg-slate-900 text-slate-200">Nome target (Z-A)</option>
              <option value="date_asc" className="bg-slate-900 text-slate-200">Data (Più vecchia)</option>
              <option value="date_desc" className="bg-slate-900 text-slate-200">Data (Più recente)</option>
              <option value="size_asc" className="bg-slate-900 text-slate-200">Dimensione (Piccola)</option>
              <option value="size_desc" className="bg-slate-900 text-slate-200">Dimensione (Grande)</option>
              <option value="camera_asc" className="bg-slate-900 text-slate-200">Fotocamera (A-Z)</option>
              <option value="status_asc" className="bg-slate-900 text-slate-200">Stato operazione</option>
              <option value="index_asc" className="bg-slate-900 text-slate-200">Ordine iniziale (#)</option>
            </select>
          </div>

          {/* Prominent Page Size Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-400">Vedi:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                onPageSizeChange(val);
              }}
              className="bg-transparent text-slate-200 text-xs font-mono font-semibold focus:outline-hidden cursor-pointer"
              title="Scegli quante fotografie visualizzare per pagina nella tabella"
            >
              <option value={15} className="bg-slate-900 text-slate-200">15</option>
              <option value={25} className="bg-slate-900 text-slate-200">25</option>
              <option value={50} className="bg-slate-900 text-slate-200">50</option>
              <option value={100} className="bg-slate-900 text-slate-200">100</option>
              <option value={250} className="bg-slate-900 text-slate-200">250</option>
              <option value={500} className="bg-slate-900 text-slate-200">500</option>
              <option value="all" className="bg-slate-900 text-slate-200">Tutte ({totalLoaded})</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cerca foto o cartella..."
              className="w-full sm:w-52 md:w-56 pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-slate-700 transition-colors font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
