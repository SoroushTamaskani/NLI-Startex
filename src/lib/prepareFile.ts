import { classifyFile, unsupportedReason, type FileInfo } from '../../shared/files';

export interface PreparedFile {
  blob: Blob;
  name: string;
  info: FileInfo;
}

/** Draws an image the model can't read (GIF, BMP, AVIF…) onto a canvas and re-encodes it as PNG. */
async function toPng(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('conversion failed'))), 'image/png'),
  );
}

/** Checks a file before upload. Throws an Error with a friendly message if NLI can't use it. */
export async function prepareFile(file: File, maxUploadMb: number): Promise<PreparedFile> {
  const name = file.name || `pasted-${Date.now()}.${file.type.split('/')[1] ?? 'bin'}`;
  const info = classifyFile(name, file.type);

  if (info.handling === 'unsupported') throw new Error(unsupportedReason(name));
  if (file.size > maxUploadMb * 1024 * 1024) {
    throw new Error(`“${name}” is ${(file.size / 1024 / 1024).toFixed(0)} MB. Files must be under ${maxUploadMb} MB.`);
  }

  if (info.handling === 'convert-image') {
    try {
      const png = await toPng(file);
      return { blob: png, name: name.replace(/\.[^.]+$/, '') + '.png', info: { kind: 'image', mimeType: 'image/png', handling: 'gemini' } };
    } catch {
      throw new Error(`“${name}” couldn't be opened as a picture. Try a PNG or JPG instead.`);
    }
  }
  return { blob: file, name, info };
}
