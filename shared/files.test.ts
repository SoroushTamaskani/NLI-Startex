import { describe, expect, it } from 'vitest';
import { classifyFile } from './files';

describe('classifyFile', () => {
  it('normalises browser MIME types to ones Gemini accepts', () => {
    expect(classifyFile('song.mp3', 'audio/mpeg')).toMatchObject({ kind: 'audio', mimeType: 'audio/mp3', handling: 'gemini' });
    expect(classifyFile('clip.mov', 'video/quicktime')).toMatchObject({ kind: 'video', mimeType: 'video/mov' });
    expect(classifyFile('memo.m4a', '')).toMatchObject({ kind: 'audio', handling: 'gemini' });
  });

  it('routes documents to the right handler', () => {
    expect(classifyFile('essay.docx').handling).toBe('docx');
    expect(classifyFile('notes.md').handling).toBe('text');
    expect(classifyFile('report.pdf').handling).toBe('gemini');
    expect(classifyFile('old.doc').handling).toBe('unsupported');
  });

  it('converts images Gemini cannot read', () => {
    expect(classifyFile('meme.gif', 'image/gif').handling).toBe('convert-image');
  });

  it('uses the MIME type when there is no extension', () => {
    expect(classifyFile('paste', 'image/png')).toMatchObject({ kind: 'image', handling: 'gemini' });
    expect(classifyFile('blob', 'application/zip').handling).toBe('unsupported');
  });
});
