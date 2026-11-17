import { getStore } from '@netlify/blobs';
import { del, get, list, put } from '@vercel/blob';

export interface BlobEntryWithMeta {
  data: ArrayBuffer;
  metadata: Record<string, unknown>;
}

export interface StoreBackend {
  getJSON<T>(storeName: string, key: string): Promise<T | null>;
  setJSON(
    storeName: string,
    key: string,
    value: unknown,
    options?: { onlyIfNew?: boolean }
  ): Promise<{ modified: boolean }>;
  getBinary(storeName: string, key: string): Promise<BlobEntryWithMeta | null>;
  setBinary(
    storeName: string,
    key: string,
    data: ArrayBuffer | Uint8Array,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  deleteKey(storeName: string, key: string): Promise<void>;
  listKeys(storeName: string, prefix: string): Promise<string[]>;
}

class MemoryStoreBackend implements StoreBackend {
  private buckets = new Map<string, Map<string, { value: unknown; metadata?: Record<string, unknown> }>>();

  private getBucket(storeName: string) {
    let bucket = this.buckets.get(storeName);
    if (!bucket) {
      bucket = new Map();
      this.buckets.set(storeName, bucket);
    }
    return bucket;
  }

  async getJSON<T>(storeName: string, key: string): Promise<T | null> {
    const entry = this.getBucket(storeName).get(key);
    if (!entry) return null;
    return structuredClone(entry.value) as T;
  }

  async setJSON(
    storeName: string,
    key: string,
    value: unknown,
    options?: { onlyIfNew?: boolean }
  ): Promise<{ modified: boolean }> {
    const bucket = this.getBucket(storeName);
    if (options?.onlyIfNew && bucket.has(key)) {
      return { modified: false };
    }
    bucket.set(key, { value: structuredClone(value) });
    return { modified: true };
  }

  async getBinary(storeName: string, key: string): Promise<BlobEntryWithMeta | null> {
    const entry = this.getBucket(storeName).get(key);
    if (!entry) return null;
    const raw = entry.value as Uint8Array;
    const copy = new Uint8Array(raw.byteLength);
    copy.set(raw);
    return { data: copy.buffer, metadata: entry.metadata ?? {} };
  }

  async setBinary(
    storeName: string,
    key: string,
    data: ArrayBuffer | Uint8Array,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
    this.getBucket(storeName).set(key, { value: bytes, metadata });
  }

  async deleteKey(storeName: string, key: string): Promise<void> {
    this.getBucket(storeName).delete(key);
  }

  async listKeys(storeName: string, prefix: string): Promise<string[]> {
    const bucket = this.getBucket(storeName);
    return Array.from(bucket.keys())
      .filter((k) => k.startsWith(prefix))
      .sort();
  }
}

class NetlifyBlobBackend implements StoreBackend {
  private store(name: string) {
    return getStore({ name, consistency: 'strong' });
  }

  async getJSON<T>(storeName: string, key: string): Promise<T | null> {
    const data = await this.store(storeName).get(key, { type: 'json' });
    return (data as T) ?? null;
  }

  async setJSON(
    storeName: string,
    key: string,
    value: unknown,
    options?: { onlyIfNew?: boolean }
  ): Promise<{ modified: boolean }> {
    const res = await this.store(storeName).setJSON(key, value, {
      onlyIfNew: options?.onlyIfNew,
    });
    return { modified: Boolean(res?.modified) };
  }

  async getBinary(storeName: string, key: string): Promise<BlobEntryWithMeta | null> {
    const entry = await this.store(storeName).getWithMetadata(key, { type: 'arrayBuffer' });
    if (!entry) return null;
    return {
      data: entry.data as ArrayBuffer,
      metadata: (entry.metadata as Record<string, unknown>) ?? {},
    };
  }

  async setBinary(
    storeName: string,
    key: string,
    data: ArrayBuffer | Uint8Array,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const buf =
      data instanceof Uint8Array
        ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        : data;
    await this.store(storeName).set(key, buf as ArrayBuffer, {
      metadata: metadata as Record<string, string | number | boolean> | undefined,
    });
  }

  async deleteKey(storeName: string, key: string): Promise<void> {
    await this.store(storeName).delete(key);
  }

  async listKeys(storeName: string, prefix: string): Promise<string[]> {
    const { blobs } = await this.store(storeName).list({ prefix });
    return blobs.map((b) => b.key).sort();
  }
}

function isBlobNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'BlobNotFoundError' || /\b404\b|not found/i.test(err.message);
}

class VercelBlobBackend implements StoreBackend {
  private blobPath(storeName: string, key: string): string {
    return storeName === DATA_STORE ? `${storeName}/${key}.json` : `${storeName}/${key}`;
  }

  async getJSON<T>(storeName: string, key: string): Promise<T | null> {
    try {
      const res = await get(this.blobPath(storeName, key), {
        access: 'private',
        useCache: false,
      });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      const text = await new Response(res.stream).text();
      return JSON.parse(text) as T;
    } catch (err) {
      if (isBlobNotFoundError(err)) return null;
      throw err;
    }
  }

  async setJSON(
    storeName: string,
    key: string,
    value: unknown,
    options?: { onlyIfNew?: boolean }
  ): Promise<{ modified: boolean }> {
    const pathname = this.blobPath(storeName, key);
    const body = JSON.stringify(value);
    if (options?.onlyIfNew) {
      try {
        await put(pathname, body, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
        });
        return { modified: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (/already exists|overwrite|precondition|409/i.test(msg)) {
          return { modified: false };
        }
        throw err;
      }
    }
    await put(pathname, body, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    return { modified: true };
  }

  async getBinary(storeName: string, key: string): Promise<BlobEntryWithMeta | null> {
    try {
      const res = await get(this.blobPath(storeName, key), {
        access: 'private',
        useCache: false,
      });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      const data = await new Response(res.stream).arrayBuffer();
      return {
        data,
        metadata: { contentType: res.blob.contentType || 'audio/wav' },
      };
    } catch (err) {
      if (isBlobNotFoundError(err)) return null;
      throw err;
    }
  }

  async setBinary(
    storeName: string,
    key: string,
    data: ArrayBuffer | Uint8Array,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const buf =
      data instanceof Uint8Array
        ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
        : Buffer.from(data);
    await put(this.blobPath(storeName, key), buf, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: String(metadata?.contentType || 'audio/wav'),
      cacheControlMaxAge: 86400,
    });
  }

  async deleteKey(storeName: string, key: string): Promise<void> {
    try {
      await del(this.blobPath(storeName, key));
    } catch (err) {
      if (!isBlobNotFoundError(err)) throw err;
    }
  }

  async listKeys(storeName: string, prefix: string): Promise<string[]> {
    const fullPrefix = `${storeName}/${prefix}`;
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: fullPrefix, cursor, limit: 1000 });
      for (const b of page.blobs) {
        let k = b.pathname.startsWith(`${storeName}/`)
          ? b.pathname.slice(storeName.length + 1)
          : b.pathname;
        if (storeName === DATA_STORE && k.endsWith('.json')) {
          k = k.slice(0, -5);
        }
        keys.push(k);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return keys.sort();
  }
}

export const DATA_STORE = 'vouchvoice-data';
export const AUDIO_STORE = 'vouchvoice-audio';

let activeBackend: StoreBackend | null = null;
const memorySingleton = new MemoryStoreBackend();

export function setStoreBackendForTests(backend: StoreBackend | null) {
  activeBackend = backend;
}

export function isTestBackendActive(): boolean {
  return activeBackend !== null;
}

export function createMemoryBackend(): StoreBackend {
  return new MemoryStoreBackend();
}

export function getStorage(): StoreBackend {
  if (activeBackend) return activeBackend;
  if (typeof process !== 'undefined' && process.env.BLOB_READ_WRITE_TOKEN) {
    activeBackend = new VercelBlobBackend();
    return activeBackend;
  }
  const hasNetlifyBlobsContext =
    typeof process !== 'undefined' &&
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT || (globalThis as Record<string, unknown>).Netlify);
  if (hasNetlifyBlobsContext) {
    try {
      // Probe getStore only when Netlify runtime context is present
      getStore({ name: DATA_STORE, consistency: 'strong' });
      activeBackend = new NetlifyBlobBackend();
      return activeBackend;
    } catch {
      return memorySingleton;
    }
  }
  return memorySingleton;
}
