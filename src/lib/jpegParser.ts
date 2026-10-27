import { ParseResult, JpegMarker, ExifTagInfo, ExifAnomaly } from '../types';

// JPEG Marker constants
const MARKER_SOI = 0xffd8;
const MARKER_EOI = 0xffd9;
const MARKER_SOS = 0xffda;
const MARKER_APP1 = 0xffe1;
const MARKER_SOF0 = 0xffc0;
const MARKER_SOF2 = 0xffc2;

// Known marker names for inspection
const MARKER_NAMES: Record<number, string> = {
  0xffd8: 'SOI (Start of Image)',
  0xffd9: 'EOI (End of Image)',
  0xffda: 'SOS (Start of Scan)',
  0xffdb: 'DQT (Quantization Table)',
  0xffc4: 'DHT (Huffman Table)',
  0xffc0: 'SOF0 (Baseline DCT)',
  0xffc2: 'SOF2 (Progressive DCT)',
  0xffe0: 'APP0 (JFIF)',
  0xffe1: 'APP1 (Exif / XMP)',
  0xffe2: 'APP2 (ICC Profile)',
  0xffee: 'APPE (Adobe)',
  0xfffe: 'COM (Comment)',
};

/**
 * Unified high-speed binary JPEG parser (~0.002s).
 * Scans markers directly to APP1, extracts EXIF and dimensions in one single pass.
 */
export function parseJpeg(buffer: ArrayBuffer | Uint8Array): ParseResult {
  const startTime = performance.now();
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const markers: JpegMarker[] = [];
  const rawTags: Record<string, ExifTagInfo> = {};
  const anomalies: ExifAnomaly[] = [];

  let dateTimeOriginal: string | null = null;
  let createDate: string | null = null;
  let modifyDate: string | null = null;
  let subSecTime: string | null = null;
  let cameraMake: string | undefined;
  let cameraModel: string | undefined;
  let lensModel: string | undefined;
  let iso: string | number | undefined;
  let fNumber: string | number | undefined;
  let exposureTime: string | undefined;
  let focalLength: string | number | undefined;
  let orientation: number | undefined;
  let width: number | undefined;
  let height: number | undefined;

  // 1. Check SOI (0xFFD8)
  if (bytes.length < 4 || dataView.getUint16(0, false) !== MARKER_SOI) {
    return {
      success: false,
      error: 'File non valido: marcatore JPEG SOI (0xFFD8) iniziale assente',
      dateTimeOriginal: null,
      createDate: null,
      modifyDate: null,
      subSecTime: null,
      primaryDate: null,
      dateSource: 'None',
      markers: [],
      rawTags: {},
      anomalies: [
        {
          tag: 'SOI',
          tagName: 'StartOfImage',
          message: 'Intestazione JPEG mancante o corrotta',
          level: 'error',
          blocking: true,
        },
      ],
      trailingBytesAfterEOI: 0,
      hasEOI: false,
      scanDurationMs: performance.now() - startTime,
    };
  }

  markers.push({
    marker: MARKER_SOI,
    markerHex: '0xFFD8',
    name: MARKER_NAMES[MARKER_SOI] || 'SOI',
    offset: 0,
    length: 2,
  });

  // 2. High-speed marker scanner
  let offset = 2;
  let foundEOI = false;
  let eoiOffset = -1;

  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    // Skip redundant fill 0xFF bytes
    while (offset < bytes.length - 1 && bytes[offset + 1] === 0xff) {
      offset++;
    }

    if (offset >= bytes.length - 1) break;

    const markerByte = bytes[offset + 1];
    const marker = (0xff << 8) | markerByte;

    // Byte stuffing inside image streams (0xFF 0x00)
    if (markerByte === 0x00) {
      offset += 2;
      continue;
    }

    // Standalone markers
    if (marker === MARKER_EOI) {
      foundEOI = true;
      eoiOffset = offset;
      markers.push({
        marker: MARKER_EOI,
        markerHex: '0xFFD9',
        name: MARKER_NAMES[MARKER_EOI] || 'EOI',
        offset,
        length: 2,
      });
      offset += 2;
      break;
    }

    // RST0..RST7 or TEM (no payload length)
    if ((markerByte >= 0xd0 && markerByte <= 0xd7) || markerByte === 0x01) {
      offset += 2;
      continue;
    }

    // Markers with length payload
    if (offset + 3 >= bytes.length) break;
    const segmentLength = dataView.getUint16(offset + 2, false);

    markers.push({
      marker,
      markerHex: `0x${marker.toString(16).toUpperCase()}`,
      name: MARKER_NAMES[marker] || `APP/Marker (0x${marker.toString(16).toUpperCase()})`,
      offset,
      length: segmentLength + 2,
    });

    // Check APP1 (Exif)
    if (marker === MARKER_APP1) {
      const app1PayloadOffset = offset + 4;
      // Check Exif header: 'Exif\0\0' (0x45 0x78 0x69 0x66 0x00 0x00)
      if (
        segmentLength >= 8 &&
        bytes[app1PayloadOffset] === 0x45 &&
        bytes[app1PayloadOffset + 1] === 0x78 &&
        bytes[app1PayloadOffset + 2] === 0x69 &&
        bytes[app1PayloadOffset + 3] === 0x66 &&
        bytes[app1PayloadOffset + 4] === 0x00 &&
        bytes[app1PayloadOffset + 5] === 0x00
      ) {
        const tiffOffset = app1PayloadOffset + 6;
        parseTiffHeader(dataView, tiffOffset, bytes.length, {
          onTag: (info) => {
            rawTags[info.tagId] = info;
            if (info.tagId === '0x9003') dateTimeOriginal = info.formattedValue;
            if (info.tagId === '0x9004') createDate = info.formattedValue;
            if (info.tagId === '0x0132') modifyDate = info.formattedValue;
            if (info.tagId === '0x9290' || info.tagId === '0x9291') subSecTime = info.formattedValue;
            if (info.tagId === '0x010f') cameraMake = info.formattedValue;
            if (info.tagId === '0x0110') cameraModel = info.formattedValue;
            if (info.tagId === '0xa434') lensModel = info.formattedValue;
            if (info.tagId === '0x8827') iso = info.formattedValue;
            if (info.tagId === '0x829d') fNumber = info.formattedValue;
            if (info.tagId === '0x829a') exposureTime = info.formattedValue;
            if (info.tagId === '0x920a') focalLength = info.formattedValue;
            if (info.tagId === '0x0112') orientation = Number(info.rawValue) || 1;
            if (info.tagId === '0xa002') width = Number(info.rawValue);
            if (info.tagId === '0xa003') height = Number(info.rawValue);
          },
          onAnomaly: (anomaly) => {
            anomalies.push(anomaly);
          },
        });
      }
    }

    // Check SOF0 / SOF2 for image dimensions if not already in EXIF
    if ((marker === MARKER_SOF0 || marker === MARKER_SOF2) && (!width || !height)) {
      if (segmentLength >= 7 && offset + 7 < bytes.length) {
        height = dataView.getUint16(offset + 5, false);
        width = dataView.getUint16(offset + 7, false);
      }
    }

    // When SOS is reached, metadata headers are done. Jump directly to tail to find EOI!
    if (marker === MARKER_SOS) {
      offset += 2 + segmentLength;
      const tailSearchStart = Math.max(offset, bytes.length - 4096);
      for (let i = bytes.length - 2; i >= tailSearchStart; i--) {
        if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
          foundEOI = true;
          eoiOffset = i;
          markers.push({
            marker: MARKER_EOI,
            markerHex: '0xFFD9',
            name: MARKER_NAMES[MARKER_EOI] || 'EOI',
            offset: i,
            length: 2,
          });
          break;
        }
      }
      break;
    }

    offset += 2 + segmentLength;
  }

  // Calculate trailing bytes after EOI
  let trailingBytesAfterEOI = 0;
  if (foundEOI && eoiOffset > 0 && eoiOffset + 2 < bytes.length) {
    trailingBytesAfterEOI = bytes.length - (eoiOffset + 2);
  }

  // Determine primary date
  const primaryDateStr = dateTimeOriginal || createDate || modifyDate;
  const primaryDate = primaryDateStr ? parseExifDateString(primaryDateStr) : null;
  const dateSource = dateTimeOriginal
    ? 'DateTimeOriginal'
    : createDate
    ? 'CreateDate'
    : modifyDate
    ? 'ModifyDate'
    : 'None';

  // Critical safety check: shooting date presence
  if (!primaryDate) {
    anomalies.push({
      tag: 'MISSING_DATE',
      tagName: 'DateTimeOriginal',
      message: 'Data di scatto mancante: impossibile determinare il nome sicuro della foto',
      level: 'error',
      blocking: true,
    });
  }

  const hasBlockingError = anomalies.some((a) => a.blocking);

  return {
    success: !hasBlockingError,
    error: hasBlockingError ? anomalies.find((a) => a.blocking)?.message : undefined,
    dateTimeOriginal,
    createDate,
    modifyDate,
    subSecTime,
    primaryDate,
    dateSource,
    cameraMake,
    cameraModel,
    lensModel,
    iso,
    fNumber,
    exposureTime,
    focalLength,
    orientation,
    width,
    height,
    markers,
    rawTags,
    anomalies,
    trailingBytesAfterEOI,
    hasEOI: foundEOI,
    scanDurationMs: performance.now() - startTime,
  };
}

/**
 * Parses TIFF header and IFDs inside APP1 EXIF segment.
 */
function parseTiffHeader(
  dataView: DataView,
  tiffOffset: number,
  maxLen: number,
  callbacks: {
    onTag: (tag: ExifTagInfo) => void;
    onAnomaly: (anomaly: ExifAnomaly) => void;
  }
) {
  if (tiffOffset + 8 > maxLen) return;

  const byteOrderMark = dataView.getUint16(tiffOffset, false);
  const isLittleEndian = byteOrderMark === 0x4949;

  if (byteOrderMark !== 0x4949 && byteOrderMark !== 0x4d4d) {
    callbacks.onAnomaly({
      tag: 'TIFF_HEADER',
      tagName: 'ByteOrderMark',
      message: 'Intestazione TIFF non valida',
      level: 'error',
      blocking: true,
    });
    return;
  }

  const magic = dataView.getUint16(tiffOffset + 2, isLittleEndian);
  if (magic !== 0x002a) {
    callbacks.onAnomaly({
      tag: 'TIFF_HEADER',
      tagName: 'MagicNumber',
      message: 'Intestazione TIFF corrotta',
      level: 'error',
      blocking: true,
    });
    return;
  }

  const ifd0OffsetRel = dataView.getUint32(tiffOffset + 4, isLittleEndian);
  const ifd0Offset = tiffOffset + ifd0OffsetRel;

  let exifSubIfdOffset: number | null = null;
  let gpsSubIfdOffset: number | null = null;

  // Parse IFD0
  parseIfd(dataView, tiffOffset, ifd0Offset, isLittleEndian, maxLen, 'IFD0', callbacks, (tagId, val) => {
    if (tagId === 0x8769) exifSubIfdOffset = tiffOffset + Number(val);
    if (tagId === 0x8825) gpsSubIfdOffset = tiffOffset + Number(val);
  });

  // Parse Exif sub-IFD
  if (exifSubIfdOffset && exifSubIfdOffset < maxLen) {
    parseIfd(dataView, tiffOffset, exifSubIfdOffset, isLittleEndian, maxLen, 'ExifIFD', callbacks);
  }

  // Parse GPS sub-IFD
  if (gpsSubIfdOffset && gpsSubIfdOffset < maxLen) {
    parseIfd(dataView, tiffOffset, gpsSubIfdOffset, isLittleEndian, maxLen, 'GPS', callbacks);
  }
}

/**
 * Parses a single IFD structure.
 */
function parseIfd(
  dataView: DataView,
  tiffOffset: number,
  ifdOffset: number,
  isLittleEndian: boolean,
  maxLen: number,
  group: 'IFD0' | 'ExifIFD' | 'GPS' | 'Interop' | 'MakerNotes' | 'Image',
  callbacks: {
    onTag: (tag: ExifTagInfo) => void;
    onAnomaly: (anomaly: ExifAnomaly) => void;
  },
  onSpecialTag?: (tagId: number, rawVal: unknown) => void
) {
  if (ifdOffset + 2 > maxLen) return;
  const numEntries = dataView.getUint16(ifdOffset, isLittleEndian);

  let entryOffset = ifdOffset + 2;
  for (let i = 0; i < numEntries && entryOffset + 12 <= maxLen; i++, entryOffset += 12) {
    const tagIdNum = dataView.getUint16(entryOffset, isLittleEndian);
    const tagType = dataView.getUint16(entryOffset + 2, isLittleEndian);
    const count = dataView.getUint32(entryOffset + 4, isLittleEndian);
    const valOffsetOrVal = entryOffset + 8;

    const tagIdHex = `0x${tagIdNum.toString(16).padStart(4, '0').toLowerCase()}`;
    const tagName = TAG_DICTIONARY[tagIdNum] || `Tag_${tagIdHex}`;

    const rawVal = readTagValue(dataView, tiffOffset, tagType, count, valOffsetOrVal, isLittleEndian, maxLen);
    const formattedVal = formatTagValue(rawVal, tagType);

    if (onSpecialTag) {
      onSpecialTag(tagIdNum, rawVal);
    }

    callbacks.onTag({
      tagId: tagIdHex,
      tagName,
      group,
      rawValue: rawVal,
      formattedValue: formattedVal,
      isAnomaly: false,
    });
  }
}

function readTagValue(
  dataView: DataView,
  tiffOffset: number,
  type: number,
  count: number,
  valOffsetOrVal: number,
  isLittleEndian: boolean,
  maxLen: number
): unknown {
  let dataOffset = valOffsetOrVal;
  const byteSizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8];
  const totalBytes = count * (byteSizes[type] || 1);

  if (totalBytes > 4) {
    const relOffset = dataView.getUint32(valOffsetOrVal, isLittleEndian);
    dataOffset = tiffOffset + relOffset;
    if (dataOffset + totalBytes > maxLen) return null;
  }

  try {
    switch (type) {
      case 2: {
        let str = '';
        for (let i = 0; i < count; i++) {
          const charCode = dataView.getUint8(dataOffset + i);
          if (charCode === 0) break;
          str += String.fromCharCode(charCode);
        }
        return str.trim();
      }
      case 3:
        return count === 1
          ? dataView.getUint16(dataOffset, isLittleEndian)
          : Array.from({ length: Math.min(count, 8) }, (_, idx) =>
              dataView.getUint16(dataOffset + idx * 2, isLittleEndian)
            );
      case 4:
        return count === 1
          ? dataView.getUint32(dataOffset, isLittleEndian)
          : Array.from({ length: Math.min(count, 8) }, (_, idx) =>
              dataView.getUint32(dataOffset + idx * 4, isLittleEndian)
            );
      case 5: {
        if (dataOffset + 8 > maxLen) return null;
        const num = dataView.getUint32(dataOffset, isLittleEndian);
        const den = dataView.getUint32(dataOffset + 4, isLittleEndian);
        return den === 0 ? 0 : num / den;
      }
      case 10: {
        if (dataOffset + 8 > maxLen) return null;
        const snum = dataView.getInt32(dataOffset, isLittleEndian);
        const sden = dataView.getInt32(dataOffset + 4, isLittleEndian);
        return sden === 0 ? 0 : snum / sden;
      }
      default:
        return dataView.getUint32(valOffsetOrVal, isLittleEndian);
    }
  } catch {
    return null;
  }
}

function formatTagValue(value: unknown, type: number): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (type === 5 || type === 10) {
      return Number.isInteger(value) ? `${value}` : `${value.toFixed(2)}`;
    }
    return String(value);
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function parseExifDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})\s+(\d{2})[:\-](\d{2})[:\-](\d{2})/);
  if (!match) return null;

  const [_, year, month, day, hour, min, sec] = match;
  const d = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(min, 10),
    parseInt(sec, 10)
  );

  return isNaN(d.getTime()) ? null : d;
}

export const TAG_DICTIONARY: Record<number, string> = {
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011a: 'XResolution',
  0x011b: 'YResolution',
  0x0128: 'ResolutionUnit',
  0x0131: 'Software',
  0x0132: 'ModifyDate',
  0x0213: 'YCbCrPositioning',
  0x8298: 'Copyright',
  0x8769: 'ExifOffset',
  0x8825: 'GPSInfo',
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8822: 'ExposureProgram',
  0x8827: 'ISO',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'CreateDate',
  0x9101: 'ComponentsConfiguration',
  0x9102: 'CompressedBitsPerPixel',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9203: 'BrightnessValue',
  0x9204: 'ExposureCompensation',
  0x9205: 'MaxApertureValue',
  0x9207: 'MeteringMode',
  0x9208: 'LightSource',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0x927c: 'MakerNote',
  0x9286: 'UserComment',
  0x9290: 'SubSecTime',
  0x9291: 'SubSecTimeOriginal',
  0x9292: 'SubSecTimeDigitized',
  0xa000: 'FlashpixVersion',
  0xa001: 'ColorSpace',
  0xa002: 'ExifImageWidth',
  0xa003: 'ExifImageHeight',
  0xa005: 'InteropOffset',
  0xa401: 'CustomRendered',
  0xa402: 'ExposureMode',
  0xa403: 'WhiteBalance',
  0xa404: 'DigitalZoomRatio',
  0xa405: 'FocalLengthIn35mmFormat',
  0xa406: 'SceneCaptureType',
  0xa434: 'LensModel',
};

/**
 * Format a Date object into standard EXIF ASCII date string: "YYYY:MM:DD HH:MM:SS" (19 chars).
 */
export function formatExifDateString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * In-place binary-safe EXIF date updater.
 * Locates APP1 / TIFF IFDs and updates DateTimeOriginal (0x9003), CreateDate (0x9004),
 * and ModifyDate (0x0132) without shifting offsets, corrupting markers or touching image scan data.
 */
export function patchJpegExifDate(
  buffer: ArrayBuffer | Uint8Array,
  newDate: Date | string,
  oldDateStrHint?: string
): Uint8Array {
  const bytes =
    buffer instanceof Uint8Array
      ? new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
      : new Uint8Array(buffer.slice(0));

  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const newDateStr =
    typeof newDate === 'string'
      ? newDate.substring(0, 19)
      : formatExifDateString(newDate);

  if (newDateStr.length !== 19 || bytes.length < 4 || dataView.getUint16(0, false) !== 0xffd8) {
    return bytes;
  }

  // Scan markers to find APP1
  let offset = 2;
  while (offset < bytes.length - 4) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    while (offset < bytes.length - 1 && bytes[offset + 1] === 0xff) {
      offset++;
    }
    if (offset >= bytes.length - 1) break;

    const markerByte = bytes[offset + 1];
    const marker = (0xff << 8) | markerByte;

    // SOS or EOI marks end of header segments
    if (marker === 0xffda || marker === 0xffd9) {
      break;
    }

    if ((markerByte >= 0xd0 && markerByte <= 0xd7) || markerByte === 0x01) {
      offset += 2;
      continue;
    }

    const segLen = dataView.getUint16(offset + 2, false);

    if (marker === 0xffe1) {
      const app1Payload = offset + 4;
      // Check 'Exif\0\0'
      if (
        segLen >= 8 &&
        bytes[app1Payload] === 0x45 &&
        bytes[app1Payload + 1] === 0x78 &&
        bytes[app1Payload + 2] === 0x69 &&
        bytes[app1Payload + 3] === 0x66 &&
        bytes[app1Payload + 4] === 0x00 &&
        bytes[app1Payload + 5] === 0x00
      ) {
        const tiffOffset = app1Payload + 6;
        if (tiffOffset + 8 <= bytes.length) {
          const byteOrder = dataView.getUint16(tiffOffset, false);
          const isLE = byteOrder === 0x4949;
          const magic = dataView.getUint16(tiffOffset + 2, isLE);

          if ((byteOrder === 0x4949 || byteOrder === 0x4d4d) && magic === 0x002a) {
            const ifd0Rel = dataView.getUint32(tiffOffset + 4, isLE);
            const ifd0Offset = tiffOffset + ifd0Rel;

            const patchIfd = (ifdOff: number) => {
              if (ifdOff + 2 > bytes.length) return;
              const count = dataView.getUint16(ifdOff, isLE);
              let entryOff = ifdOff + 2;

              for (let i = 0; i < count && entryOff + 12 <= bytes.length; i++, entryOff += 12) {
                const tagId = dataView.getUint16(entryOff, isLE);
                const tagType = dataView.getUint16(entryOff + 2, isLE);
                const tagCount = dataView.getUint32(entryOff + 4, isLE);

                // Exif sub-IFD (0x8769)
                if (tagId === 0x8769) {
                  const subRel = dataView.getUint32(entryOff + 8, isLE);
                  patchIfd(tiffOffset + subRel);
                }

                // DateTimeOriginal (0x9003), CreateDate (0x9004), ModifyDate (0x0132)
                if (tagId === 0x9003 || tagId === 0x9004 || tagId === 0x0132) {
                  if (tagType === 2 && tagCount >= 19) {
                    const strRel = dataView.getUint32(entryOff + 8, isLE);
                    const strOffset = tiffOffset + strRel;
                    if (strOffset + 19 <= bytes.length) {
                      for (let c = 0; c < 19; c++) {
                        bytes[strOffset + c] = newDateStr.charCodeAt(c);
                      }
                      if (strOffset + 19 < bytes.length) {
                        bytes[strOffset + 19] = 0;
                      }
                    }
                  }
                }
              }
            };

            patchIfd(ifd0Offset);
          }
        }
      }

      // Also scan APP1 segment for exact match of oldDateStrHint
      if (oldDateStrHint && oldDateStrHint.length === 19) {
        const segEnd = Math.min(bytes.length, offset + 2 + segLen);
        for (let s = offset + 4; s <= segEnd - 19; s++) {
          let match = true;
          for (let m = 0; m < 19; m++) {
            if (bytes[s + m] !== oldDateStrHint.charCodeAt(m)) {
              match = false;
              break;
            }
          }
          if (match) {
            for (let m = 0; m < 19; m++) {
              bytes[s + m] = newDateStr.charCodeAt(m);
            }
          }
        }
      }
    }

    offset += 2 + segLen;
  }

  return bytes;
}

