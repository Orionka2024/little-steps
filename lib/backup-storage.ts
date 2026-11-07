import type { Entry, AssignmentEntry, MaterialEntry } from './types.ts';
import { isAssignment, isMaterial, isAttendance, isSubmission, isMessage } from './types.ts';
import { EntryPayloadSchema } from './validation.ts';

export interface CurriculumBackupBundle {
  version: '1.0';
  app: 'little-steps';
  timestamp: string;
  source: 'browser' | 'server' | 'manual_export';
  description?: string;
  stats: {
    assignmentsCount: number;
    materialsCount: number;
    attendanceCount: number;
    submissionsCount: number;
    messagesCount: number;
    totalEntries: number;
  };
  entries: Entry[];
}

export interface BackupSnapshotMeta {
  id: string;
  timestamp: string;
  trigger: string;
  assignmentsCount: number;
  materialsCount: number;
  totalEntries: number;
}

const DB_NAME = 'LittleStepsBackupDB';
const DB_VERSION = 1;
const STORE_CURRICULUM = 'curriculum';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_META = 'meta';

const LOCAL_FALLBACK_KEY = 'classroom_curriculum_backup_latest';
const LOCAL_SNAPSHOTS_KEY = 'classroom_curriculum_backup_snapshots';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function hasIndexedDB(): boolean {
  return hasWindow() && typeof window.indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase | null> {
  if (!hasIndexedDB()) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CURRICULUM)) {
          db.createObjectStore(STORE_CURRICULUM, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function computeCurriculumStats(entries: Entry[]) {
  return {
    assignmentsCount: entries.filter(isAssignment).length,
    materialsCount: entries.filter(isMaterial).length,
    attendanceCount: entries.filter(isAttendance).length,
    submissionsCount: entries.filter(isSubmission).length,
    messagesCount: entries.filter(isMessage).length,
    totalEntries: entries.length,
  };
}

/**
 * Persists the complete curriculum to durable IndexedDB storage and fallback localStorage.
 * Creates an automatic snapshot record every time assignments or materials are saved.
 */
export async function saveCurriculumBackup(
  entries: Entry[],
  trigger: string = 'manual'
): Promise<boolean> {
  if (!hasWindow()) return false;

  const timestamp = new Date().toISOString();
  const stats = computeCurriculumStats(entries);
  const bundle: CurriculumBackupBundle = {
    version: '1.0',
    app: 'little-steps',
    timestamp,
    source: 'browser',
    description: `Auto-backup triggered by ${trigger}`,
    stats,
    entries,
  };

  // 1. Always write to localStorage fallback mirror
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(bundle));
  } catch {
    // quota exceeded or private mode, proceed to IndexedDB
  }

  // 2. Write to persistent IndexedDB
  const db = await openDB();
  if (!db) return true;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_CURRICULUM, STORE_SNAPSHOTS, STORE_META], 'readwrite');
      const curriculumStore = tx.objectStore(STORE_CURRICULUM);
      const snapshotStore = tx.objectStore(STORE_SNAPSHOTS);
      const metaStore = tx.objectStore(STORE_META);

      // Clear previous curriculum and insert fresh entries
      curriculumStore.clear();
      for (const entry of entries) {
        curriculumStore.put(entry);
      }

      // Save latest snapshot with timestamp
      const snapshotId = `snapshot_${Date.now()}`;
      snapshotStore.put({
        id: snapshotId,
        timestamp,
        trigger,
        stats,
        entries,
      });

      // Update meta
      metaStore.put({
        key: 'latest_backup',
        timestamp,
        trigger,
        stats,
      });

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };

      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieves the latest durable backup from IndexedDB, falling back to localStorage mirror.
 */
export async function getLatestCurriculumBackup(): Promise<Entry[] | null> {
  if (!hasWindow()) return null;

  // Try IndexedDB first
  const db = await openDB();
  if (db) {
    try {
      const entries = await new Promise<Entry[] | null>((resolve) => {
        const tx = db.transaction(STORE_CURRICULUM, 'readonly');
        const store = tx.objectStore(STORE_CURRICULUM);
        const req = store.getAll();

        req.onsuccess = () => {
          const list = req.result as Entry[];
          resolve(Array.isArray(list) && list.length > 0 ? list : null);
        };
        req.onerror = () => resolve(null);
      });

      db.close();
      if (entries && entries.length > 0) {
        return entries;
      }
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback to localStorage mirror
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries)) {
        return parsed.entries as Entry[];
      }
      if (Array.isArray(parsed)) {
        return parsed as Entry[];
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Retrieves backup metadata (last backup timestamp, counts).
 */
export async function getBackupMetadata(): Promise<{
  timestamp: string | null;
  trigger: string | null;
  stats: ReturnType<typeof computeCurriculumStats> | null;
}> {
  if (!hasWindow()) {
    return { timestamp: null, trigger: null, stats: null };
  }

  const db = await openDB();
  if (db) {
    try {
      const meta = await new Promise<{ key: string; timestamp: string; trigger: string; stats: any } | null>((resolve) => {
        const tx = db.transaction(STORE_META, 'readonly');
        const store = tx.objectStore(STORE_META);
        const req = store.get('latest_backup');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      db.close();
      if (meta) {
        return {
          timestamp: meta.timestamp,
          trigger: meta.trigger,
          stats: meta.stats,
        };
      }
    } catch {}
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CurriculumBackupBundle;
      if (parsed.timestamp) {
        return {
          timestamp: parsed.timestamp,
          trigger: parsed.description || 'auto',
          stats: parsed.stats || null,
        };
      }
    }
  } catch {}

  return { timestamp: null, trigger: null, stats: null };
}

/**
 * Exports curriculum backup as a JSON string bundle.
 */
export function exportCurriculumBackupJson(entries: Entry[], description?: string): string {
  const timestamp = new Date().toISOString();
  const bundle: CurriculumBackupBundle = {
    version: '1.0',
    app: 'little-steps',
    timestamp,
    source: 'manual_export',
    description: description || 'Curriculum export backup (Homework, Materials, & Lessons)',
    stats: computeCurriculumStats(entries),
    entries,
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Triggers a browser download of the curriculum backup file.
 */
export function downloadCurriculumBackupFile(entries: Entry[], filename?: string): void {
  if (!hasWindow()) return;

  const jsonString = exportCurriculumBackupJson(entries);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = filename || `little-steps-curriculum-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses an uploaded curriculum backup file JSON text.
 */
export function parseAndValidateBackupFile(jsonText: string): {
  ok: boolean;
  entries?: Entry[];
  error?: string;
  stats?: ReturnType<typeof computeCurriculumStats>;
  timestamp?: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    let rawEntries: unknown[] = [];
    let timestamp = new Date().toISOString();

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.entries)) {
        rawEntries = parsed.entries;
        if (parsed.timestamp) timestamp = String(parsed.timestamp);
      } else if (Array.isArray(parsed)) {
        rawEntries = parsed;
      } else {
        return { ok: false, error: 'Backup file must contain a valid array of classroom entries.' };
      }
    } else {
      return { ok: false, error: 'Invalid JSON file format.' };
    }

    const validated: Entry[] = [];
    for (let i = 0; i < rawEntries.length; i++) {
      const item = rawEntries[i];
      const result = EntryPayloadSchema.safeParse(item);
      if (!result.success) {
        return {
          ok: false,
          error: `Entry at index ${i} is invalid: ${result.error.errors.map((e) => e.message).join(', ')}`,
        };
      }
      validated.push(result.data as Entry);
    }

    return {
      ok: true,
      entries: validated,
      stats: computeCurriculumStats(validated),
      timestamp,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Could not parse JSON: ${err instanceof Error ? err.message : 'Syntax error'}`,
    };
  }
}
