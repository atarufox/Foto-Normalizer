import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PhotoItem, SortField, SortOrder } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Camera,
  FolderOpen,
  FolderTree,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileImage,
  Clock,
  Check,
  MousePointerClick,
} from 'lucide-react';

interface PhotoTableProps {
  photos: PhotoItem[];
  selectedPhotoIds: Set<string>;
  onToggleSelectPhoto: (
    id: string,
    isShift?: boolean,
    isCtrl?: boolean,
    orderedList?: PhotoItem[]
  ) => void;
  onSelectAll: (select: boolean, list?: PhotoItem[]) => void;
  onSelectOnlyCollisions?: () => void;
  onSelectOnlyValid?: () => void;
  onClearSelection?: () => void;
  onSelectPhoto: (photo: PhotoItem) => void;
  onPreviewPhoto: (photo: PhotoItem) => void;
  selectedPhotoId: string | null;
  onOpenDirectory: () => void;
  activeFilter: string;
  searchQuery: string;
  pageSize: number | 'all';
  onPageSizeChange: (size: number | 'all') => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export const PhotoTable: React.FC<PhotoTableProps> = ({
  photos,
  selectedPhotoIds,
  onToggleSelectPhoto,
  onSelectAll,
  onSelectOnlyCollisions,
  onSelectOnlyValid,
  onClearSelection,
  onSelectPhoto,
  onPreviewPhoto,
  selectedPhotoId,
  onOpenDirectory,
  activeFilter,
  searchQuery,
  pageSize,
  onPageSizeChange,
  sortField,
  sortOrder,
  onSortChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Check if any photos have relative subfolder paths
  const hasSubfolders = useMemo(() => {
    return photos.some((p) => p.relativePath && p.relativePath.includes('/'));
  }, [photos]);

  // Handle column header sort toggle
  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
    setCurrentPage(1);
  };

  // 1. Filter photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((item) => {
      // Filter tab
      if (activeFilter === 'already_ok' && item.status !== 'already_ok') return false;
      if (activeFilter === 'valid' && item.status !== 'valid' && item.status !== 'collision_resolved')
        return false;
      if (activeFilter === 'collision' && !item.isCollision) return false;
      if (activeFilter === 'error' && item.status !== 'error') return false;
      if (activeFilter === 'renamed' && item.status !== 'renamed') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesOriginal = item.originalName.toLowerCase().includes(q);
        const matchesTarget = item.targetName.toLowerCase().includes(q);
        const matchesPath = item.relativePath?.toLowerCase().includes(q);
        const matchesCamera =
          item.parseResult?.cameraModel?.toLowerCase().includes(q) ||
          item.parseResult?.cameraMake?.toLowerCase().includes(q);
        if (!matchesOriginal && !matchesTarget && !matchesPath && !matchesCamera) return false;
      }

      return true;
    });
  }, [photos, activeFilter, searchQuery]);

  // 2. Sort photos
  const sortedPhotos = useMemo(() => {
    // Map with original indices for index sorting
    const list = filteredPhotos.map((item, originalIdx) => ({
      item,
      originalIdx,
    }));

    const modifier = sortOrder === 'asc' ? 1 : -1;

    list.sort((aObj, bObj) => {
      const a = aObj.item;
      const b = bObj.item;

      switch (sortField) {
        case 'index':
          return modifier * (aObj.originalIdx - bObj.originalIdx);

        case 'originalName':
          return modifier * a.originalName.localeCompare(b.originalName, undefined, { numeric: true, sensitivity: 'base' });

        case 'targetName':
          return modifier * a.targetName.localeCompare(b.targetName, undefined, { numeric: true, sensitivity: 'base' });

        case 'date': {
          const timeA = a.parseResult?.primaryDate ? a.parseResult.primaryDate.getTime() : a.lastModified || 0;
          const timeB = b.parseResult?.primaryDate ? b.parseResult.primaryDate.getTime() : b.lastModified || 0;
          return modifier * (timeA - timeB);
        }

        case 'dateSource': {
          const srcA = a.parseResult?.dateSource || '';
          const srcB = b.parseResult?.dateSource || '';
          return modifier * srcA.localeCompare(srcB);
        }

        case 'camera': {
          const camA = `${a.parseResult?.cameraMake || ''} ${a.parseResult?.cameraModel || ''}`.trim();
          const camB = `${b.parseResult?.cameraMake || ''} ${b.parseResult?.cameraModel || ''}`.trim();
          return modifier * camA.localeCompare(camB);
        }

        case 'path': {
          const pathA = a.relativePath || '';
          const pathB = b.relativePath || '';
          return modifier * pathA.localeCompare(pathB);
        }

        case 'size':
          return modifier * (a.size - b.size);

        case 'status':
          return modifier * a.status.localeCompare(b.status);

        default:
          return 0;
      }
    });

    return list.map((obj) => obj.item);
  }, [filteredPhotos, sortField, sortOrder]);

  // 3. Paginate
  const effectivePageSize = pageSize === 'all' ? sortedPhotos.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedPhotos.length / effectivePageSize));

  const pageItems = useMemo(() => {
    if (pageSize === 'all') return sortedPhotos;
    const start = (currentPage - 1) * effectivePageSize;
    return sortedPhotos.slice(start, start + effectivePageSize);
  }, [sortedPhotos, currentPage, effectivePageSize, pageSize]);

  // Multi-selection state calculations
  const selectedInFilterCount = useMemo(() => {
    let count = 0;
    for (const p of filteredPhotos) {
      if (selectedPhotoIds.has(p.id)) count++;
    }
    return count;
  }, [filteredPhotos, selectedPhotoIds]);

  const isAllFilterSelected = filteredPhotos.length > 0 && selectedInFilterCount === filteredPhotos.length;
  const isPartiallySelected = selectedInFilterCount > 0 && !isAllFilterSelected;

  // Sync indeterminate state to header checkbox DOM element
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  // Count ready to rename & collisions in current set
  const validCount = useMemo(() => {
    return photos.filter(
      (p) => (p.status === 'valid' || p.status === 'collision_resolved') && p.targetName !== p.originalName
    ).length;
  }, [photos]);

  const collisionCount = useMemo(() => {
    return photos.filter((p) => p.isCollision || p.status === 'collision_resolved').length;
  }, [photos]);

  // Generate thumbnail object URLs for visible items
  useEffect(() => {
    let active = true;
    const urls = new Map<string, string>();

    async function loadThumbnails() {
      for (const item of pageItems) {
        try {
          let file = item.file;
          if (item.fileHandle) {
            try {
              file = await item.fileHandle.getFile();
            } catch {
              // fallback
            }
          }
          if (file) {
            const url = URL.createObjectURL(file);
            urls.set(item.id, url);
          }
        } catch {
          // ignore
        }
      }
      if (active) {
        setThumbnailUrls(urls);
      }
    }

    loadThumbnails();

    return () => {
      active = false;
      urls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
    };
  }, [pageItems]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 inline ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400 inline ml-1" />
    );
  };

  if (photos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
          <FolderOpen className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          Nessuna cartella caricata
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Fai click su &quot;Seleziona Cartella&quot; per caricare la directory contenente le tue fotografie. Le foto verranno analizzate a piena velocità in locale.
        </p>
        <button
          onClick={onOpenDirectory}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm active:scale-98"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Seleziona Cartella dal Computer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Targeted Selection Floating Banner */}
      {selectedPhotoIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-6 py-2 bg-emerald-950/60 border-b border-emerald-800/50 text-xs text-emerald-200 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-slate-950 font-bold font-mono text-[11px] shadow-xs">
              {selectedPhotoIds.size.toLocaleString()}
            </span>
            <span className="font-semibold text-white text-xs">
              {selectedPhotoIds.size === 1 ? '1 foto selezionata' : `${selectedPhotoIds.size.toLocaleString()} foto selezionate`}
            </span>
            <span className="text-emerald-500/50 hidden md:inline">·</span>
            <span className="text-[11px] text-emerald-300/80 hidden lg:inline">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200">Shift + Click</kbd> seleziona intervallo · <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200">Ctrl + Click</kbd> selezione multipla
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {onSelectOnlyValid && validCount > 0 && (
              <button
                onClick={onSelectOnlyValid}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-700/50 text-[11px] font-medium transition-colors cursor-pointer"
                title="Seleziona solo le foto che necessitano di rinomina"
              >
                Solo Pronte ({validCount})
              </button>
            )}
            {onSelectOnlyCollisions && collisionCount > 0 && (
              <button
                onClick={onSelectOnlyCollisions}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-700/50 text-[11px] font-medium transition-colors cursor-pointer"
                title="Seleziona solo le foto con collisione d'orario"
              >
                Solo Coll. ({collisionCount})
              </button>
            )}
            <button
              onClick={() => onSelectAll(true, sortedPhotos)}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
              title="Seleziona tutte le foto visibili nella vista corrente"
            >
              Tutte ({sortedPhotos.length})
            </button>
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="px-2 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-600/50 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Deseleziona
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Container with native horizontal/vertical smooth scrolling */}
      <div className="flex-1 overflow-x-auto overflow-y-auto w-full">
        <table className="min-w-[850px] w-full text-left text-xs border-collapse">
          <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider select-none">
            <tr>
              {/* Checkbox Column for Multi-Selection */}
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={isAllFilterSelected}
                  onChange={(e) => onSelectAll(e.target.checked, sortedPhotos)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer accent-emerald-500 align-middle"
                  title={
                    isAllFilterSelected
                      ? 'Deseleziona tutte le foto visibili'
                      : 'Seleziona tutte le foto visibili per la rinomina mirata'
                  }
                />
              </th>

              {/* Index Column (#) */}
              <th
                onClick={() => handleHeaderClick('index')}
                className="py-2.5 px-3 w-12 text-center cursor-pointer hover:text-slate-200 transition-colors group"
                title="Ordina per sequenza originale"
              >
                <span className="flex items-center justify-center">
                  <span>#</span>
                  {renderSortIndicator('index')}
                </span>
              </th>

              {/* Photo Preview Column */}
              <th className="py-2.5 px-3 w-16 text-center">Anteprima</th>

              {/* Sottocartella (sortable) */}
              {hasSubfolders && (
                <th
                  onClick={() => handleHeaderClick('path')}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
                >
                  <span className="flex items-center">
                    <span>Sottocartella</span>
                    {renderSortIndicator('path')}
                  </span>
                </th>
              )}

              {/* Nome Originale (sortable) */}
              <th
                onClick={() => handleHeaderClick('originalName')}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center">
                  <span>Nome Originale</span>
                  {renderSortIndicator('originalName')}
                </span>
              </th>

              {/* Nuovo Nome Target (sortable) */}
              <th
                onClick={() => handleHeaderClick('targetName')}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center">
                  <span>Nuovo Nome Target</span>
                  {renderSortIndicator('targetName')}
                </span>
              </th>

              {/* Data di Scatto (sortable) */}
              <th
                onClick={() => handleHeaderClick('date')}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center">
                  <span>Data di Scatto</span>
                  {renderSortIndicator('date')}
                </span>
              </th>

              {/* Fonte Data (sortable) */}
              <th
                onClick={() => handleHeaderClick('dateSource')}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center">
                  <span>Fonte</span>
                  {renderSortIndicator('dateSource')}
                </span>
              </th>

              {/* Fotocamera (sortable) */}
              <th
                onClick={() => handleHeaderClick('camera')}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center">
                  <span>Fotocamera</span>
                  {renderSortIndicator('camera')}
                </span>
              </th>

              {/* Dimensione (sortable) */}
              <th
                onClick={() => handleHeaderClick('size')}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center">
                  <span>Dimensione</span>
                  {renderSortIndicator('size')}
                </span>
              </th>

              {/* Stato (sortable) */}
              <th
                onClick={() => handleHeaderClick('status')}
                className="py-2.5 px-4 cursor-pointer hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center">
                  <span>Stato Normalizzazione</span>
                  {renderSortIndicator('status')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/60 font-sans">
            {pageItems.map((item, idx) => {
              const rowIndex =
                pageSize === 'all' ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;
              const isInspected = item.id === selectedPhotoId;
              const isChecked = selectedPhotoIds.has(item.id);
              const thumbUrl = thumbnailUrls.get(item.id);

              const subDir =
                item.relativePath && item.relativePath.includes('/')
                  ? item.relativePath.substring(0, item.relativePath.lastIndexOf('/'))
                  : null;

              const isCollision = Boolean(item.isCollision);
              const isRepoCollision = Boolean(item.collisionWithRepository);

              return (
                <tr
                  key={item.id}
                  onClick={(e) => {
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      onToggleSelectPhoto(item.id, e.shiftKey, e.ctrlKey || e.metaKey, sortedPhotos);
                    } else {
                      onSelectPhoto(item);
                    }
                  }}
                  className={`group transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-950/40 hover:bg-emerald-950/60 border-l-4 border-emerald-400 ring-1 ring-emerald-500/30'
                      : isInspected
                      ? 'bg-slate-800/90 border-l-4 border-cyan-400 ring-1 ring-cyan-500/20'
                      : isCollision
                      ? isRepoCollision
                        ? 'bg-indigo-950/30 hover:bg-indigo-950/50 border-l-4 border-indigo-500'
                        : 'bg-amber-950/30 hover:bg-amber-950/50 border-l-4 border-amber-500'
                      : 'hover:bg-slate-900/60 border-l-4 border-transparent'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-2 px-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectPhoto(item.id, e.shiftKey, e.ctrlKey || e.metaKey, sortedPhotos);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer accent-emerald-500 align-middle"
                    />
                  </td>

                  {/* Row index with collision warning icon */}
                  <td className="py-2 px-3 text-center font-mono text-[11px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={
                          isChecked
                            ? 'text-emerald-300 font-bold'
                            : isCollision
                            ? isRepoCollision
                              ? 'text-indigo-400 font-bold'
                              : 'text-amber-400 font-bold'
                            : 'text-slate-500'
                        }
                      >
                        {rowIndex}
                      </span>
                      {isCollision && (
                        <span
                          title={
                            item.collisionReason ||
                            (item.secondsShifted
                              ? `Collisione oraria rilevata: orario posticipato di +${item.secondsShifted}s per nome univoco YYYY-MM-DD_HH-MM-SS.jpg`
                              : `Collisione oraria rilevata`)
                          }
                          className={isRepoCollision ? 'text-indigo-400' : 'text-amber-400'}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 inline shrink-0" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Photo Thumbnail Preview */}
                  <td className="py-1.5 px-3 text-center">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewPhoto(item);
                      }}
                      className="w-10 h-10 rounded-md bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center mx-auto hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/50 transition-all cursor-zoom-in group/thumb shadow-xs"
                      title="Fai click per aprire l'anteprima e la scheda tecnica della foto"
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={item.originalName}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                        />
                      ) : (
                        <FileImage className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                  </td>

                  {/* Sottocartella */}
                  {hasSubfolders && (
                    <td className="py-2 px-4 font-mono text-slate-400">
                      {subDir ? (
                        <span className="flex items-center gap-1 text-[11px] text-indigo-300/90 truncate max-w-[180px]">
                          <FolderTree className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate">{subDir}/</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                  )}

                  {/* Nome Originale */}
                  <td className="py-2 px-4 font-mono font-medium text-slate-200">
                    <span className="truncate max-w-[200px] block" title={item.originalName}>
                      {item.originalName}
                    </span>
                  </td>

                  {/* Nuovo Nome Target */}
                  <td className="py-2 px-4 font-mono">
                    {item.status === 'error' ? (
                      <span className="text-slate-500 italic">—</span>
                    ) : item.status === 'already_ok' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 font-mono">{item.targetName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Invariato
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-semibold ${
                            item.status === 'renamed'
                              ? 'text-cyan-300'
                              : isCollision
                              ? isRepoCollision
                                ? 'text-indigo-200'
                                : 'text-amber-200'
                              : 'text-emerald-300'
                          }`}
                        >
                          {item.targetName}
                        </span>
                        {isCollision && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded border shadow-xs cursor-help ${
                              isRepoCollision
                                ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40 ring-1 ring-indigo-500/30'
                                : 'bg-amber-500/25 text-amber-200 border-amber-400/40 ring-1 ring-amber-500/30'
                            }`}
                            title={
                              item.collisionReason ||
                              (item.secondsShifted
                                ? `Collisione oraria risolta: orario EXIF posticipato di +${item.secondsShifted}s per nome univoco YYYY-MM-DD_HH-MM-SS.jpg senza suffissi.`
                                : `Collisione: suffisso sequenziale progressivo #${item.collisionIndex}`)
                            }
                          >
                            <Clock className="w-3 h-3 shrink-0 text-amber-300" />
                            <span>
                              {isRepoCollision
                                ? `+${item.secondsShifted}s (Repo)`
                                : item.secondsShifted !== undefined && item.secondsShifted > 0
                                ? `+${item.secondsShifted}s EXIF`
                                : `seq _${item.collisionIndex?.toString().padStart(3, '0')}`}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Data di Scatto */}
                  <td className="py-2 px-4 font-mono text-slate-300">
                    {item.parseResult?.primaryDate ? (
                      <div className="flex flex-col">
                        <span className="truncate max-w-[170px] block">
                          {item.parseResult.dateTimeOriginal ||
                            item.parseResult.createDate ||
                            item.parseResult.modifyDate}
                        </span>
                        {isCollision && item.secondsShifted !== undefined && item.secondsShifted > 0 && (
                          <span
                            className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 ${
                              isRepoCollision ? 'text-indigo-300' : 'text-amber-300'
                            }`}
                            title={`Data e ora incrementate di +${item.secondsShifted}s (tag DateTimeOriginal sincronizzato)`}
                          >
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>Auto-regolato +{item.secondsShifted}s</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-rose-400/80 italic">Non rilevata</span>
                    )}
                  </td>

                  {/* Fonte Data */}
                  <td className="py-2 px-4 text-slate-400 font-mono text-[11px]">
                    {item.parseResult?.dateSource || 'Nessuna'}
                  </td>

                  {/* Fotocamera */}
                  <td className="py-2 px-4 text-slate-300">
                    {item.parseResult?.cameraModel ? (
                      <span className="flex items-center gap-1.5 truncate max-w-[160px]">
                        <Camera className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {item.parseResult.cameraMake
                            ? `${item.parseResult.cameraMake} ${item.parseResult.cameraModel}`
                            : item.parseResult.cameraModel}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Dimensione */}
                  <td className="py-2 px-4 font-mono text-slate-400">
                    {formatSize(item.size)}
                  </td>

                  {/* Stato Normalizzazione */}
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      {item.status === 'already_ok' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Già Conforme (Skippato)</span>
                        </span>
                      ) : item.status === 'renamed' ? (
                        <span className="inline-flex items-center gap-1.5 text-cyan-400 text-xs font-medium">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Rinominato</span>
                        </span>
                      ) : isCollision || item.status === 'collision_resolved' ? (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border ${
                            isRepoCollision
                              ? 'text-indigo-300 bg-indigo-950/60 border-indigo-500/40'
                              : 'text-amber-300 bg-amber-950/60 border-amber-500/40'
                          }`}
                          title={
                            item.collisionReason ||
                            `Timestamp regolato automaticamente di +${item.secondsShifted || 1}s per evitare collisioni`
                          }
                        >
                          <AlertTriangle
                            className={`w-3.5 h-3.5 ${
                              isRepoCollision ? 'text-indigo-400' : 'text-amber-400'
                            } shrink-0`}
                          />
                          <span>
                            {isRepoCollision
                              ? `Collisione Repo (+${item.secondsShifted}s)`
                              : item.secondsShifted
                              ? `Timestamp regolato (+${item.secondsShifted}s)`
                              : 'Collisione oraria risolta'}
                          </span>
                        </span>
                      ) : item.status === 'valid' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pronto per rinomina</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-medium"
                          title={item.statusMessage}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{item.statusMessage || 'Errore'}</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar with Page Size Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-6 py-2.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          <div className="text-[11px] sm:text-xs">
            Mostrando{' '}
            {sortedPhotos.length > 0
              ? pageSize === 'all'
                ? 1
                : (currentPage - 1) * pageSize + 1
              : 0}{' '}
            –{' '}
            {pageSize === 'all'
              ? sortedPhotos.length
              : Math.min(currentPage * pageSize, sortedPhotos.length)}{' '}
            di {sortedPhotos.length.toLocaleString()} ({photos.length.toLocaleString()} tot)
          </div>

          {/* Page Size Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] sm:text-xs">Vedi:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                onPageSizeChange(val);
                setCurrentPage(1);
              }}
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono font-semibold focus:outline-hidden focus:border-slate-700 cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value="all">Tutte ({sortedPhotos.length})</option>
            </select>
          </div>
        </div>

        {pageSize !== 'all' && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 sm:px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Prec
            </button>
            <span className="font-mono text-[11px] sm:text-xs px-1 sm:px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 sm:px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Succ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
