import React, { useState, useMemo, useRef } from 'react';
import {
  PhotoItem,
  IncrementalStats,
  RollbackSnapshot,
  RollbackOperation,
  SortField,
  SortOrder,
  CollisionMode,
  APP_VERSION,
} from './types';
import { parseJpeg, patchJpegExifDate, formatExifDateString } from './lib/jpegParser';
import { calculateTargetNames, createRollbackSnapshot, downloadTextFile } from './lib/renameEngine';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { FileActionToolbar } from './components/FileActionToolbar';
import { PhotoTable } from './components/PhotoTable';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { RollbackModal } from './components/RollbackModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';

interface StagedEntry {
  file: File;
  handle?: FileSystemFileHandle;
  parentDir?: FileSystemDirectoryHandle;
  relPath: string;
}

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [stagedEntries, setStagedEntries] = useState<StagedEntry[]>([]);
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Filters, Sorting, and Pagination
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [sortField, setSortField] = useState<SortField>('originalName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [collisionMode, setCollisionMode] = useState<CollisionMode>('exif_increment');

  // Central Repository Archive (up to 20k+ photos)
  const [repositoryHandle, setRepositoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [repositoryFolderName, setRepositoryFolderName] = useState<string | null>(null);
  const [repositoryFileCount, setRepositoryFileCount] = useState<number>(0);
  const [repositoryNamesSet, setRepositoryNamesSet] = useState<Set<string> | null>(null);
  const [isScanningRepository, setIsScanningRepository] = useState<boolean>(false);

  // Multi-Selection State (for Targeted Rename)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);

  // Modals
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null);
  const [snapshots, setSnapshots] = useState<RollbackSnapshot[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<RollbackSnapshot | null>(null);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isCancelledRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Incremental Stats calculation
  const stats: IncrementalStats = useMemo(() => {
    let total = 0;
    let valid = 0;
    let alreadyOk = 0;
    let warnings = 0;
    let collisions = 0;
    let errors = 0;
    let renamed = 0;
    let totalBytes = 0;
    let totalScanDuration = 0;

    for (const p of photos) {
      total++;
      totalBytes += p.size;
      if (p.parseResult?.scanDurationMs) {
        totalScanDuration += p.parseResult.scanDurationMs;
      }

      if (p.isCollision || p.status === 'collision_resolved') {
        collisions++;
      }

      if (p.status === 'already_ok') {
        alreadyOk++;
      } else if (p.status === 'renamed') {
        renamed++;
      } else if (p.status === 'error') {
        errors++;
      } else if (p.status === 'collision_resolved' || p.status === 'valid') {
        valid++;
      }

      if (p.parseResult?.anomalies && p.parseResult.anomalies.length > 0) {
        warnings++;
      }
    }

    return {
      total,
      processed: total,
      valid,
      alreadyOk,
      warnings,
      collisions,
      errors,
      renamed,
      totalBytes,
      averageScanDurationMs: total > 0 ? totalScanDuration / total : 0.002,
    };
  }, [photos]);

  // Recursive directory scanner for FileSystemDirectoryHandle
  const scanDirectoryRecursive = async (
    dirHandle: FileSystemDirectoryHandle,
    recursive: boolean,
    currentPath = ''
  ): Promise<StagedEntry[]> => {
    const list: StagedEntry[] = [];
    for await (const entry of (dirHandle as any).values()) {
      if (isCancelledRef.current) break;
      if (entry.kind === 'file') {
        if (entry.name.toLowerCase().match(/\.(jpe?g)$/i)) {
          const file = await entry.getFile();
          const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          list.push({ file, handle: entry, parentDir: dirHandle, relPath });
        }
      } else if (entry.kind === 'directory' && recursive) {
        const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        const subList = await scanDirectoryRecursive(entry, recursive, nextPath);
        list.push(...subList);
      }
    }
    return list;
  };

  // Open directory via File System Access API
  const handleOpenDirectory = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-expect-error standard modern browser API
        const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker();
        setDirectoryHandle(dirHandle);
        setFolderName(dirHandle.name);

        showToast(`Lettura cartella "${dirHandle.name}" (ricorsivo: ${includeSubfolders ? 'Sì' : 'No'})...`);
        const entries = await scanDirectoryRecursive(dirHandle, includeSubfolders);

        if (entries.length === 0) {
          showToast('Nessuna immagine JPEG trovata nella cartella selezionata.');
          setStagedEntries([]);
          setPhotos([]);
          return;
        }

        setStagedEntries(entries);
        await parseStagedEntries(entries, collisionMode);
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          triggerFileInputFolder();
        }
      }
    } else {
      triggerFileInputFolder();
    }
  };

  const triggerFileInputFolder = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', 'true');
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) handleSelectFiles(files);
    };
    input.click();
  };

  // Handle standard FileList selection
  const handleSelectFiles = async (fileList: FileList) => {
    const entries: StagedEntry[] = [];
    let detectedFolder = 'File_Caricati';

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.name.toLowerCase().match(/\.(jpe?g)$/i)) continue;

      const fullRelPath = file.webkitRelativePath || file.name;
      const parts = fullRelPath.split('/');
      if (parts.length > 1) {
        detectedFolder = parts[0];
      }

      if (!includeSubfolders && parts.length > 2) {
        continue;
      }

      const subPath = parts.length > 1 ? parts.slice(1).join('/') : file.name;
      entries.push({ file, relPath: subPath });
    }

    if (entries.length === 0) {
      showToast('Nessuna immagine JPEG valida trovata.');
      return;
    }

    setFolderName(detectedFolder);
    setStagedEntries(entries);
    await parseStagedEntries(entries, collisionMode);
  };

  // Toggle include subfolders flag
  const handleToggleIncludeSubfolders = async (val: boolean) => {
    setIncludeSubfolders(val);
    if (directoryHandle) {
      showToast(`Aggiornamento scansione (sottocartelle: ${val ? 'Attive' : 'Disattive'})...`);
      const entries = await scanDirectoryRecursive(directoryHandle, val);
      setStagedEntries(entries);
      if (entries.length > 0) {
        await parseStagedEntries(entries, collisionMode);
      }
    }
  };

  // Connect and index external/central Repository directory (20k+ photos)
  const handleSelectRepository = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-expect-error standard modern browser API
        const repoDirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker();
        setIsScanningRepository(true);
        showToast(`Indicizzazione Repository "${repoDirHandle.name}" (20k+ foto)...`);

        const names = new Set<string>();
        let count = 0;

        const scanRepo = async (dir: FileSystemDirectoryHandle) => {
          for await (const entry of (dir as any).values()) {
            if (entry.kind === 'file') {
              count++;
              const lowerName = entry.name.toLowerCase();
              names.add(lowerName);
              const match = entry.name.match(/^(\d{4}[-_]\d{2}[-_]\d{2}[-_]\d{2}[-_]\d{2}[-_]\d{2})/);
              if (match) {
                names.add(match[1].toLowerCase());
              }
            } else if (entry.kind === 'directory') {
              await scanRepo(entry);
            }
          }
        };

        await scanRepo(repoDirHandle);

        setRepositoryHandle(repoDirHandle);
        setRepositoryFolderName(repoDirHandle.name);
        setRepositoryFileCount(count);
        setRepositoryNamesSet(names);
        setIsScanningRepository(false);

        showToast(`Repository collegato: ${count.toLocaleString()} foto caricate nell'indice.`);

        if (photos.length > 0) {
          const updated = calculateTargetNames(photos, undefined, collisionMode, names);
          setPhotos(updated);
        }
      } catch (err: unknown) {
        setIsScanningRepository(false);
        if ((err as Error).name !== 'AbortError') {
          triggerRepositoryFileInput();
        }
      }
    } else {
      triggerRepositoryFileInput();
    }
  };

  const triggerRepositoryFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', 'true');
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleIndexRepositoryFiles(files);
      }
    };
    input.click();
  };

  const handleIndexRepositoryFiles = (fileList: FileList) => {
    setIsScanningRepository(true);
    const names = new Set<string>();
    let dirName = 'Repository';
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lowerName = file.name.toLowerCase();
      names.add(lowerName);
      const match = file.name.match(/^(\d{4}[-_]\d{2}[-_]\d{2}[-_]\d{2}[-_]\d{2}[-_]\d{2})/);
      if (match) names.add(match[1].toLowerCase());

      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) dirName = parts[0];
      }
    }
    setRepositoryFolderName(dirName);
    setRepositoryFileCount(fileList.length);
    setRepositoryNamesSet(names);
    setIsScanningRepository(false);
    showToast(`Repository collegato: ${fileList.length.toLocaleString()} foto caricate nell'indice.`);

    if (photos.length > 0) {
      const updated = calculateTargetNames(photos, undefined, collisionMode, names);
      setPhotos(updated);
    }
  };

  const handleClearRepository = () => {
    setRepositoryHandle(null);
    setRepositoryFolderName(null);
    setRepositoryFileCount(0);
    setRepositoryNamesSet(null);
    showToast('Collegamento alla cartella Repository rimosso.');
    if (photos.length > 0) {
      const updated = calculateTargetNames(photos, undefined, collisionMode, undefined);
      setPhotos(updated);
    }
  };

  // Change collision mode
  const handleCollisionModeChange = (newMode: CollisionMode) => {
    setCollisionMode(newMode);
    if (photos.length > 0) {
      const updated = calculateTargetNames(photos, undefined, newMode, repositoryNamesSet || undefined);
      setPhotos(updated);
      showToast(`Regola collisioni aggiornata: ${newMode}`);
    }
  };

  // Stop ongoing scanning
  const handleStopScan = () => {
    isCancelledRef.current = true;
    showToast('Interruzione scansione in corso...');
  };

  // Multi-Selection Handlers (Click, Shift+Click, Ctrl+Click)
  const handleToggleSelectPhoto = (
    id: string,
    isShift = false,
    _isCtrl = false,
    orderedList?: PhotoItem[]
  ) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      const list = orderedList || photos;

      if (isShift && lastSelectedIdRef.current) {
        const lastIdx = list.findIndex((p) => p.id === lastSelectedIdRef.current);
        const currentIdx = list.findIndex((p) => p.id === id);

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          for (let i = start; i <= end; i++) {
            next.add(list[i].id);
          }
          return next;
        }
      }

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      lastSelectedIdRef.current = id;
      return next;
    });
  };

  const handleSelectAll = (select: boolean, list?: PhotoItem[]) => {
    const targetList = list || photos;
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (select) {
        for (const p of targetList) {
          next.add(p.id);
        }
      } else {
        for (const p of targetList) {
          next.delete(p.id);
        }
      }
      return next;
    });
  };

  const handleSelectOnlyCollisions = () => {
    const collisions = photos.filter((p) => p.isCollision || p.status === 'collision_resolved');
    setSelectedPhotoIds(new Set(collisions.map((p) => p.id)));
    showToast(`Selezionate ${collisions.length} foto con collisione oraria.`);
  };

  const handleSelectOnlyValid = () => {
    const valid = photos.filter(
      (p) => (p.status === 'valid' || p.status === 'collision_resolved') && p.targetName !== p.originalName
    );
    setSelectedPhotoIds(new Set(valid.map((p) => p.id)));
    showToast(`Selezionate ${valid.length} foto pronte per la rinomina.`);
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds(new Set());
    lastSelectedIdRef.current = null;
  };

  // Parse staged entries in batches using unified high-speed binary parser
  const parseStagedEntries = async (entries: StagedEntry[], colMode: CollisionMode) => {
    setIsProcessing(true);
    isCancelledRef.current = false;
    const chunkSize = 50;
    const accumulated: PhotoItem[] = [];

    for (let i = 0; i < entries.length; i += chunkSize) {
      if (isCancelledRef.current) {
        showToast(`Scansione interrotta dall'utente: elaborate ${accumulated.length} foto su ${entries.length}.`);
        break;
      }
      const chunk = entries.slice(i, i + chunkSize);

      for (let j = 0; j < chunk.length; j++) {
        if (isCancelledRef.current) break;
        const item = chunk[j];
        const ext = item.file.name.substring(item.file.name.lastIndexOf('.')) || '.jpg';

        try {
          const buffer = await item.file.arrayBuffer();
          const parseResult = parseJpeg(buffer);

          accumulated.push({
            id: `photo_${i + j}_${Date.now()}`,
            file: item.file,
            fileHandle: item.handle,
            parentDirHandle: item.parentDir,
            originalName: item.file.name,
            relativePath: item.relPath,
            extension: ext,
            size: item.file.size,
            parseResult,
            targetName: item.file.name,
            status: parseResult.success ? 'valid' : 'error',
            statusMessage: parseResult.error,
            isCollision: false,
            lastModified: item.file.lastModified,
          });
        } catch {
          accumulated.push({
            id: `photo_err_${i + j}`,
            file: item.file,
            fileHandle: item.handle,
            parentDirHandle: item.parentDir,
            originalName: item.file.name,
            relativePath: item.relPath,
            extension: ext,
            size: item.file.size,
            targetName: item.file.name,
            status: 'error',
            statusMessage: 'Errore durante la lettura del file',
            isCollision: false,
            lastModified: item.file.lastModified,
          });
        }
      }

      // Incremental state resolution
      const resolvedSoFar = calculateTargetNames(
        [...accumulated],
        undefined,
        colMode,
        repositoryNamesSet || undefined
      );
      setPhotos(resolvedSoFar);

      // Yield control to UI thread
      await new Promise((r) => setTimeout(r, 0));
    }

    const finalResolved = calculateTargetNames(
      accumulated,
      undefined,
      colMode,
      repositoryNamesSet || undefined
    );
    setPhotos(finalResolved);
    setIsProcessing(false);
    if (!isCancelledRef.current) {
      showToast(`Scansione completata: ${finalResolved.length} foto analizzate con successo!`);
    }
  };

  // Trigger manual analysis
  const handleStartAnalysis = async () => {
    if (stagedEntries.length > 0) {
      await parseStagedEntries(stagedEntries, collisionMode);
    } else if (directoryHandle) {
      const entries = await scanDirectoryRecursive(directoryHandle, includeSubfolders);
      setStagedEntries(entries);
      await parseStagedEntries(entries, collisionMode);
    } else {
      handleOpenDirectory();
    }
  };

  // Execute Safe Rename with Versioned Rollback Snapshot
  const handleExecuteRename = async () => {
    if (photos.length === 0) return;

    // Filter valid items that actually need renaming
    const allValidToRename = photos.filter(
      (p) => (p.status === 'valid' || p.status === 'collision_resolved') && p.targetName !== p.originalName
    );

    // Targeted selection: if items are selected, only rename selected valid items
    const isTargeted = selectedPhotoIds.size > 0;
    const validToRename = isTargeted
      ? allValidToRename.filter((p) => selectedPhotoIds.has(p.id))
      : allValidToRename;

    if (validToRename.length === 0) {
      if (isTargeted) {
        showToast('Nessuna delle foto selezionate richiede la rinomina (sono già conformi o presentano errori).');
      } else {
        showToast('Nessun file da rinominare: tutti i file sono già conformi al formato standard.');
      }
      return;
    }

    setIsRenaming(true);

    try {
      const nextVersion = snapshots.length + 1;

      // Mode A: File System Access API with direct directoryHandle
      if (directoryHandle) {
        const successfulPhotos: PhotoItem[] = [];
        let inPlaceCount = 0;
        let failCount = 0;

        const updatedPhotosMap = new Map<string, PhotoItem>();

        for (const item of validToRename) {
          if (!item.fileHandle) {
            failCount++;
            updatedPhotosMap.set(item.id, {
              ...item,
              status: 'error',
              statusMessage: 'Handle file non disponibile per la scrittura su disco.',
            });
            continue;
          }

          try {
            const targetDir = item.parentDirHandle || directoryHandle;

            // 1. Safety Check: Verify targetName doesn't already exist on disk
            let targetExists = false;
            try {
              await targetDir.getFileHandle(item.targetName, { create: false });
              targetExists = true;
            } catch {
              targetExists = false;
            }

            if (targetExists) {
              throw new Error(`File "${item.targetName}" già presente sul disco: rinomina bloccata per evitare sovrascritture.`);
            }

            // 2. Read source file binary data
            const srcFile = await item.fileHandle.getFile();
            let fileData: ArrayBuffer | Uint8Array = await srcFile.arrayBuffer();

            // 3. Patch EXIF date in JPEG if timestamp was adjusted for collision (+1s sequential)
            if (item.exifNeedsUpdate && item.targetDate) {
              const hint =
                item.parseResult?.dateTimeOriginal ||
                item.parseResult?.createDate ||
                item.parseResult?.modifyDate ||
                undefined;
              fileData = patchJpegExifDate(fileData, item.targetDate, hint);
            }

            // 4. Create target file and write binary data
            const newHandle = await targetDir.getFileHandle(item.targetName, { create: true });
            const writable = await newHandle.createWritable();
            await writable.write(fileData as any);
            await writable.close();

            // 5. Remove original file from directory ONLY AFTER write succeeds
            await targetDir.removeEntry(item.originalName);

            // 6. Obtain fresh File object from new handle
            const freshFile = await newHandle.getFile();

            // 7. Update in-memory parseResult with the new date if modified
            let updatedParseResult = item.parseResult ? { ...item.parseResult } : undefined;
            if (item.targetDate && updatedParseResult) {
              const newExifStr = formatExifDateString(item.targetDate);
              updatedParseResult.primaryDate = item.targetDate;
              if (updatedParseResult.dateTimeOriginal) updatedParseResult.dateTimeOriginal = newExifStr;
              if (updatedParseResult.createDate) updatedParseResult.createDate = newExifStr;
              if (updatedParseResult.modifyDate) updatedParseResult.modifyDate = newExifStr;
            }

            const updatedItem: PhotoItem = {
              ...item,
              fileHandle: newHandle,
              file: freshFile,
              parseResult: updatedParseResult,
              status: 'renamed',
              statusMessage: 'Rinominato con successo su disco',
              exifNeedsUpdate: false,
              renamedAt: Date.now(),
            };

            successfulPhotos.push(updatedItem);
            updatedPhotosMap.set(item.id, updatedItem);
            inPlaceCount++;
          } catch (renameErr) {
            failCount++;
            const errMsg = renameErr instanceof Error ? renameErr.message : 'Errore durante la scrittura su disco';
            console.warn(`Errore rinomina per ${item.originalName}:`, renameErr);
            updatedPhotosMap.set(item.id, {
              ...item,
              status: 'error',
              statusMessage: `Rinomina non riuscita: ${errMsg}`,
            });
          }
        }

        // If at least one file was renamed, generate snapshot for the succeeded operations
        if (successfulPhotos.length > 0) {
          const snapshot = createRollbackSnapshot(
            folderName || 'Fotografie',
            successfulPhotos,
            nextVersion
          );
          setSnapshots((prev) => [...prev, snapshot]);
          setCurrentSnapshot(snapshot);

          // Clear successfully renamed items from selection
          setSelectedPhotoIds((prev) => {
            const next = new Set(prev);
            for (const item of successfulPhotos) {
              next.delete(item.id);
            }
            return next;
          });
        }

        // Update overall photos state
        const updated = photos.map((p) => updatedPhotosMap.get(p.id) || p);
        setPhotos(updated);

        // Synchronize open modals
        setPreviewPhoto((prev) => (prev ? updated.find((u) => u.id === prev.id) || prev : null));
        setSelectedPhoto((prev) => (prev ? updated.find((u) => u.id === prev.id) || prev : null));

        if (failCount === 0) {
          showToast(
            isTargeted
              ? `Rinominate in modo mirato ${inPlaceCount} foto selezionate con successo! Creato snapshot v${nextVersion}.`
              : `Rinominati ${inPlaceCount} file su disco con successo! Creato snapshot v${nextVersion}.`
          );
        } else if (inPlaceCount > 0) {
          showToast(`Rinominati ${inPlaceCount} file (${failCount} non riusciti). Creato snapshot v${nextVersion} per i file rinominati.`);
        } else {
          showToast(`Nessun file rinominato a causa di errori su disco.`);
        }
      } else {
        // Mode B: File input fallback (no direct File System Access API write permissions)
        const snapshot = createRollbackSnapshot(
          folderName || 'Fotografie',
          validToRename,
          nextVersion
        );
        setSnapshots((prev) => [...prev, snapshot]);
        setCurrentSnapshot(snapshot);

        downloadTextFile(snapshot.batchScriptBat, `rollback_v${nextVersion}.bat`);
        showToast(`Browser in sola lettura: creato snapshot v${nextVersion} e scaricato script batch di ripristino.`);
      }
    } finally {
      setIsRenaming(false);
    }
  };

  // Execute Rollback for a specific snapshot
  const handleExecuteRollback = async (snap: RollbackSnapshot) => {
    setIsRollingBack(true);
    try {
      const restoredFilesMap = new Map<string, { handle: FileSystemFileHandle; file: File; parseResult?: any }>();
      let restoredCount = 0;
      let failCount = 0;

      if (directoryHandle) {
        for (const op of snap.operations) {
          if (op.status === 'failed') continue;

          try {
            const photoItem = photos.find((p) => p.id === op.id || p.targetName === op.targetName);
            const targetDir = photoItem?.parentDirHandle || directoryHandle;

            // 1. Get current handle for the target file
            const currentHandle = await targetDir.getFileHandle(op.targetName);
            const currentFile = await currentHandle.getFile();
            let fileData: ArrayBuffer | Uint8Array = await currentFile.arrayBuffer();

            // 2. Restore original EXIF date if it was modified during rename
            if (op.exifModified && op.originalExifDate) {
              fileData = patchJpegExifDate(fileData, op.originalExifDate);
            }

            // 3. Write back to original file name
            const restoredHandle = await targetDir.getFileHandle(op.originalName, { create: true });
            const writable = await restoredHandle.createWritable();
            await writable.write(fileData as any);
            await writable.close();

            // 4. Remove target file after restoration
            await targetDir.removeEntry(op.targetName);

            // 5. Get fresh File
            const restoredFile = await restoredHandle.getFile();

            // 6. Update in-memory parseResult date
            let parseRes = photoItem?.parseResult ? { ...photoItem.parseResult } : undefined;
            if (op.originalExifDate && parseRes) {
              const origDateObj = parseJpeg(fileData).primaryDate;
              parseRes.primaryDate = origDateObj;
              parseRes.dateTimeOriginal = op.originalExifDate;
            }

            restoredFilesMap.set(op.id, { handle: restoredHandle, file: restoredFile, parseResult: parseRes });
            op.status = 'restored';
            restoredCount++;
          } catch (e) {
            failCount++;
            op.status = 'failed';
            op.error = e instanceof Error ? e.message : 'Errore rollback';
            console.warn(`Rollback non riuscito su file ${op.targetName}:`, e);
          }
        }
      }

      const reverted = photos.map((p) => {
        const op = snap.operations.find((o) => o.id === p.id || o.targetName === p.targetName);
        if (op && (op.status === 'restored' || !directoryHandle)) {
          const restoredData = restoredFilesMap.get(p.id);
          return {
            ...p,
            targetName: p.originalName,
            file: restoredData?.file || p.file,
            fileHandle: restoredData?.handle || p.fileHandle,
            parseResult: restoredData?.parseResult || p.parseResult,
            status: 'rolled_back' as const,
            statusMessage: 'Ripristinato al nome e metadati originali',
            isCollision: false,
            exifNeedsUpdate: false,
            secondsShifted: 0,
          };
        }
        return p;
      });

      setPhotos(reverted);
      setPreviewPhoto((prev) => (prev ? reverted.find((u) => u.id === prev.id) || prev : null));
      setSelectedPhoto((prev) => (prev ? reverted.find((u) => u.id === prev.id) || prev : null));

      setIsRollbackModalOpen(false);
      if (restoredCount > 0) {
        showToast(`Snapshot v${snap.versionNumber} ripristinato con successo! (${restoredCount} file ripristinati su disco)`);
      } else if (!directoryHandle) {
        showToast(`Per completare il rollback fuori dal browser, esegui lo script batch rollback_v${snap.versionNumber}.bat.`);
      } else {
        showToast(`Rollback non completato (${failCount} errori): verifica i permessi o la presenza dei file.`);
      }
    } finally {
      setIsRollingBack(false);
    }
  };

  // Export Rollback Scripts
  const handleExportRollbackScripts = () => {
    const snap =
      currentSnapshot ||
      createRollbackSnapshot(folderName || 'Fotografie', photos, snapshots.length + 1);
    downloadTextFile(snap.batchScriptBat, `rollback_v${snap.versionNumber}.bat`);
    downloadTextFile(snap.batchScriptSh, `rollback_v${snap.versionNumber}.sh`);
    showToast(`Scaricati script di rollback per snapshot v${snap.versionNumber}`);
  };

  const selectedCount = selectedPhotoIds.size;
  const targetRenameCount = useMemo(() => {
    const allValid = photos.filter(
      (p) => (p.status === 'valid' || p.status === 'collision_resolved') && p.targetName !== p.originalName
    );
    if (selectedCount > 0) {
      return allValid.filter((p) => selectedPhotoIds.has(p.id)).length;
    }
    return allValid.length;
  }, [photos, selectedPhotoIds, selectedCount]);

  const canRename = targetRenameCount > 0 && stats.renamed === 0;
  const canAnalyze = stagedEntries.length > 0 || photos.length > 0 || directoryHandle !== null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        folderName={folderName}
        onRename={handleExecuteRename}
        onOpenRollback={() => setIsRollbackModalOpen(true)}
        onOpenVersionHistory={() => setIsVersionModalOpen(true)}
        hasRollbackAvailable={snapshots.length > 0 || stats.renamed > 0}
        canRename={canRename}
        isRenaming={isRenaming}
        renamedCount={stats.renamed}
        snapshotsCount={snapshots.length}
        selectedCount={selectedCount}
        targetRenameCount={targetRenameCount}
      />

      {/* Incremental Stats Bar */}
      <StatsBar stats={stats} />

      {/* Action Toolbar with Prominent Page Size & Quick Sort */}
      <FileActionToolbar
        onOpenDirectory={handleOpenDirectory}
        onSelectFiles={handleSelectFiles}
        onStartAnalysis={handleStartAnalysis}
        onStopScan={handleStopScan}
        includeSubfolders={includeSubfolders}
        onToggleIncludeSubfolders={handleToggleIncludeSubfolders}
        canAnalyze={canAnalyze}
        isProcessing={isProcessing}
        onExportRollbackScripts={handleExportRollbackScripts}
        canExportRollback={stats.valid > 0 || stats.renamed > 0}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        folderName={folderName}
        totalLoaded={stagedEntries.length || photos.length}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
        collisionMode={collisionMode}
        onCollisionModeChange={handleCollisionModeChange}
        onSelectRepository={handleSelectRepository}
        onClearRepository={handleClearRepository}
        repositoryFolderName={repositoryFolderName}
        repositoryFileCount={repositoryFileCount}
        isScanningRepository={isScanningRepository}
        collisionCount={stats.collisions}
      />

      {/* High-Density Data Grid with Sorting & Multi-Selection */}
      <PhotoTable
        photos={photos}
        selectedPhotoIds={selectedPhotoIds}
        onToggleSelectPhoto={handleToggleSelectPhoto}
        onSelectAll={handleSelectAll}
        onSelectOnlyCollisions={handleSelectOnlyCollisions}
        onSelectOnlyValid={handleSelectOnlyValid}
        onClearSelection={handleClearSelection}
        onSelectPhoto={(photo) => {
          setSelectedPhoto(photo);
          setPreviewPhoto(photo);
        }}
        onPreviewPhoto={(photo) => {
          setSelectedPhoto(photo);
          setPreviewPhoto(photo);
        }}
        selectedPhotoId={previewPhoto?.id || selectedPhoto?.id || null}
        onOpenDirectory={handleOpenDirectory}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
      />

      {/* Unified Photo Preview & EXIF Technical Inspector Modal */}
      <PhotoPreviewModal
        photo={previewPhoto || selectedPhoto}
        photos={photos}
        onClose={() => {
          setPreviewPhoto(null);
          setSelectedPhoto(null);
        }}
        onNavigate={(p) => {
          setPreviewPhoto(p);
          setSelectedPhoto(p);
        }}
      />

      {/* Rollback Management Modal with Versioning */}
      {isRollbackModalOpen && (
        <RollbackModal
          snapshots={snapshots}
          currentSnapshot={currentSnapshot}
          onSelectSnapshot={(snap) => setCurrentSnapshot(snap)}
          onExecuteRollback={handleExecuteRollback}
          isRollingBack={isRollingBack}
          onClose={() => setIsRollbackModalOpen(false)}
        />
      )}

      {/* Version History & Changelog Modal */}
      {isVersionModalOpen && (
        <VersionHistoryModal
          snapshots={snapshots}
          onClose={() => setIsVersionModalOpen(false)}
          onOpenRollback={() => {
            setIsVersionModalOpen(false);
            setIsRollbackModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
