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

// Memory cache for local fallback / speed
let cachedRecords: StoredRecord[] | null = null;
let cachedFiles: Map<string, StoredFile> = new Map();

function isRunningInUnitTest(): boolean {
  return Boolean(
    process.env.NODE_TEST_CONTEXT ||
      process.execArgv.some((arg) => arg.includes('--test')) ||
      process.argv.some((arg) => arg.endsWith('.test.ts'))
  );
}

export function getSupabaseConfig(): { url: string; key: string } | null {
  if (isRunningInUnitTest()) {
    return null;
  }

  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).replace(/\/$/, '');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (url && key) {
    return { url, key };
  }
  return null;
}

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

function getSubmissionsArchiveFilePath(): string {
  const dir = getStorageDir();
  return path.join(dir, 'classroom_submissions_archive.json');
}

function getInitialSeedRecords(): StoredRecord[] {
  const initialAssignmentRecords: StoredRecord[] = INITIAL_ASSIGNMENTS.map((a) => ({
    id: `local_seedy:${a.id}`,
    owner: 'local_seedy',
    kind: 'assignment',
    payload: JSON.stringify({
      ...a,
      posted: Boolean(a.posted),
      localId: a.id,
    }),
  }));

  return [
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
}

function archiveSubmissionRecordToDisk(record: StoredRecord): void {
  try {
    const archivePath = getSubmissionsArchiveFilePath();
    let archive: StoredRecord[] = [];
    if (existsSync(archivePath)) {
      try {
        const raw = readFileSync(archivePath, 'utf-8');
        archive = JSON.parse(raw);
      } catch {}
    }
    const idx = archive.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      archive[idx] = record;
    } else {
      archive.push(record);
    }
    writeFileSync(archivePath, JSON.stringify(archive, null, 2), 'utf-8');
  } catch {
    // Ignore in read-only environments
  }
}

function removeFromSubmissionsArchiveOnDisk(predicate: (r: StoredRecord) => boolean): void {
  try {
    const archivePath = getSubmissionsArchiveFilePath();
    if (!existsSync(archivePath)) return;
    const raw = readFileSync(archivePath, 'utf-8');
    const archive = JSON.parse(raw) as StoredRecord[];
    const filtered = archive.filter((r) => !predicate(r));
    if (filtered.length !== archive.length) {
      writeFileSync(archivePath, JSON.stringify(filtered, null, 2), 'utf-8');
    }
  } catch {
    // Ignore
  }
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

function ensureInitialAssignmentsSeeded(records: StoredRecord[]): {
  records: StoredRecord[];
  added: StoredRecord[];
} {
  const initialAssignmentRecords: StoredRecord[] = INITIAL_ASSIGNMENTS.map((a) => ({
    id: `local_seedy:${a.id}`,
    owner: 'local_seedy',
    kind: 'assignment',
    payload: JSON.stringify({
      ...a,
      posted: Boolean(a.posted),
      localId: a.id,
    }),
  }));

  const existingAssignmentIds = new Set(
    records
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
    records
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

  const added: StoredRecord[] = [];
  const next = [...records];
  for (const initRec of initialAssignmentRecords) {
    const asgnId = initRec.id.replace('local_seedy:', '');
    if (!existingAssignmentIds.has(asgnId) && !tombstoneIds.has(asgnId)) {
      next.push(initRec);
      added.push(initRec);
    }
  }

  return { records: next, added };
}

function loadRecordsFromDisk(): StoredRecord[] {
  if (cachedRecords) return cachedRecords;

  const filePath = getRecordsFilePath();
  const backupPath = getRecordsBackupFilePath();
  const targetPath = existsSync(filePath) ? filePath : existsSync(backupPath) ? backupPath : null;

  if (targetPath) {
    try {
      const content = readFileSync(targetPath, 'utf-8');
      const loaded = JSON.parse(content) as StoredRecord[];
      const seeded = ensureInitialAssignmentsSeeded(loaded);
      cachedRecords = seeded.records;
      let updated = seeded.added.length > 0;

      // Restore any durable submissions from the archive file
      try {
        const archivePath = getSubmissionsArchiveFilePath();
        if (existsSync(archivePath)) {
          const rawArchive = readFileSync(archivePath, 'utf-8');
          const archivedSubmissions = JSON.parse(rawArchive) as StoredRecord[];
          const existingIds = new Set(cachedRecords.map((r) => r.id));
          for (const arch of archivedSubmissions) {
            if (!existingIds.has(arch.id)) {
              cachedRecords.push(arch);
              updated = true;
            }
          }
        }
      } catch {
        // Ignore archive read errors
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
      // Fallback to seed if parse error
    }
  }

  // Initial seed records
  cachedRecords = getInitialSeedRecords();

  // Also restore any historical submissions from archive even on clean/cold startup
  try {
    const archivePath = getSubmissionsArchiveFilePath();
    if (existsSync(archivePath)) {
      const rawArchive = readFileSync(archivePath, 'utf-8');
      const archivedSubmissions = JSON.parse(rawArchive) as StoredRecord[];
      const existingIds = new Set(cachedRecords.map((r) => r.id));
      for (const arch of archivedSubmissions) {
        if (!existingIds.has(arch.id)) {
          cachedRecords.push(arch);
        }
      }
    }
  } catch {}

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

// --- Supabase Cloud Database Helpers ---

async function supabaseFetchRecords(owner = 'local_seedy'): Promise<StoredRecord[] | null> {
  const sb = getSupabaseConfig();
  if (!sb) return null;

  try {
    const query = owner
      ? `?owner=eq.${encodeURIComponent(owner)}&select=id,owner,kind,payload&order=updated_at.asc`
      : `?select=id,owner,kind,payload&order=updated_at.asc`;

    const res = await fetch(`${sb.url}/rest/v1/classroom_records${query}`, {
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const rows = (await res.json()) as StoredRecord[];

    if (rows.length === 0) {
      const seed = getInitialSeedRecords();
      await supabaseUpsertRecords(seed);
      saveRecordsToDisk(seed);
      return seed;
    }

    const seeded = ensureInitialAssignmentsSeeded(rows);
    if (seeded.added.length > 0) {
      await supabaseUpsertRecords(seeded.added);
    }

    saveRecordsToDisk(seeded.records);
    return seeded.records;
  } catch {
    return null;
  }
}

async function supabaseUpsertRecords(records: StoredRecord[]): Promise<boolean> {
  const sb = getSupabaseConfig();
  if (!sb || records.length === 0) return false;

  try {
    const now = new Date().toISOString();
    const body = records.map((r) => ({
      id: r.id,
      owner: r.owner,
      kind: r.kind,
      payload: r.payload,
      updated_at: now,
    }));

    const res = await fetch(`${sb.url}/rest/v1/classroom_records?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const submissions = body.filter((r) => r.kind === 'submission');
    if (submissions.length > 0) {
      await fetch(`${sb.url}/rest/v1/classroom_submissions_archive?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(submissions),
        cache: 'no-store',
      }).catch(() => {});
    }

    return res.ok;
  } catch {
    return false;
  }
}

async function supabaseDeleteRecordsByIds(ids: string[]): Promise<boolean> {
  const sb = getSupabaseConfig();
  if (!sb || ids.length === 0) return false;

  try {
    const inList = ids.map((id) => `"${id.replace(/"/g, '')}"`).join(',');
    const res = await fetch(
      `${sb.url}/rest/v1/classroom_records?id=in.(${encodeURIComponent(inList)})`,
      {
        method: 'DELETE',
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
        },
        cache: 'no-store',
      }
    );

    await fetch(
      `${sb.url}/rest/v1/classroom_submissions_archive?id=in.(${encodeURIComponent(inList)})`,
      {
        method: 'DELETE',
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
        },
        cache: 'no-store',
      }
    ).catch(() => {});

    return res.ok;
  } catch {
    return false;
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
  const cloudRecords = await supabaseFetchRecords(owner);
  const records = cloudRecords ?? loadRecordsFromDisk();
  const filtered = records.filter((r) => r.owner === owner || !owner);

  return filtered.map((r) => {
    const cleanId = r.id.replace(/^local_seedy:/, '');
    try {
      const parsed = JSON.parse(r.payload) as Record<string, unknown>;
      const rawId = typeof parsed.localId === 'string'
        ? parsed.localId
        : typeof parsed.id === 'string'
        ? parsed.id
        : cleanId;
      const normalizedId = rawId.replace(/^local_seedy:/, '');
      return {
        ...parsed,
        id: normalizedId,
        localId: normalizedId,
        kind: r.kind,
      };
    } catch {
      return {
        id: cleanId,
        localId: cleanId,
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
  const cleanId = id.replace(/^local_seedy:/, '');
  const key = `${owner}:${cleanId}`;
  const payloadToStore = JSON.stringify({
    ...data,
    id: cleanId,
    localId: cleanId,
  });

  const newRecord: StoredRecord = {
    id: key,
    owner,
    kind,
    payload: payloadToStore,
  };

  await supabaseUpsertRecords([newRecord]);

  const records = loadRecordsFromDisk();
  const existingIdx = records.findIndex((r) => r.id === key);
  if (existingIdx >= 0) {
    records[existingIdx] = newRecord;
  } else {
    records.push(newRecord);
  }

  // Immutable append-only backup for student essays
  if (kind === 'submission') {
    archiveSubmissionRecordToDisk(newRecord);
  }

  saveRecordsToDisk(records);
}

export async function upsertStoredRecords(
  items: { id: string; owner: string; kind: string; data: Record<string, unknown> }[]
): Promise<void> {
  if (items.length === 0) return;

  const toUpsert: StoredRecord[] = [];
  const records = loadRecordsFromDisk();

  for (const item of items) {
    const cleanId = item.id.replace(/^local_seedy:/, '');
    const key = `${item.owner}:${cleanId}`;
    const payloadToStore = JSON.stringify({
      ...item.data,
      id: cleanId,
      localId: cleanId,
    });

    const newRecord: StoredRecord = {
      id: key,
      owner: item.owner,
      kind: item.kind,
      payload: payloadToStore,
    };

    toUpsert.push(newRecord);

    const existingIdx = records.findIndex((r) => r.id === key);
    if (existingIdx >= 0) {
      records[existingIdx] = newRecord;
    } else {
      records.push(newRecord);
    }

    if (item.kind === 'submission') {
      archiveSubmissionRecordToDisk(newRecord);
    }
  }

  await supabaseUpsertRecords(toUpsert);
  saveRecordsToDisk(records);
}

export async function deleteStoredRecord(
  id: string,
  owner = 'local_seedy'
): Promise<boolean> {
  const cleanId = id.replace(/^local_seedy:/, '');
  const key = `${owner}:${cleanId}`;

  await supabaseDeleteRecordsByIds([key, cleanId]);

  const records = loadRecordsFromDisk();
  const initialLen = records.length;
  const matchPred = (r: StoredRecord) =>
    r.id === key || r.id === id || r.id === cleanId || r.id.endsWith(`:${cleanId}`);

  const filtered = records.filter((r) => !matchPred(r));
  removeFromSubmissionsArchiveOnDisk(matchPred);

  if (filtered.length !== initialLen) {
    saveRecordsToDisk(filtered);
    return true;
  }
  return Boolean(getSupabaseConfig());
}

export async function deleteStoredRecordsByStudent(
  studentId: string
): Promise<number> {
  const cloudRecords = await supabaseFetchRecords('local_seedy');
  const records = cloudRecords ?? loadRecordsFromDisk();
  const initialLen = records.length;
  const idsToDelete: string[] = [];

  const isTargetStudentSub = (r: StoredRecord): boolean => {
    if (r.kind !== 'submission') return false;
    try {
      const data = JSON.parse(r.payload) as { studentId?: string };
      if (data.studentId === studentId || (!data.studentId && studentId === 'hajun')) {
        return true;
      }
    } catch {
      // keep
    }
    return false;
  };

  const filtered = records.filter((r) => {
    if (isTargetStudentSub(r)) {
      idsToDelete.push(r.id);
      return false;
    }
    return true;
  });

  if (idsToDelete.length > 0) {
    await supabaseDeleteRecordsByIds(idsToDelete);
  }
  removeFromSubmissionsArchiveOnDisk(isTargetStudentSub);

  if (filtered.length !== initialLen) {
    saveRecordsToDisk(filtered);
  }
  return initialLen - filtered.length;
}

export async function deleteStoredRecordsByAssignment(
  assignmentId: string
): Promise<number> {
  const cloudRecords = await supabaseFetchRecords('local_seedy');
  const records = cloudRecords ?? loadRecordsFromDisk();
  const initialLen = records.length;
  const idsToDelete: string[] = [];

  const isTargetAssignmentSub = (r: StoredRecord): boolean => {
    if (r.kind !== 'submission') return false;
    try {
      const data = JSON.parse(r.payload) as { assignment?: string };
      if (
        data.assignment === assignmentId ||
        r.id.includes(`:${assignmentId}-`) ||
        r.id.includes(`s-${assignmentId}-`) ||
        r.id.endsWith(`:${assignmentId}`)
      ) {
        return true;
      }
    } catch {
      // keep
    }
    return false;
  };

  const filtered = records.filter((r) => {
    if (isTargetAssignmentSub(r)) {
      idsToDelete.push(r.id);
      return false;
    }
    return true;
  });

  if (idsToDelete.length > 0) {
    await supabaseDeleteRecordsByIds(idsToDelete);
  }
  removeFromSubmissionsArchiveOnDisk(isTargetAssignmentSub);

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
  const base64Data = Buffer.from(buffer).toString('base64');
  const sb = getSupabaseConfig();

  if (sb) {
    try {
      await fetch(`${sb.url}/rest/v1/classroom_files?on_conflict=key`, {
        method: 'POST',
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify([
          {
            key,
            name,
            content_type: contentType,
            base64_data: base64Data,
            size: buffer.byteLength,
          },
        ]),
        cache: 'no-store',
      });
    } catch {
      // Fall back to local disk
    }
  }

  const filesMap = loadFilesFromDisk();
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
  const sb = getSupabaseConfig();
  if (sb) {
    try {
      const res = await fetch(
        `${sb.url}/rest/v1/classroom_files?key=eq.${encodeURIComponent(key)}&select=key,name,content_type,base64_data,size&limit=1`,
        {
          headers: {
            apikey: sb.key,
            Authorization: `Bearer ${sb.key}`,
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as {
          key: string;
          name: string;
          content_type: string;
          base64_data: string;
          size: number;
        }[];
        if (rows.length > 0) {
          const binary = Buffer.from(rows[0].base64_data, 'base64');
          return {
            body: new Uint8Array(binary),
            name: rows[0].name,
            contentType: rows[0].content_type,
          };
        }
      }
    } catch {
      // Fall back to local disk
    }
  }

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
  const cloudRecords = await supabaseFetchRecords('local_seedy');
  return cloudRecords ?? loadRecordsFromDisk();
}

export async function restoreStoredRecords(newRecords: StoredRecord[]): Promise<number> {
  if (!Array.isArray(newRecords) || newRecords.length === 0) return 0;
  await supabaseUpsertRecords(newRecords);
  saveRecordsToDisk(newRecords);
  return newRecords.length;
}
