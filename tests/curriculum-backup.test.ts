import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCurriculumStats,
  exportCurriculumBackupJson,
  parseAndValidateBackupFile,
} from '../lib/backup-storage.ts';
import {
  upsertStoredRecord,
  getStoredRecords,
  deleteStoredRecord,
  exportAllStoredRecords,
  restoreStoredRecords,
} from '../lib/storage.ts';
import { INITIAL_ASSIGNMENTS, INITIAL_MATERIALS } from '../lib/initial-data.ts';
import type { AssignmentEntry, MaterialEntry, Entry } from '../lib/types.ts';

test('computeCurriculumStats calculates counts accurately', () => {
  const dummyEntries: Entry[] = [
    ...INITIAL_ASSIGNMENTS,
    ...INITIAL_MATERIALS,
  ];

  const stats = computeCurriculumStats(dummyEntries);
  assert.equal(stats.assignmentsCount, INITIAL_ASSIGNMENTS.length);
  assert.equal(stats.materialsCount, INITIAL_MATERIALS.length);
  assert.equal(stats.totalEntries, dummyEntries.length);
});

test('exportCurriculumBackupJson generates valid JSON with metadata and schema version', () => {
  const customAssignment: AssignmentEntry = {
    id: 'asgn-test-101',
    kind: 'assignment',
    title: 'Adventures in Space',
    type: 'Creative Story',
    taskType: 'essay',
    due: '2026-11-15',
    minutes: 30,
    words: 200,
    description: 'Write about traveling to Jupiter.',
    instructions: 'Include three vivid sensory details.',
    color: 'peach',
    icon: '🪐',
    posted: true,
  };

  const bundleJson = exportCurriculumBackupJson([customAssignment]);
  assert.ok(bundleJson.includes('"version": "1.0"'));
  assert.ok(bundleJson.includes('"app": "little-steps"'));
  assert.ok(bundleJson.includes('Adventures in Space'));

  const parsed = JSON.parse(bundleJson);
  assert.equal(parsed.version, '1.0');
  assert.equal(parsed.stats.assignmentsCount, 1);
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].id, 'asgn-test-101');
});

test('parseAndValidateBackupFile successfully validates standard backup bundle', () => {
  const customMaterial: MaterialEntry = {
    id: 'mat-test-202',
    kind: 'material',
    title: 'Writing Dialogue Guide',
    type: 'Guide',
    color: 'mint',
    icon: '💬',
    body: 'Use quotation marks to show speech.',
  };

  const bundleJson = exportCurriculumBackupJson([customMaterial]);
  const result = parseAndValidateBackupFile(bundleJson);

  assert.equal(result.ok, true);
  assert.ok(result.entries);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].id, 'mat-test-202');
  assert.equal(result.stats?.materialsCount, 1);
});

test('parseAndValidateBackupFile accepts raw JSON array of entries', () => {
  const rawArray = [
    {
      id: 'asgn-raw-1',
      kind: 'assignment',
      title: 'Ocean Mysteries',
      type: 'Descriptive Essay',
      taskType: 'essay',
      due: '2026-11-20',
      minutes: 25,
      description: 'Explore deep ocean trenches.',
      instructions: 'Write 150 words.',
      color: 'mint',
      posted: true,
    },
  ];

  const result = parseAndValidateBackupFile(JSON.stringify(rawArray));
  assert.equal(result.ok, true);
  assert.ok(result.entries);
  assert.equal(result.entries[0].title, 'Ocean Mysteries');
});

test('parseAndValidateBackupFile rejects invalid payloads with descriptive errors', () => {
  const invalidJson = 'not a json string';
  const res1 = parseAndValidateBackupFile(invalidJson);
  assert.equal(res1.ok, false);
  assert.ok(res1.error?.includes('Could not parse JSON'));

  const invalidSchema = JSON.stringify([{ id: 'test-bad', kind: 'assignment' }]); // missing required title, due, description, instructions
  const res2 = parseAndValidateBackupFile(invalidSchema);
  assert.equal(res2.ok, false);
  assert.ok(res2.error?.includes('is invalid'));
});

test('Storage module writes secondary disk backup and allows full export and restoration', async () => {
  const testId = `asgn-storage-test-${Date.now()}`;
  const testAssignment: AssignmentEntry = {
    id: testId,
    kind: 'assignment',
    title: 'Backup Verification Assignment',
    type: 'Essay',
    taskType: 'essay',
    due: '2026-11-25',
    minutes: 30,
    description: 'Verify storage persistence and backup mirroring.',
    instructions: 'Write full instructions.',
    color: 'mint',
    posted: true,
  };

  await upsertStoredRecord(testId, 'local_seedy', 'assignment', testAssignment as unknown as Record<string, unknown>);

  const records = await getStoredRecords('local_seedy');
  const found = records.find((r) => r.id === `local_seedy:${testId}` || r.id === testId);
  assert.ok(found, 'Record must be saved in storage');
  assert.equal((found as unknown as { title: string }).title, 'Backup Verification Assignment');

  const allExported = await exportAllStoredRecords();
  assert.ok(allExported.length > 0);
  assert.ok(allExported.some((r) => r.id.includes(testId)));

  // Test restoration helper
  const restoreCount = await restoreStoredRecords(allExported);
  assert.equal(restoreCount, allExported.length);

  // Cleanup
  await deleteStoredRecord(testId, 'local_seedy');
});
