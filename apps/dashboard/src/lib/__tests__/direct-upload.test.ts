import { describe, expect, it, vi } from 'vitest';
import { DIRECT_UPLOAD_FALLBACK_BYTES, putFile, stagePhoto, type PresignPhoto } from '../direct-upload';

const jpeg = (bytes: number) => new File([new Uint8Array(bytes)], 'slab.jpg', { type: 'image/jpeg' });
const signed: PresignPhoto = vi.fn(async () => ({ key: 'uploads/0123456789abcdef0123456789abcdef', url: 'https://r2.example/put' }));

describe('stagePhoto', () => {
  it('signs, PUTs and hands back the staging key', async () => {
    const put = vi.fn(async (_url: string, _file: File, onProgress: (f: number) => void) => {
      onProgress(0.5);
    });
    const progress = vi.fn();
    const result = await stagePhoto(jpeg(10), 'products', signed, progress, put);
    expect(result).toEqual({ kind: 'staged', key: 'uploads/0123456789abcdef0123456789abcdef' });
    expect(signed).toHaveBeenCalledWith({ area: 'products', size: 10, type: 'image/jpeg' });
    expect(put).toHaveBeenCalledWith('https://r2.example/put', expect.any(File), expect.any(Function));
    expect(progress).toHaveBeenCalledWith(0.5);
  });

  it('turns a bad file away before asking the server for anything', async () => {
    const presign: PresignPhoto = vi.fn(async () => ({ key: 'uploads/0123456789abcdef0123456789abcdef', url: 'https://r2.example/put' }));
    const result = await stagePhoto(new File([], 'empty.jpg'), 'products', presign, () => {}, vi.fn());
    expect(result).toEqual({ kind: 'error', error: 'Choose a photograph first.' });
    expect(presign).not.toHaveBeenCalled();
  });

  it('surfaces the server refusal verbatim, which is how a sales account learns it cannot upload here', async () => {
    const refused: PresignPhoto = async () => ({ error: 'Photograph storage is not configured. Add the R2 keys, then try again.' });
    const result = await stagePhoto(jpeg(10), 'users', refused, () => {}, vi.fn());
    expect(result).toEqual({ kind: 'error', error: expect.stringMatching(/not configured/) });
  });

  it('falls back to the form post when the PUT fails and the file fits the request body cap', async () => {
    const put = vi.fn(async () => {
      throw new Error('CORS');
    });
    expect(await stagePhoto(jpeg(DIRECT_UPLOAD_FALLBACK_BYTES), 'products', signed, () => {}, put)).toEqual({ kind: 'fallback' });
  });

  it('says plainly that a large file cannot go the slow way when the PUT fails', async () => {
    const put = vi.fn(async () => {
      throw new Error('CORS');
    });
    const result = await stagePhoto(jpeg(DIRECT_UPLOAD_FALLBACK_BYTES + 1), 'products', signed, () => {}, put);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error).toMatch(/4\.0MB is too large to send the slow way/);
  });
});

describe('putFile', () => {
  class FakeXhr {
    static instances: FakeXhr[] = [];
    static status = 200;
    upload = { onprogress: null as null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) };
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    onabort: null | (() => void) = null;
    status = 0;
    headers: Record<string, string> = {};
    method = '';
    url = '';
    body: unknown;
    constructor() {
      FakeXhr.instances.push(this);
    }
    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value;
    }
    send(body: unknown) {
      this.body = body;
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
      this.status = FakeXhr.status;
      queueMicrotask(() => (FakeXhr.status === 0 ? this.onerror?.() : this.onload?.()));
    }
  }

  it('PUTs the file with its content type and reports progress', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const progress = vi.fn();
    await putFile('https://r2.example/put', jpeg(10), progress);
    const xhr = FakeXhr.instances.at(-1)!;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe('https://r2.example/put');
    expect(xhr.headers['Content-Type']).toBe('image/jpeg');
    expect(xhr.body).toBeInstanceOf(File);
    expect(progress).toHaveBeenCalledWith(0.5);
    vi.unstubAllGlobals();
  });

  it('rejects on a non 2xx status and on a network error, so the caller can fall back', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    FakeXhr.status = 403;
    await expect(putFile('https://r2.example/put', jpeg(10), () => {})).rejects.toThrow(/403/);
    FakeXhr.status = 0;
    await expect(putFile('https://r2.example/put', jpeg(10), () => {})).rejects.toThrow(/failed/);
    FakeXhr.status = 200;
    vi.unstubAllGlobals();
  });
});
