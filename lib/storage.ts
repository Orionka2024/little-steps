import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface StoredRecord {
  id: string;
  owner: string;
  kind: string;
  payload: string;
}

export interface StoredFile {
  key: string;
  name: string;
  contentType: string;
  base64Data: string;
  size: number;
}

// Memory cache for serverless invocation speed
let cachedRecords: StoredRecord[] | null = null;
let cachedFiles: Map<string, StoredFile> = new Map();

function getStorageDir(): string {
  // Use /tmp in production serverless (e.g. Vercel), or local .sites-runtime / data in dev
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return '/tmp';
  }
  return path.join(process.cwd(), '.sites-runtime');
}

function getRecordsFilePath(): string {
  const dir = getStorageDir();
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      // Ignore if exists
    }
  }
  return path.join(dir, 'classroom_records.json');
}

function getFilesFilePath(): string {
  const dir = getStorageDir();
  return path.join(dir, 'classroom_files.json');
}

function loadRecordsFromDisk(): StoredRecord[] {
  if (cachedRecords) return cachedRecords;

  const filePath = getRecordsFilePath();
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      cachedRecords = JSON.parse(content) as StoredRecord[];
      return cachedRecords;
    } catch {
      // Fallback to empty if parse error
    }
  }

  // Initial seed records
  cachedRecords = [
    {
      id: 'local_seedy:msg-1',
      owner: 'local_seedy',
      kind: 'message',
      payload: JSON.stringify({
        id: 'msg-1',
        kind: 'message',
        text: 'Welcome Hajun, Mark, and Juwon to the Writing Club! Let me know if you need help on your first draft.',
        sender: 'Teacher',
        time: '2026-10-30T09:00:00.000Z',
        localId: 'msg-1',
      }),
    },
  ];

  try {
    writeFileSync(filePath, JSON.stringify(cachedRecords, null, 2), 'utf-8');
  } catch {
    // Ignore if readonly
  }

  return cachedRecords;
}

function saveRecordsToDisk(records: StoredRecord[]): void {
  cachedRecords = records;
  try {
    const filePath = getRecordsFilePath();
    writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch {
    // Ignore in read-only environments
  }
}

function loadFilesFromDisk(): Map<string, StoredFile> {
  if (cachedFiles.size > 0) return cachedFiles;

  const filePath = getFilesFilePath();
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const list = JSON.parse(content) as StoredFile[];
      cachedFiles = new Map(list.map((f) => [f.key, f]));
    } catch {
      // Ignore
    }
  }
  return cachedFiles;
}

function saveFilesToDisk(filesMap: Map<string, StoredFile>): void {
  cachedFiles = filesMap;
  try {
    const filePath = getFilesFilePath();
    const list = Array.from(filesMap.values());
    writeFileSync(filePath, JSON.stringify(list), 'utf-8');
  } catch {
    // Ignore
  }
}

// Universal database records access
export async function getStoredRecords(owner = 'local_seedy'): Promise<Record<string, unknown>[]> {
  const records = loadRecordsFromDisk();
  const filtered = records.filter((r) => r.owner === owner || !owner);
  return filtered.map((r) => {
    try {
      const parsed = JSON.parse(r.payload) as Record<string, unknown>;
      return {
        id: r.id,
        kind: r.kind,
        ...parsed,
      };
    } catch {
      return {
        id: r.id,
        kind: r.kind,
      };
    }
  });
}

export async function upsertStoredRecord(
  id: string,
  owner: string,
  kind: string,
  data: Record<string, unknown>
): Promise<void> {
  const records = loadRecordsFromDisk();
  const key = id.includes(':') ? id : `${owner}:${id}`;
  const payloadToStore = JSON.stringify({
    ...data,
    localId: id,
  });

  const existingIdx = records.findIndex((r) => r.id === key);
  if (existingIdx >= 0) {
    records[existingIdx] = {
      id: key,
      owner,
      kind,
      payload: payloadToStore,
    };
  } else {
    records.push({
      id: key,
      owner,
      kind,
      payload: payloadToStore,
    });
  }

  saveRecordsToDisk(records);
}

export async function deleteStoredRecord(
  id: string,
  owner = 'local_seedy'
): Promise<boolean> {
  const records = loadRecordsFromDisk();
  const key = id.includes(':') ? id : `${owner}:${id}`;
  const initialLen = records.length;
  const filtered = records.filter(
    (r) => r.id !== key && r.id !== id && !r.id.endsWith(`:${id}`)
  );
  if (filtered.length !== initialLen) {
    saveRecordsToDisk(filtered);
    return true;
  }
  return false;
}

export async function deleteStoredRecordsByStudent(
  studentId: string
): Promise<number> {
  const records = loadRecordsFromDisk();
  const initialLen = records.length;
  const filtered = records.filter((r) => {
    if (r.kind !== 'submission') return true;
    try {
      const data = JSON.parse(r.payload) as { studentId?: string };
      if (data.studentId === studentId || (!data.studentId && studentId === 'hajun')) {
        return false;
      }
    } catch {
      // keep
    }
    return true;
  });

  if (filtered.length !== initialLen) {
    saveRecordsToDisk(filtered);
  }
  return initialLen - filtered.length;
}

// Universal file storage
export async function putStoredFile(
  key: string,
  buffer: ArrayBuffer,
  name: string,
  contentType: string
): Promise<void> {
  const filesMap = loadFilesFromDisk();
  const base64Data = Buffer.from(buffer).toString('base64');

  filesMap.set(key, {
    key,
    name,
    contentType,
    base64Data,
    size: buffer.byteLength,
  });

  saveFilesToDisk(filesMap);
}

export async function getStoredFile(key: string): Promise<{
  body: Uint8Array;
  name: string;
  contentType: string;
} | null> {
  const filesMap = loadFilesFromDisk();
  const file = filesMap.get(key);
  if (!file) return null;

  const binary = Buffer.from(file.base64Data, 'base64');
  return {
    body: new Uint8Array(binary),
    name: file.name,
    contentType: file.contentType,
  };
}
