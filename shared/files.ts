/**
 * Which files NLI accepts and how each one is handled. Shared by the browser
 * (to label and pre-check files) and the server (to decide what to do).
 */

export type AttachmentKind = 'image' | 'audio' | 'video' | 'document';

/**
 * - gemini: uploaded to the Gemini Files API and analysed directly
 * - text: decoded on the server and sent as plain text
 * - docx: text extracted with mammoth
 * - convert-image: converted to PNG in the browser first (GIF, BMP, AVIF…)
 * - unsupported: rejected with a helpful message
 */
export type FileHandling = 'gemini' | 'text' | 'docx' | 'convert-image' | 'unsupported';

export interface FileInfo {
  kind: AttachmentKind;
  mimeType: string;
  handling: FileHandling;
}

const BY_EXTENSION: Record<string, FileInfo> = {
  png: { kind: 'image', mimeType: 'image/png', handling: 'gemini' },
  jpg: { kind: 'image', mimeType: 'image/jpeg', handling: 'gemini' },
  jpeg: { kind: 'image', mimeType: 'image/jpeg', handling: 'gemini' },
  webp: { kind: 'image', mimeType: 'image/webp', handling: 'gemini' },
  heic: { kind: 'image', mimeType: 'image/heic', handling: 'gemini' },
  heif: { kind: 'image', mimeType: 'image/heif', handling: 'gemini' },
  gif: { kind: 'image', mimeType: 'image/gif', handling: 'convert-image' },
  bmp: { kind: 'image', mimeType: 'image/bmp', handling: 'convert-image' },
  avif: { kind: 'image', mimeType: 'image/avif', handling: 'convert-image' },

  mp3: { kind: 'audio', mimeType: 'audio/mp3', handling: 'gemini' },
  wav: { kind: 'audio', mimeType: 'audio/wav', handling: 'gemini' },
  aiff: { kind: 'audio', mimeType: 'audio/aiff', handling: 'gemini' },
  aif: { kind: 'audio', mimeType: 'audio/aiff', handling: 'gemini' },
  aac: { kind: 'audio', mimeType: 'audio/aac', handling: 'gemini' },
  ogg: { kind: 'audio', mimeType: 'audio/ogg', handling: 'gemini' },
  oga: { kind: 'audio', mimeType: 'audio/ogg', handling: 'gemini' },
  opus: { kind: 'audio', mimeType: 'audio/ogg', handling: 'gemini' },
  flac: { kind: 'audio', mimeType: 'audio/flac', handling: 'gemini' },
  m4a: { kind: 'audio', mimeType: 'audio/mp4', handling: 'gemini' },

  mp4: { kind: 'video', mimeType: 'video/mp4', handling: 'gemini' },
  m4v: { kind: 'video', mimeType: 'video/mp4', handling: 'gemini' },
  mpeg: { kind: 'video', mimeType: 'video/mpeg', handling: 'gemini' },
  mpg: { kind: 'video', mimeType: 'video/mpg', handling: 'gemini' },
  mov: { kind: 'video', mimeType: 'video/mov', handling: 'gemini' },
  avi: { kind: 'video', mimeType: 'video/avi', handling: 'gemini' },
  flv: { kind: 'video', mimeType: 'video/x-flv', handling: 'gemini' },
  webm: { kind: 'video', mimeType: 'video/webm', handling: 'gemini' },
  wmv: { kind: 'video', mimeType: 'video/wmv', handling: 'gemini' },
  '3gp': { kind: 'video', mimeType: 'video/3gpp', handling: 'gemini' },

  pdf: { kind: 'document', mimeType: 'application/pdf', handling: 'gemini' },
  docx: {
    kind: 'document',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    handling: 'docx',
  },
  doc: { kind: 'document', mimeType: 'application/msword', handling: 'unsupported' },
};

const TEXT_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log', 'html', 'htm', 'rtf', 'srt', 'vtt'];

/** Canonical MIME types Gemini accepts, keyed by the variants browsers report. */
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'audio/mpeg': 'audio/mp3',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-aiff': 'audio/aiff',
  'audio/x-flac': 'audio/flac',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'video/quicktime': 'video/mov',
  'video/x-msvideo': 'video/avi',
  'video/x-ms-wmv': 'video/wmv',
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function classifyFile(name: string, reportedMime = ''): FileInfo {
  const ext = extensionOf(name);
  const mime = MIME_ALIASES[reportedMime.toLowerCase()] ?? reportedMime.toLowerCase();

  if (BY_EXTENSION[ext]) return BY_EXTENSION[ext];
  if (TEXT_EXTENSIONS.includes(ext) || mime.startsWith('text/')) {
    return { kind: 'document', mimeType: 'text/plain', handling: 'text' };
  }

  const byMime = Object.values(BY_EXTENSION).find(info => info.mimeType === mime);
  if (byMime) return byMime;

  const kind = mime.split('/')[0];
  if (kind === 'image') return { kind: 'image', mimeType: mime, handling: 'convert-image' };
  if (kind === 'audio' || kind === 'video') return { kind, mimeType: mime, handling: 'unsupported' };
  return { kind: 'document', mimeType: mime || 'application/octet-stream', handling: 'unsupported' };
}

export function unsupportedReason(name: string): string {
  const ext = extensionOf(name);
  if (ext === 'doc') return 'Old Word files (.doc) can’t be read. Please save it as .docx or PDF and try again.';
  if (ext === 'svg') return 'SVG drawings can’t be checked. Please use a PNG or JPG screenshot instead.';
  return `NLI can’t read ${ext ? `.${ext}` : 'this kind of'} files yet. Try a photo, video, audio clip, PDF, Word (.docx) or text file.`;
}

export const ACCEPT_ATTRIBUTE = [
  ...Object.keys(BY_EXTENSION).filter(ext => BY_EXTENSION[ext].handling !== 'unsupported'),
  ...TEXT_EXTENSIONS,
]
  .map(ext => `.${ext}`)
  .join(',');
