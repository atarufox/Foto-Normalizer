import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PhotoItem, APP_VERSION } from '../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Camera,
  Calendar,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  Tag,
  ShieldCheck,
  Search,
  Clock,
  Info,
} from 'lucide-react';

interface PhotoPreviewModalProps {
  photo: PhotoItem | null;
  photos: PhotoItem[];
  onClose: () => void;
  onNavigate: (photo: PhotoItem) => void;
  initialTab?: 'preview' | 'exif' | 'markers' | 'safety';
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  photo,
  photos,
  onClose,
  onNavigate,
  initialTab = 'preview',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'exif' | 'markers' | 'safety'>(initialTab);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // When photo changes, maintain current tab but reset zoom/rotation
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [photo?.id]);

  // Load photo ObjectURL with disk file handle prioritization
  useEffect(() => {
    let active = true;
    let url: string | null = null;

    async function loadPhoto() {
      if (!photo) {
        if (active) {
          setImgUrl(null);
          setImgError(false);
        }
        return;
      }

      try {
        let file = photo.file;
        if (photo.fileHandle) {
          try {
            file = await photo.fileHandle.getFile();
          } catch {
            // fallback to photo.file
          }
        }

        if (!file) {
          if (active) {
            setImgUrl(null);
            setImgError(false);
          }
          return;
        }

        url = URL.createObjectURL(file);
        if (active) {
          setImgUrl(url);
          setImgError(false);
        }
      } catch {
        if (active) {
          setImgError(true);
        }
      }
    }

    loadPhoto();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photo, photo?.file, photo?.fileHandle, photo?.status, photo?.targetName]);

  const currentIndex = photos.findIndex((p) => p.id === photo?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(photos[currentIndex - 1]);
  }, [hasPrev, currentIndex, onNavigate, photos]);

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(photos[currentIndex + 1]);
  }, [hasNext, currentIndex, onNavigate, photos]);

  // Keyboard navigation: ArrowLeft, ArrowRight, Escape
  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in search input
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        if (e.key === 'Escape') onClose();
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, handlePrev, handleNext, onClose]);

  if (!photo) return null;

  const result = photo.parseResult;
  const rawTags = result?.rawTags ? Object.values(result.rawTags) : [];
  const markers = result?.markers || [];
  const anomalies = result?.anomalies || [];

  const filteredTags = rawTags.filter(
    (t) =>
      t.tagName.toLowerCase().includes(tagSearch.toLowerCase()) ||
      t.tagId.toLowerCase().includes(tagSearch.toLowerCase()) ||
      t.formattedValue.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const isCollision = Boolean(photo.isCollision);
  const isRepoCollision = Boolean(photo.collisionWithRepository);

  return (
    <div
      onClick={(e) => {
        // Click outside the modal card closes the preview and returns to home screen
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xs select-none animate-in fade-in duration-150 cursor-pointer"
      title="Fai click sullo sfondo per chiudere e tornare alla home"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`cursor-default relative w-full ${
          isExpanded ? 'max-w-7xl h-[96vh]' : 'max-w-6xl h-[92vh]'
        } bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200`}
      >
        
        {/* Top Header: File Names, Navigation & Close Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-800 bg-slate-950">
          {/* File Identifiers */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <FileImage className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-100 font-mono truncate max-w-[280px] sm:max-w-md">
                  {photo.status === 'renamed' ? photo.targetName : photo.originalName}
                </h3>

                {/* Index badge */}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {currentIndex + 1} di {photos.length}
                </span>

                {/* Status Badges */}
                {photo.status === 'renamed' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                    Rinominato su disco
                  </span>
                )}
                {photo.status === 'already_ok' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Già conforme
                  </span>
                )}
                {isCollision && (
                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 ${
                      isRepoCollision
                        ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40'
                        : 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>
                      {isRepoCollision
                        ? `+${photo.secondsShifted}s (Repo)`
                        : photo.secondsShifted
                        ? `+${photo.secondsShifted}s EXIF`
                        : 'Collisione risolta'}
                    </span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                {photo.status === 'renamed' ? (
                  <span>
                    Origine: <span className="text-slate-300">{photo.originalName}</span>
                  </span>
                ) : (
                  <span>
                    Nuovo nome target:{' '}
                    <span className="text-emerald-400 font-semibold">{photo.targetName}</span>
                  </span>
                )}
                {photo.relativePath && photo.relativePath.includes('/') && (
                  <span className="text-slate-500 ml-2">
                    · Sottocartella: {photo.relativePath.substring(0, photo.relativePath.lastIndexOf('/'))}/
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Prev / Next Navigator & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Foto precedente (Freccia Sinistra)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Foto successiva (Freccia Destra)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Chiudi visualizzatore e torna alla home (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Anteprima & Dettagli, Tag EXIF, Marcatori, Diagnostica */}
        <div className="flex items-center justify-between px-6 pt-2.5 pb-2 border-b border-slate-800 bg-slate-950/70 text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'preview'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileImage className="w-3.5 h-3.5 text-blue-400" />
              <span>Anteprima & Dettagli</span>
            </button>

            <button
              onClick={() => setActiveTab('exif')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'exif'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tutti i Tag EXIF ({rawTags.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('markers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'markers'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Marcatori Binari JPEG ({markers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('safety')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'safety'
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Diagnostica & Sicurezza ({anomalies.length} note)</span>
            </button>
          </div>

          {/* Quick Expand Toggle in tab line */}
          {activeTab === 'preview' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isExpanded
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isExpanded ? 'Riduci visualizzazione a due colonne' : 'Ingrandisci foto a dimensione massima'}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Mostra Scheda Dettagli</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Ingrandisci Foto</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modal Main Area */}
        <div className="flex-1 overflow-auto bg-slate-900/60 p-3 sm:p-5">
          
          {/* TAB 1: Unified Preview & Technical Details */}
          {activeTab === 'preview' && (
            <div className={`grid grid-cols-1 ${isExpanded ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-5 h-full items-stretch`}>
              
              {/* Photo Canvas (Takes 12 cols when expanded, or 7 cols in split mode) */}
              <div
                className={`${
                  isExpanded ? 'lg:col-span-1' : 'lg:col-span-7'
                } flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner min-h-[380px] transition-all`}
              >
                
                {/* Canvas Floating Controls */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/70 text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>Zoom: {Math.round(zoom * 100)}%</span>
                    {rotation !== 0 && <span>· {rotation}°</span>}
                    {isExpanded && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold font-sans">
                        Modalità Ingrandita
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Ingrandisci (Zoom In)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Rimpicciolisci (Zoom Out)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setZoom(1);
                        setRotation(0);
                      }}
                      className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Ripristina 100%"
                    >
                      1:1
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Ruota di 90° in senso orario"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-800 mx-1" />

                    {/* Expand / Minimize button */}
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        isExpanded
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300'
                      }`}
                      title={isExpanded ? 'Riduci a vista divisa' : 'Fai click per vedere la foto più grande'}
                    >
                      {isExpanded ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Riduci</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ingrandisci</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Canvas Viewport */}
                <div className="relative flex-1 flex items-center justify-center overflow-auto p-4 bg-radial from-slate-900 to-slate-950">
                  {/* Previous / Next floating arrows on canvas */}
                  <button
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    className="absolute left-3 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 disabled:opacity-10 disabled:cursor-not-allowed border border-slate-700/60 backdrop-blur transition-all cursor-pointer shadow-lg active:scale-95"
                    title="Foto precedente (Freccia Sinistra)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="absolute right-3 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 disabled:opacity-10 disabled:cursor-not-allowed border border-slate-700/60 backdrop-blur transition-all cursor-pointer shadow-lg active:scale-95"
                    title="Foto successiva (Freccia Destra)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {imgUrl && !imgError ? (
                    <div className="relative max-h-full max-w-full flex items-center justify-center group/img">
                      <img
                        src={imgUrl}
                        alt={photo.originalName}
                        onClick={() => setIsExpanded(!isExpanded)}
                        onError={() => setImgError(true)}
                        style={{
                          transform: `scale(${zoom}) rotate(${rotation}deg)`,
                          transition: 'transform 0.15s ease-out',
                        }}
                        className={`max-w-full object-contain rounded-lg shadow-2xl select-none transition-all ${
                          isExpanded
                            ? 'max-h-[73vh] cursor-zoom-out'
                            : 'max-h-[58vh] cursor-zoom-in group-hover/img:brightness-105'
                        }`}
                        title={
                          isExpanded
                            ? 'Fai click per ridurre la foto e mostrare i dettagli tecnici'
                            : 'Fai click sull\'immagine per vederla ingrandita a dimensione massima'
                        }
                      />
                      {!isExpanded && (
                        <div
                          onClick={() => setIsExpanded(true)}
                          className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 hover:bg-black/80 backdrop-blur text-white text-[10px] font-medium border border-white/10 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer flex items-center gap-1 shadow-md pointer-events-none"
                        >
                          <Maximize2 className="w-3 h-3 text-emerald-400" />
                          <span>Clicca per ingrandire</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center max-w-sm">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-3">
                        <Camera className="w-7 h-7 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 mb-1">
                        Anteprima Immagine
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        File sintetico o formati RAW/TIFF non decodificabili direttamente nel browser. Tutti i metadati EXIF e marcatori binari sono stati estratti correttamente.
                      </p>
                    </div>
                  )}
                </div>

                {/* Floating Bottom Info Bar in Expanded Mode */}
                {isExpanded && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-slate-800/80 bg-slate-900/80 text-xs text-slate-300 font-mono">
                    <div className="flex items-center gap-3">
                      <span>{result?.dateTimeOriginal || result?.createDate || 'Senza data'}</span>
                      {result?.cameraModel && (
                        <span>· {result.cameraMake ? `${result.cameraMake} ${result.cameraModel}` : result.cameraModel}</span>
                      )}
                      {result?.width && result?.height && <span>· {result.width} × {result.height} px</span>}
                    </div>

                    <button
                      onClick={() => setIsExpanded(false)}
                      className="text-emerald-400 hover:text-emerald-300 font-sans text-xs underline cursor-pointer"
                    >
                      Mostra scheda tecnica completa →
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Unified Technical Specifications (Hidden in expanded mode) */}
              {!isExpanded && (
                <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto">
                
                {/* Collision Alert Box if collision detected */}
                {isCollision && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${
                      isRepoCollision
                        ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          isRepoCollision ? 'text-indigo-400' : 'text-amber-400'
                        } shrink-0`}
                      />
                      <span>
                        {isRepoCollision
                          ? 'Collisione Rilevata con Archivio Repository'
                          : 'Risoluzione Collisione Oraria (+1s EXIF)'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {photo.collisionReason ||
                        (photo.secondsShifted
                          ? `Il timestamp è stato incrementato di +${photo.secondsShifted}s per preservare la nomenclatura univoca standard YYYY-MM-DD_HH-MM-SS.jpg senza suffissi.`
                          : 'Collisione oraria risolta automaticamente.')}
                    </p>
                    {photo.secondsShifted !== undefined && photo.secondsShifted > 0 && (
                      <div className="mt-2 text-[10px] font-mono flex items-center gap-1.5 bg-black/30 p-2 rounded-lg border border-white/5">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>I tag binari DateTimeOriginal verranno sincronizzati a +{photo.secondsShifted}s</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Technical Specs Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <FileImage className="w-3.5 h-3.5 text-slate-500" />
                      Nome Originale:
                    </span>
                    <span className="text-slate-200 font-semibold truncate max-w-[200px]" title={photo.originalName}>
                      {photo.originalName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Nuovo Nome Target:
                    </span>
                    <span className="text-emerald-400 font-semibold truncate max-w-[200px]" title={photo.targetName}>
                      {photo.targetName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Data di Scatto:
                    </span>
                    <span className="text-slate-200">
                      {result?.dateTimeOriginal || result?.createDate || result?.modifyDate || 'Non rilevata'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      Fonte Data:
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      {result?.dateSource || 'Nessuna'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      Fotocamera:
                    </span>
                    <span className="text-slate-200 truncate max-w-[200px]">
                      {result?.cameraMake ? `${result.cameraMake} ${result.cameraModel}` : result?.cameraModel || '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Risoluzione:
                    </span>
                    <span className="text-slate-200">
                      {result?.width && result?.height ? `${result.width} × ${result.height} px` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="text-slate-400 font-sans">Esposizione:</span>
                    <span className="text-slate-300 text-[11px]">
                      {result?.iso ? `ISO ${result.iso}` : ''}
                      {result?.fNumber ? ` · f/${result.fNumber}` : ''}
                      {result?.exposureTime ? ` · ${result.exposureTime}s` : ''}
                      {!result?.iso && !result?.fNumber && !result?.exposureTime && '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Dimensione File:</span>
                    <span className="text-slate-200">{formatBytes(photo.size)}</span>
                  </div>
                </div>

                {/* Quick Navigation to other technical tabs */}
                <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                  <button
                    onClick={() => setActiveTab('exif')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer text-center"
                  >
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tutti i Tag EXIF ({rawTags.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('markers')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-indigo-300 transition-colors cursor-pointer text-center"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Marcatori JPEG ({markers.length})</span>
                  </button>
                </div>
              </div>
            )}
            </div>
          )}

          {/* TAB 2: All EXIF Tags */}
          {activeTab === 'exif' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Tag EXIF estratti dal segmento APP1 TIFF in scansione binaria ({filteredTags.length} di {rawTags.length}):
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Cerca per nome, tag ID o valore..."
                    className="w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 font-mono focus:outline-hidden focus:border-slate-700"
                  />
                </div>
              </div>

              {rawTags.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-xs bg-slate-950 rounded-xl border border-slate-800">
                  Nessun metadato EXIF trovato in questo file.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 w-28">Tag ID</th>
                        <th className="py-2.5 px-4 w-52">Nome Tag</th>
                        <th className="py-2.5 px-4 w-28">Gruppo</th>
                        <th className="py-2.5 px-4">Valore Rilevato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {filteredTags.map((t) => (
                        <tr key={t.tagId} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-2 px-4 text-slate-400 text-[11px]">{t.tagId}</td>
                          <td className="py-2 px-4 text-slate-200 font-medium">{t.tagName}</td>
                          <td className="py-2 px-4 text-slate-500 text-[11px]">{t.group}</td>
                          <td className="py-2 px-4 text-slate-100">
                            <span className="truncate max-w-lg block" title={t.formattedValue}>
                              {t.formattedValue || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JPEG Markers */}
          {activeTab === 'markers' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Struttura binaria dei marcatori JPEG identificati durante la scansione diretta:
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 w-28">Marcatore</th>
                      <th className="py-2.5 px-4 w-56">Descrizione Segmento</th>
                      <th className="py-2.5 px-4 w-32">Offset Byte</th>
                      <th className="py-2.5 px-4">Lunghezza Segmento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                    {markers.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50">
                        <td className="py-2 px-4 font-semibold text-emerald-400">{m.markerHex}</td>
                        <td className="py-2 px-4 text-slate-200">{m.name}</td>
                        <td className="py-2 px-4 text-slate-400">{m.offset.toLocaleString()}</td>
                        <td className="py-2 px-4 text-slate-400">
                          {m.length > 0 ? `${m.length.toLocaleString()} byte` : 'Marcatore singolo'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result?.trailingBytesAfterEOI && result.trailingBytesAfterEOI > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Dati rilevati oltre EOI (post-EOI)</span>
                    Questo file contiene {result.trailingBytesAfterEOI} byte extra dopo il marcatore finale 0xFFD9. Vengono preservati intatti durante la rinomina.
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: Diagnostics & Safety */}
          {activeTab === 'safety' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Check 1: SOI */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-200 block">Intestazione JPEG (SOI 0xFFD8)</span>
                    <span className="text-slate-400 text-[11px]">File riconosciuto e conforme allo standard</span>
                  </div>
                </div>

                {/* Check 2: Date Validity */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  {result?.primaryDate ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-slate-200 block">Data di Scatto Verificata</span>
                    <span className="text-slate-400 text-[11px]">
                      {result?.primaryDate
                        ? `Rilevata tramite ${result.dateSource}: ${result.dateTimeOriginal || result.createDate}`
                        : 'Mancante: la rinomina automatica è bloccata per sicurezza'}
                    </span>
                  </div>
                </div>

                {/* Check 3: Collision Check */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  {isCollision ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-slate-200 block">Collisioni Nomi & Timestamp</span>
                    <span className="text-slate-400 text-[11px]">
                      {isCollision
                        ? isRepoCollision
                          ? `Collisione con archivio esterno: risolta con incremento +${photo.secondsShifted}s`
                          : `Collisione interna: risolta con incremento +${photo.secondsShifted || 1}s EXIF`
                        : 'Nessuna collisione: nome orario univoco'}
                    </span>
                  </div>
                </div>

                {/* Check 4: End Of Image */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  {result?.hasEOI ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-slate-200 block">Marcatore di Chiusura (EOI 0xFFD9)</span>
                    <span className="text-slate-400 text-[11px]">
                      {result?.hasEOI ? 'Marcatore finale presente' : 'File troncato o incompleto'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Anomaly list */}
              {anomalies.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">
                    Anomalie e Segnalazioni ({anomalies.length})
                  </h4>
                  <div className="space-y-2">
                    {anomalies.map((a, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                          a.level === 'error'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {a.level === 'error' ? (
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        )}
                        <div>
                          <span className="font-semibold block font-mono">[{a.tagName}]</span>
                          <span>{a.message}</span>
                          {a.blocking && (
                            <span className="block mt-1 font-semibold text-rose-400 text-[11px]">
                              Bloccante per la rinomina automatica.
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-400 font-semibold">Foto Normalizer v{APP_VERSION}</span>
            <span>·</span>
            <span>Usa <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">→</kbd> per scorrere</span>
            <span>·</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">Esc</kbd> o click all&apos;esterno per chiudere</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-xs font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
