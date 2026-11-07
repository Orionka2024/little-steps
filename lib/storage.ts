import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { INITIAL_ASSIGNMENTS } from './initial-data.ts';

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
  // Use /tmp in cloud serverless (e.g. Vercel), or persistent .sites-runtime directory
  if (process.env.VERCEL) {
    return '/tmp';
  }
  const runtimeDir = path.join(process.cwd(), '.sites-runtime');
  try {
    if (!existsSync(runtimeDir)) {
      mkdirSync(runtimeDir, { recursive: true });
    }
    return runtimeDir;
  } catch {
    return '/tmp';
  }
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

function getRecordsBackupFilePath(): string {
  const dir = getStorageDir();
  return path.join(dir, 'classroom_records_backup.json');
}

function getFilesFilePath(): string {
  const dir = getStorageDir();
  return path.join(dir, 'classroom_files.json');
}

function triggerRemoteBackupSync(records: StoredRecord[]): void {
  const remoteUrl = process.env.BACKUP_STORAGE_URL || process.env.PERSISTENT_STORAGE_URL;
  if (!remoteUrl) return;

  try {
    fetch(remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.BACKUP_STORAGE_AUTH ? { Authorization: process.env.BACKUP_STORAGE_AUTH } : {}),
      },
      body: JSON.stringify({
        app: 'little-steps',
        timestamp: new Date().toISOString(),
        records,
      }),
    }).catch(() => {});
  } catch {
    // Ignore async network errors in background
  }
}

function loadRecordsFromDisk(): StoredRecord[] {
  if (cachedRecords) return cachedRecords;

  const initialAssignmentRecords: StoredRecord[] = INITIAL_ASSIGNMENTS.map((a) => ({
    id: `local_seedy:${a.id}`,
    owner: 'local_seedy',
    kind: 'assignment',
    payload: JSON.stringify({
      ...a,
      posted: true,
      localId: a.id,
    }),
  }));

  const filePath = getRecordsFilePath();
  const backupPath = getRecordsBackupFilePath();
  const targetPath = existsSync(filePath) ? filePath : existsSync(backupPath) ? backupPath : null;

  if (targetPath) {
    try {
      const content = readFileSync(targetPath, 'utf-8');
      cachedRecords = JSON.parse(content) as StoredRecord[];
      // Ensure all INITIAL_ASSIGNMENTS not explicitly deleted are seeded
      const existingAssignmentIds = new Set(
        cachedRecords
          .filter((r) => r.kind === 'assignment')
          .map((r) => {
            try {
              const p = JSON.parse(r.payload);
              return p.localId || p.id;
            } catch {
              return r.id.replace('local_seedy:', '');
            }
          })
      );
      const tombstoneIds = new Set(
        cachedRecords
          .filter((r) => r.kind === 'deleted_assignment')
          .map((r) => {
            try {
              const p = JSON.parse(r.payload);
              return p.targetId;
            } catch {
              return '';
            }
          })
      );

      let updated = false;
      for (const initRec of initialAssignmentRecords) {
        const asgnId = initRec.id.replace('local_seedy:', '');
        if (!existingAssignmentIds.has(asgnId) && !tombstoneIds.has(asgnId)) {
          cachedRecords.push(initRec);
          updated = true;
        }
      }
      if (updated) {
        try {
          writeFileSync(filePath, JSON.stringify(cachedRecords, null, 2), 'utf-8');
        } catch {
          // Ignore if readonly
        }
      }
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
    ...initialAssignmentRecords,
  ];

  try {
    writeFileSync(filePath, JSON.stringify(cachedRecords, null, 2), 'utf-8');
    writeFileSync(backupPath, JSON.stringify(cachedRecords, null, 2), 'utf-8');
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

  try {
    const backupPath = getRecordsBackupFilePath();
    writeFileSync(backupPath, JSON.stringify(records, null, 2), 'utf-8');
  } catch {
    // Ignore
  }

  triggerRemoteBackupSync(records);
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

export async function upsertStoredRecords(
  items: { id: string; owner: string; kind: string; data: Record<string, unknown> }[]
): Promise<void> {
  if (items.length === 0) return;
  const records = loadRecordsFromDisk();
  for (const item of items) {
    const key = item.id.includes(':') ? item.id : `${item.owner}:${item.id}`;
    const payloadToStore = JSON.stringify({
      ...item.data,
      localId: item.id,
    });

    const existingIdx = records.findIndex((r) => r.id === key);
    if (existingIdx >= 0) {
      records[existingIdx] = {
        id: key,
        owner: item.owner,
        kind: item.kind,
        payload: payloadToStore,
      };
    } else {
      records.push({
        id: key,
        owner: item.owner,
        kind: item.kind,
        payload: payloadToStore,
      });
    }
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

export async function deleteStoredRecordsByAssignment(
  assignmentId: string
): Promise<number> {
  const records = loadRecordsFromDisk();
  const initialLen = records.length;
  const filtered = records.filter((r) => {
    if (r.kind !== 'submission') return true;
    try {
      const data = JSON.parse(r.payload) as { assignment?: string };
      if (
        data.assignment === assignmentId ||
        r.id.includes(`:${assignmentId}-`) ||
        r.id.includes(`s-${assignmentId}-`) ||
        r.id.endsWith(`:${assignmentId}`)
      ) {
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

export async function exportAllStoredRecords(): Promise<StoredRecord[]> {
  return loadRecordsFromDisk();
}

export async function restoreStoredRecords(newRecords: StoredRecord[]): Promise<number> {
  if (!Array.isArray(newRecords) || newRecords.length === 0) return 0;
  saveRecordsToDisk(newRecords);
  return newRecords.length;
}

