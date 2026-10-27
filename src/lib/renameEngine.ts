import { PhotoItem, RollbackSnapshot, RollbackOperation, PhotoStatus, CollisionMode, APP_VERSION } from '../types';

/**
 * Format a Date object into standard "YYYY-MM-DD_HH-mm-ss" string.
 */
export function formatNormalizedDate(date: Date, pattern = 'YYYY-MM-DD_HH-mm-ss'): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return pattern
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('SS', seconds);
}

/**
 * Helper to get directory path scope for an item (subfolder isolation).
 * Two photos in different directories NEVER collide on disk!
 */
export function getDirectoryScope(item: PhotoItem): string {
  if (item.relativePath && item.relativePath.includes('/')) {
    return item.relativePath.substring(0, item.relativePath.lastIndexOf('/'));
  }
  return '';
}

/**
 * Fast O(1) check if a candidate filename or timestamp exists in the repository.
 * Supports exact filenames, lowercase matches, and base timestamps.
 */
function isRepositoryCollision(
  targetFilename: string,
  formattedTimestamp: string,
  repoSet?: Set<string>
): boolean {
  if (!repoSet || repoSet.size === 0) return false;
  const tLow = targetFilename.toLowerCase();
  const fLow = formattedTimestamp.toLowerCase();
  return (
    repoSet.has(tLow) ||
    repoSet.has(fLow) ||
    repoSet.has(`${fLow}.jpg`) ||
    repoSet.has(`${fLow}.jpeg`)
  );
}

/**
 * Resolves target names and handles timestamp collisions.
 *
 * CANONICAL RULE:
 * Strictly normalizes to canonical YYYY-MM-DD_HH-MM-SS.jpg without _001/_002 suffixes.
 * Detects duplicate timestamps across the whole set and compares against an optional
 * central Repository directory (supporting 20k+ photos with O(1) lookups).
 * If a timestamp is already taken (in set or repository), sequential photos are shifted +1s, +2s...,
 * their EXIF metadata is marked for in-place update, and they are renamed in lockstep with the new EXIF date.
 */
export function calculateTargetNames(
  photos: PhotoItem[],
  pattern = 'YYYY-MM-DD_HH-mm-ss',
  collisionMode: CollisionMode = 'exif_increment',
  repositoryExistingNames?: Set<string>,
  _scopeByDirectory = false
): PhotoItem[] {
  const resultMap = new Map<string, PhotoItem>();

  // Filter invalid / date-missing items first
  const validPhotos: PhotoItem[] = [];
  for (const p of photos) {
    if (!p.parseResult?.primaryDate || p.status === 'error') {
      resultMap.set(p.id, {
        ...p,
        targetName: p.originalName,
        status: 'error',
        statusMessage: p.statusMessage || 'Data mancante o file non valido: rinomina saltata',
        isCollision: false,
        exifNeedsUpdate: false,
        secondsShifted: 0,
      });
    } else {
      validPhotos.push(p);
    }
  }

  // Chronologically sort:
  // 1. Primary EXIF Date
  // 2. Sub-seconds (if available)
  // 3. Path / Original filename natural sort
  validPhotos.sort((a, b) => {
    const timeA = a.parseResult!.primaryDate!.getTime();
    const timeB = b.parseResult!.primaryDate!.getTime();
    if (timeA !== timeB) return timeA - timeB;

    const subA = parseInt(a.parseResult?.subSecTime || '0', 10);
    const subB = parseInt(b.parseResult?.subSecTime || '0', 10);
    if (!isNaN(subA) && !isNaN(subB) && subA !== subB) {
      return subA - subB;
    }

    const pathA = a.relativePath || a.originalName;
    const pathB = b.relativePath || b.originalName;
    return pathA.localeCompare(pathB, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  const usedTimestamps = new Set<string>();
  const usedTargetNames = new Set<string>();

  for (const item of validPhotos) {
    const origDate = item.parseResult!.primaryDate!;
    const origFormatted = formatNormalizedDate(origDate, pattern);
    const ext = item.extension.toLowerCase();
    const baseTargetName = `${origFormatted}${ext}`;

    let assignedDate = new Date(origDate.getTime());
    let assignedFormatted = formatNormalizedDate(assignedDate, pattern);
    let finalTargetName = `${assignedFormatted}${ext}`;

    // Check initial conflict sources
    const collidesWithRepo = isRepositoryCollision(
      baseTargetName,
      origFormatted,
      repositoryExistingNames
    );
    const collidesWithSet =
      usedTimestamps.has(origFormatted) || usedTargetNames.has(baseTargetName.toLowerCase());

    let wasShifted = false;
    const causedByRepo = collidesWithRepo;

    // Loop +1 second until unique across both the whole batch and repository archive
    while (
      usedTimestamps.has(assignedFormatted) ||
      usedTargetNames.has(finalTargetName.toLowerCase()) ||
      isRepositoryCollision(finalTargetName, assignedFormatted, repositoryExistingNames)
    ) {
      wasShifted = true;
      assignedDate = new Date(assignedDate.getTime() + 1000);
      assignedFormatted = formatNormalizedDate(assignedDate, pattern);
      finalTargetName = `${assignedFormatted}${ext}`;
    }

    usedTimestamps.add(assignedFormatted);
    usedTargetNames.add(finalTargetName.toLowerCase());

    const shiftSec = Math.round((assignedDate.getTime() - origDate.getTime()) / 1000);

    if (wasShifted) {
      resultMap.set(item.id, {
        ...item,
        targetName: finalTargetName,
        status: item.status === 'renamed' ? 'renamed' : 'collision_resolved',
        statusMessage: causedByRepo
          ? `Collisione con archivio Repository risolta (+${shiftSec}s): EXIF aggiornato a ${assignedFormatted.slice(-8)}`
          : `Collisione nel set risolta (+${shiftSec}s): EXIF aggiornato a ${assignedFormatted.slice(-8)} (nessun suffisso)`,
        isCollision: true,
        collisionIndex: shiftSec,
        collisionCount: 2,
        collisionWithRepository: causedByRepo,
        collisionReason: causedByRepo
          ? `Nome "${baseTargetName}" già presente nel Repository (archivio). Data EXIF posticipata di +${shiftSec}s (${finalTargetName}) per evitare collisioni.`
          : `Più foto scattate nello stesso secondo. Data EXIF posticipata di +${shiftSec}s (${finalTargetName}) per rispettare la nomenclatura univoca YYYY-MM-DD_HH-MM-SS.jpg senza suffissi _001/_002.`,
        targetDate: assignedDate,
        exifNeedsUpdate: true,
        secondsShifted: shiftSec,
      });
    } else if (item.originalName.toLowerCase() === finalTargetName.toLowerCase()) {
      resultMap.set(item.id, {
        ...item,
        targetName: item.originalName,
        status: item.status === 'renamed' ? 'renamed' : 'already_ok',
        statusMessage: 'Già conforme al nome standard (nessuna rinomina necessaria)',
        isCollision: false,
        collisionIndex: undefined,
        collisionCount: 1,
        collisionReason: undefined,
        collisionWithRepository: false,
        targetDate: origDate,
        exifNeedsUpdate: false,
        secondsShifted: 0,
      });
    } else {
      resultMap.set(item.id, {
        ...item,
        targetName: finalTargetName,
        status: item.status === 'renamed' ? 'renamed' : 'valid',
        statusMessage: undefined,
        isCollision: false,
        collisionIndex: undefined,
        collisionCount: 1,
        collisionReason: undefined,
        collisionWithRepository: false,
        targetDate: origDate,
        exifNeedsUpdate: false,
        secondsShifted: 0,
      });
    }
  }

  return photos.map((p) => resultMap.get(p.id) || p);
}

/**
 * Creates an exportable and executable Rollback Snapshot with versioning (v1, v2, v3...).
 */
export function createRollbackSnapshot(
  folderName: string,
  photos: PhotoItem[],
  versionNumber = 1
): RollbackSnapshot {
  const now = Date.now();
  const id = `snapshot_v${versionNumber}_${now}`;

  const operations: RollbackOperation[] = photos
    .filter((p) => p.status !== 'error' && p.status !== 'already_ok' && p.targetName !== p.originalName)
    .map((p) => {
      const origExif =
        p.parseResult?.dateTimeOriginal ||
        p.parseResult?.createDate ||
        p.parseResult?.modifyDate ||
        (p.parseResult?.primaryDate ? formatNormalizedDate(p.parseResult.primaryDate, 'YYYY:MM:DD HH:mm:ss') : undefined);
      return {
        id: p.id,
        originalName: p.originalName,
        targetName: p.targetName,
        relativePath: p.relativePath,
        size: p.size,
        timestamp: now,
        status: 'renamed' as const,
        originalExifDate: origExif,
        exifModified: Boolean(p.exifNeedsUpdate || (p.secondsShifted && p.secondsShifted > 0)),
      };
    });

  // Windows batch script (.bat)
  let bat = `@echo off\r\n`;
  bat += `:: =========================================================\r\n`;
  bat += `:: Foto Normalizer - Script di Ripristino Nomi (Windows)\r\n`;
  bat += `:: Versione Snapshot: v${versionNumber} (${id})\r\n`;
  bat += `:: Cartella: ${folderName}\r\n`;
  bat += `:: Data Creazione: ${new Date().toLocaleString()}\r\n`;
  bat += `:: Totale File Registrati per Ripristino: ${operations.length}\r\n`;
  bat += `:: =========================================================\r\n\r\n`;
  bat += `cd /d "%~dp0"\r\n`;
  bat += `echo Inizio ripristino dei nomi originali per snapshot v${versionNumber}...\r\n`;
  bat += `set COUNT=0\r\n\r\n`;

  for (const op of operations) {
    if (op.relativePath && op.relativePath.includes('/')) {
      const subDir = op.relativePath.substring(0, op.relativePath.lastIndexOf('/')).replace(/\//g, '\\');
      const targetPath = `${subDir}\\${op.targetName}`;
      bat += `if exist "${targetPath}" (\r\n`;
      bat += `  ren "${targetPath}" "${op.originalName}"\r\n`;
      bat += `  set /a COUNT+=1\r\n`;
      bat += `) else (\r\n`;
      bat += `  echo [ATTENZIONE] File non trovato: "${targetPath}"\r\n`;
      bat += `)\r\n`;
    } else {
      bat += `if exist "${op.targetName}" (\r\n`;
      bat += `  ren "${op.targetName}" "${op.originalName}"\r\n`;
      bat += `  set /a COUNT+=1\r\n`;
      bat += `) else (\r\n`;
      bat += `  echo [ATTENZIONE] File non trovato: "${op.targetName}"\r\n`;
      bat += `)\r\n`;
    }
  }

  bat += `\r\necho.\r\n`;
  bat += `echo Ripristino v${versionNumber} completato! File ripristinati: %COUNT% di ${operations.length}\r\n`;
  bat += `pause\r\n`;

  // Linux/macOS bash script (.sh)
  let sh = `#!/bin/bash\n`;
  sh += `# =========================================================\n`;
  sh += `# Foto Normalizer - Script di Ripristino Nomi (Unix/macOS)\n`;
  sh += `# Versione Snapshot: v${versionNumber} (${id})\n`;
  sh += `# Cartella: ${folderName}\n`;
  sh += `# Data Creazione: ${new Date().toISOString()}\n`;
  sh += `# Totale File Registrati per Ripristino: ${operations.length}\n`;
  sh += `# =========================================================\n\n`;
  sh += `cd "$(dirname "$0")"\n`;
  sh += `echo "Inizio ripristino dei nomi originali per snapshot v${versionNumber}..."\n`;
  sh += `COUNT=0\n\n`;

  for (const op of operations) {
    if (op.relativePath && op.relativePath.includes('/')) {
      const subDir = op.relativePath.substring(0, op.relativePath.lastIndexOf('/'));
      const targetPath = `${subDir}/${op.targetName}`;
      const originalPath = `${subDir}/${op.originalName}`;
      sh += `if [ -f "${targetPath}" ]; then\n`;
      sh += `  mv "${targetPath}" "${originalPath}"\n`;
      sh += `  COUNT=$((COUNT + 1))\n`;
      sh += `else\n`;
      sh += `  echo "[ATTENZIONE] File non trovato: ${targetPath}"\n`;
      sh += `fi\n`;
    } else {
      sh += `if [ -f "${op.targetName}" ]; then\n`;
      sh += `  mv "${op.targetName}" "${op.originalName}"\n`;
      sh += `  COUNT=$((COUNT + 1))\n`;
      sh += `else\n`;
      sh += `  echo "[ATTENZIONE] File non trovato: ${op.targetName}"\n`;
      sh += `fi\n`;
    }
  }

  sh += `\necho "Ripristino v${versionNumber} completato! File ripristinati: $COUNT di ${operations.length}"\n`;

  const manifestJson = JSON.stringify(
    {
      snapshotId: id,
      versionNumber,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      folderName,
      totalOperations: operations.length,
      operations,
    },
    null,
    2
  );

  return {
    id,
    versionNumber,
    createdAt: now,
    folderName,
    totalFiles: operations.length,
    operations,
    batchScriptBat: bat,
    batchScriptSh: sh,
    manifestJson,
  };
}

/**
 * Downloads text as a local file (e.g. rollback_v1.bat or rollback_v1.sh)
 */
export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
