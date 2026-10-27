export const APP_VERSION = '0.7.1';

export type PhotoStatus =
  | 'pending'
  | 'valid'
  | 'already_ok'
  | 'collision_resolved'
  | 'warning'
  | 'error'
  | 'renamed'
  | 'rolled_back';

export type AnomalyLevel = 'notice' | 'warning' | 'error';

export interface ExifAnomaly {
  tag: string;
  tagName: string;
  message: string;
  level: AnomalyLevel;
  blocking: boolean; // true if it prevents safe renaming
}

export interface ExifTagInfo {
  tagId: string;
  tagName: string;
  group: 'IFD0' | 'ExifIFD' | 'GPS' | 'Interop' | 'MakerNotes' | 'Image';
  rawValue: unknown;
  formattedValue: string;
  isAnomaly?: boolean;
  anomalyMessage?: string;
}

export interface JpegMarker {
  marker: number;
  markerHex: string;
  name: string;
  offset: number;
  length: number;
}

export interface ParseResult {
  success: boolean;
  error?: string;
  dateTimeOriginal: string | null;
  createDate: string | null;
  modifyDate: string | null;
  subSecTime?: string | null;
  primaryDate: Date | null;
  dateSource: 'DateTimeOriginal' | 'CreateDate' | 'ModifyDate' | 'FileModified' | 'None';
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  iso?: string | number;
  fNumber?: string | number;
  exposureTime?: string;
  focalLength?: string | number;
  orientation?: number;
  width?: number;
  height?: number;
  markers: JpegMarker[];
  rawTags: Record<string, ExifTagInfo>;
  anomalies: ExifAnomaly[];
  trailingBytesAfterEOI: number;
  hasEOI: boolean;
  scanDurationMs: number;
}

export interface PhotoItem {
  id: string;
  file?: File;
  fileHandle?: FileSystemFileHandle;
  parentDirHandle?: FileSystemDirectoryHandle;
  originalName: string;
  relativePath?: string; // e.g. "Vacanze/Mare/IMG_001.JPG"
  thumbnailUrl?: string;
  extension: string;
  size: number;
  parseResult?: ParseResult;
  targetName: string;
  status: PhotoStatus;
  statusMessage?: string;
  isCollision: boolean;
  collisionIndex?: number;
  collisionCount?: number;
  collisionReason?: string;
  lastModified: number;
  renamedAt?: number;
  targetDate?: Date;
  exifNeedsUpdate?: boolean;
  secondsShifted?: number;
  collisionWithRepository?: boolean;
}

export type CollisionMode = 'exif_increment';

export interface RollbackOperation {
  id: string;
  originalName: string;
  targetName: string;
  relativePath?: string;
  size: number;
  timestamp: number;
  status: 'renamed' | 'restored' | 'failed';
  originalExifDate?: string;
  exifModified?: boolean;
  error?: string;
}

export interface RollbackSnapshot {
  id: string;
  versionNumber: number;
  createdAt: number;
  folderName: string;
  totalFiles: number;
  operations: RollbackOperation[];
  batchScriptBat: string;
  batchScriptSh: string;
  manifestJson: string;
}

export interface IncrementalStats {
  total: number;
  processed: number;
  valid: number;
  alreadyOk: number;
  warnings: number;
  collisions: number;
  errors: number;
  renamed: number;
  totalBytes: number;
  averageScanDurationMs: number;
}

export type SortField =
  | 'index'
  | 'originalName'
  | 'targetName'
  | 'date'
  | 'dateSource'
  | 'camera'
  | 'size'
  | 'status'
  | 'path';

export type SortOrder = 'asc' | 'desc';
