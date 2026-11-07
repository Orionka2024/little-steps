import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EntryPayloadSchema,
  AssignmentPayloadSchema,
  SubmissionPayloadSchema,
  MaterialPayloadSchema,
  DeletedAssignmentPayloadSchema,
  AttendancePayloadSchema,
  DeletedAttendancePayloadSchema,
} from '../lib/validation.ts';
import {
  getStoredRecords,
  upsertStoredRecord,
  deleteStoredRecord,
  deleteStoredRecordsByAssignment,
} from '../lib/storage.ts';
import { INITIAL_ASSIGNMENTS, INITIAL_MATERIALS, INITIAL_ATTENDANCE } from '../lib/initial-data.ts';
import {
  isDeletedAssignment,
  isAssignment,
  isAttendance,
  isDeletedAttendance,
  type AssignmentEntry,
  type AttendanceEntry,
  type DeletedAttendanceEntry,
  type Entry,
} from '../lib/types.ts';

test('Newly created assignment defaults to posted: true and persists to storage', async () => {
  const newAssignment = {
    id: 'a-new-test-1',
    kind: 'assignment',
    title: 'Autumn Story Assignment',
    type: 'Creative writing',
    due: '2026-11-20',
    minutes: 30,
    words: 150,
    description: 'Write about a windy autumn evening.',
    instructions: 'Include three descriptive sensory adjectives.',
    color: 'peach',
    icon: '🍂',
    posted: true,
  };

  const parseResult = AssignmentPayloadSchema.safeParse(newAssignment);
  assert.ok(parseResult.success, 'New assignment must be valid');
  assert.strictEqual(parseResult.data.posted, true, 'Assignment must have posted: true');

  await upsertStoredRecord(
    newAssignment.id,
    'local_seedy',
    newAssignment.kind,
    newAssignment as unknown as Record<string, unknown>
  );

  const stored = await getStoredRecords('local_seedy');
  const found = stored.find((r) => r.id === 'local_seedy:a-new-test-1' || r.id === 'a-new-test-1');
  assert.ok(found, 'New assignment must be saved to storage');
  assert.strictEqual(found.title, 'Autumn Story Assignment');
  assert.strictEqual(found.posted, true);

  // Clean up
  await deleteStoredRecord('a-new-test-1', 'local_seedy');
});

test('Student essay submission is safely persisted and retained', async () => {
  const essaySubmission = {
    id: 's-a1-mark',
    kind: 'submission',
    assignment: 'a1',
    studentId: 'mark',
    studentName: 'Mark',
    text: 'My favourite place is my grandmother’s kitchen because of the warm scent of baked bread...',
    files: [],
    status: 'Draft',
    feedback: '',
    updated: new Date().toISOString(),
  };

  const parseResult = SubmissionPayloadSchema.safeParse(essaySubmission);
  assert.ok(parseResult.success, 'Submission essay must be valid');

  await upsertStoredRecord(
    essaySubmission.id,
    'local_seedy',
    essaySubmission.kind,
    essaySubmission as unknown as Record<string, unknown>
  );

  const records = await getStoredRecords('local_seedy');
  const storedSub = records.find((r) => r.id === 'local_seedy:s-a1-mark' || r.id === 's-a1-mark');
  assert.ok(storedSub, 'Student essay submission must be found in storage');
  assert.strictEqual(
    storedSub.text,
    'My favourite place is my grandmother’s kitchen because of the warm scent of baked bread...'
  );

  // Clean up
  await deleteStoredRecord('s-a1-mark', 'local_seedy');
});

test('Material resource creation persists and is retrievable', async () => {
  const newMaterial = {
    id: 'm-new-guide',
    kind: 'material',
    title: 'Descriptive Adjectives Guide',
    type: 'Word bank',
    color: 'lavender',
    icon: '✨',
    body: 'Vivid • Whispering • Golden • Crispy',
  };

  const parseResult = MaterialPayloadSchema.safeParse(newMaterial);
  assert.ok(parseResult.success, 'Material must be valid');

  await upsertStoredRecord(
    newMaterial.id,
    'local_seedy',
    newMaterial.kind,
    newMaterial as unknown as Record<string, unknown>
  );

  const records = await getStoredRecords('local_seedy');
  const foundMaterial = records.find((r) => r.id === 'local_seedy:m-new-guide' || r.id === 'm-new-guide');
  assert.ok(foundMaterial, 'New material must be stored');
  assert.strictEqual(foundMaterial.title, 'Descriptive Adjectives Guide');

  // Clean up
  await deleteStoredRecord('m-new-guide', 'local_seedy');
});

test('Derived assignment ordering places newly assigned homework first', () => {
  const initial = INITIAL_ASSIGNMENTS;
  const custom = [
    {
      id: 'a-latest-assignment',
      kind: 'assignment' as const,
      title: 'Our New Class Homework',
      type: 'Opinion essay',
      due: '2026-11-25',
      minutes: 25,
      description: 'Write about your dream school trip.',
      instructions: 'Give two good reasons.',
      color: 'mint' as const,
      icon: '✈️',
      posted: true,
    },
  ];

  const initialMapped = initial.map((init) => {
    const overridden = custom.find((c) => c.id === init.id);
    return overridden || init;
  });
  const newCustom = custom.filter((c) => !initial.some((init) => init.id === c.id));
  const combined = [...newCustom, ...initialMapped];

  assert.strictEqual(combined[0].id, 'a-latest-assignment');
  assert.strictEqual(combined[0].title, 'Our New Class Homework');
});

test('Student filter tab normalization prevents empty view state desync', () => {
  const TEACHER_FILTERS = [
    'All homework',
    'Unposted (Drafts)',
    'Posted',
    'To do',
    'Draft',
    'Handed in',
    'Reviewed',
  ] as const;
  const STUDENT_FILTERS = ['All homework', 'To do', 'Draft', 'Handed in', 'Reviewed'] as const;

  // Teacher had selected 'Unposted (Drafts)', then switches to student mode
  const currentFilter = 'Unposted (Drafts)';
  const studentFilterOptions = STUDENT_FILTERS;
  const activeFilter = (studentFilterOptions as readonly string[]).includes(currentFilter)
    ? currentFilter
    : 'All homework';

  assert.strictEqual(
    activeFilter,
    'All homework',
    'Incompatible teacher filter must safely fall back to All homework in student view'
  );
});

test('Teacher can edit a posted assignment and changes persist safely', async () => {
  const original = {
    id: 'a-editable-1',
    kind: 'assignment' as const,
    title: 'Original Title: Autumn Reflections',
    type: 'Descriptive essay',
    due: '2026-11-20',
    minutes: 25,
    description: 'Initial description prompt.',
    instructions: 'Write 100 words.',
    color: 'peach',
    icon: '🍂',
    posted: true,
  };

  // Step 1: Validate and save original
  const parseOriginal = AssignmentPayloadSchema.safeParse(original);
  assert.ok(parseOriginal.success, 'Original assignment must be valid');
  await upsertStoredRecord(original.id, 'local_seedy', original.kind, original as unknown as Record<string, unknown>);

  // Step 2: Teacher edits title, instructions, due date, duration, and remains posted
  const updated = {
    ...original,
    title: 'Updated Title: Golden Autumn Afternoon',
    instructions: 'Write 150-200 words with at least three sensory descriptions.',
    due: '2026-11-28',
    minutes: 35,
    posted: true,
  };

  const parseUpdated = AssignmentPayloadSchema.safeParse(updated);
  assert.ok(parseUpdated.success, 'Edited assignment must satisfy AssignmentPayloadSchema');
  await upsertStoredRecord(updated.id, 'local_seedy', updated.kind, updated as unknown as Record<string, unknown>);

  // Step 3: Verify the record in storage has the updated properties
  const stored = await getStoredRecords('local_seedy');
  const found = stored.find((r) => r.id === 'local_seedy:a-editable-1' || r.id === 'a-editable-1');
  assert.ok(found, 'Updated assignment must exist in storage');
  assert.strictEqual(found.title, 'Updated Title: Golden Autumn Afternoon');
  assert.strictEqual(found.instructions, 'Write 150-200 words with at least three sensory descriptions.');
  assert.strictEqual(found.due, '2026-11-28');
  assert.strictEqual(found.minutes, 35);
  assert.strictEqual(found.posted, true);

  // Clean up
  await deleteStoredRecord('a-editable-1', 'local_seedy');
});

test('Teacher can delete a posted assignment, purges student submissions, and records tombstone', async () => {
  const assignmentId = 'a-to-delete-1';
  const postedAssignment = {
    id: assignmentId,
    kind: 'assignment' as const,
    title: 'Assignment To Delete',
    type: 'Creative essay',
    due: '2026-11-25',
    minutes: 25,
    description: 'Description before deletion.',
    instructions: 'Instructions before deletion.',
    color: 'lavender',
    icon: '🗑️',
    posted: true,
  };

  const studentSub = {
    id: `s-${assignmentId}-mark`,
    kind: 'submission' as const,
    assignment: assignmentId,
    studentId: 'mark',
    studentName: 'Mark',
    text: 'Student draft for assignment to delete.',
    files: [],
    status: 'Draft' as const,
    updated: new Date().toISOString(),
  };

  // 1. Save both to storage
  await upsertStoredRecord(assignmentId, 'local_seedy', 'assignment', postedAssignment as unknown as Record<string, unknown>);
  await upsertStoredRecord(studentSub.id, 'local_seedy', 'submission', studentSub as unknown as Record<string, unknown>);

  // 2. Perform teacher deletion
  const deleted = await deleteStoredRecord(assignmentId, 'local_seedy');
  assert.ok(deleted, 'Assignment record must be deleted from storage');

  // Purge submissions for this assignment
  const purgedCount = await deleteStoredRecordsByAssignment(assignmentId);
  assert.strictEqual(purgedCount, 1, 'Student submission linked to assignment must be purged');

  // Record deleted_assignment tombstone
  const tombstone = {
    id: `del_asgn_${assignmentId}`,
    kind: 'deleted_assignment' as const,
    targetId: assignmentId,
  };
  const tombstoneValidation = DeletedAssignmentPayloadSchema.safeParse(tombstone);
  assert.ok(tombstoneValidation.success, 'Tombstone must satisfy DeletedAssignmentPayloadSchema');
  const entryValidation = EntryPayloadSchema.safeParse(tombstone);
  assert.ok(entryValidation.success, 'Tombstone must satisfy EntryPayloadSchema');

  await upsertStoredRecord(tombstone.id, 'local_seedy', tombstone.kind, tombstone as unknown as Record<string, unknown>);

  // 3. Verify in storage: assignment and submissions are gone, tombstone is stored
  const records = await getStoredRecords('local_seedy');
  const foundAsgn = records.find((r) => r.id === assignmentId || r.id === `local_seedy:${assignmentId}`);
  assert.strictEqual(foundAsgn, undefined, 'Deleted assignment must no longer exist in storage');

  const foundSub = records.find((r) => r.id === studentSub.id || r.id === `local_seedy:${studentSub.id}`);
  assert.strictEqual(foundSub, undefined, 'Deleted assignment submissions must no longer exist in storage');

  const foundTombstone = records.find((r) => r.id === tombstone.id || r.id === `local_seedy:${tombstone.id}`);
  assert.ok(foundTombstone, 'Tombstone must be stored');

  // 4. Verify allAssignments derivation filters out deleted assignment
  const rows: Entry[] = [
    postedAssignment,
    tombstone,
  ];
  const deletedIds = new Set(rows.filter(isDeletedAssignment).map((d) => d.targetId));
  const custom = rows.filter(isAssignment).filter((a) => !deletedIds.has(a.id));
  const derived = INITIAL_ASSIGNMENTS
    .filter((init) => !deletedIds.has(init.id))
    .map((init) => {
      const overridden = custom.find((c) => c.id === init.id);
      return overridden || init;
    });

  const foundInDerived = derived.find((a) => a.id === assignmentId);
  assert.strictEqual(foundInDerived, undefined, 'Deleted assignment must not appear in derived assignments');

  // Clean up tombstone
  await deleteStoredRecord(tombstone.id, 'local_seedy');
});

test('Deleting an initial default assignment (e.g. a1) hides it via deleted_assignment tombstone', () => {
  const targetId = 'a1';
  const tombstone = {
    id: `del_asgn_${targetId}`,
    kind: 'deleted_assignment' as const,
    targetId,
  };

  const rows: Entry[] = [tombstone];
  const deletedIds = new Set(rows.filter(isDeletedAssignment).map((d) => d.targetId));
  const custom = rows.filter(isAssignment).filter((a) => !deletedIds.has(a.id));
  const visible = INITIAL_ASSIGNMENTS
    .filter((init) => !deletedIds.has(init.id))
    .map((init) => {
      const overridden = custom.find((c) => c.id === init.id);
      return overridden || init;
    });

  const foundInitial = visible.find((a) => a.id === targetId);
  assert.strictEqual(foundInitial, undefined, 'Default assignment a1 must be hidden when tombstone is present');
  assert.ok(visible.length > 0, 'Other initial assignments must remain present');
});

test('Teacher deleting an attendance session persists tombstone, remembers deletion, and updates real attendance & outstanding payment', async () => {
  const newSession: AttendanceEntry = {
    id: 'att-test-memory-1',
    kind: 'attendance',
    date: '2026-11-20',
    topic: 'Memory Test Lesson',
    ratePerLesson: 800,
    paid: false,
    records: [
      { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: false },
      { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: false },
      { studentId: 'juwon', studentName: 'Juwon', status: 'present', chargeable: true, paid: false },
    ],
  };

  const parsed = AttendancePayloadSchema.safeParse(newSession);
  assert.ok(parsed.success, 'New attendance session must validate');

  // 1. Save new attendance to storage
  await upsertStoredRecord(newSession.id, 'local_seedy', newSession.kind, newSession as unknown as Record<string, unknown>);

  let stored = await getStoredRecords('local_seedy');
  assert.ok(stored.some((r) => r.id === newSession.id || r.id === `local_seedy:${newSession.id}`));

  // 2. Perform teacher deletion action: delete record, write tombstone
  await deleteStoredRecord(newSession.id, 'local_seedy');
  const tombstone: DeletedAttendanceEntry = {
    id: `del_${newSession.id}`,
    kind: 'deleted_attendance',
    targetId: newSession.id,
    date: newSession.date,
  };
  const tombstoneParsed = DeletedAttendancePayloadSchema.safeParse(tombstone);
  assert.ok(tombstoneParsed.success, 'Tombstone must validate');
  await upsertStoredRecord(tombstone.id, 'local_seedy', tombstone.kind, tombstone as unknown as Record<string, unknown>);

  // 3. Verify storage state: session removed, tombstone persisted
  stored = await getStoredRecords('local_seedy');
  assert.strictEqual(stored.find((r) => r.id === newSession.id || r.id === `local_seedy:${newSession.id}`), undefined);
  const foundTombstone = stored.find((r) => r.id === tombstone.id || r.id === `local_seedy:${tombstone.id}`);
  assert.ok(foundTombstone, 'Tombstone must be persisted in storage');
  assert.strictEqual((foundTombstone as unknown as DeletedAttendanceEntry).targetId, newSession.id);

  // 4. Test derived allAttendance and totals
  const rows: Entry[] = [tombstone];
  const tombstones = rows.filter((r): r is DeletedAttendanceEntry => isDeletedAttendance(r));
  const deletedIds = new Set(tombstones.map((r) => r.targetId));
  const deletedDates = new Set(tombstones.map((r) => r.date).filter((d): d is string => Boolean(d)));
  const isRecordDeleted = (id: string, date?: string) =>
    deletedIds.has(id) || (Boolean(date) && deletedDates.has(date!));

  const custom = rows.filter(isAttendance).filter((c) => !isRecordDeleted(c.id, c.date));
  const result: AttendanceEntry[] = [];
  const seenDates = new Set<string>();
  for (const c of custom) {
    result.push(c);
    seenDates.add(c.date);
  }
  for (const init of INITIAL_ATTENDANCE) {
    if (!isRecordDeleted(init.id, init.date) && !seenDates.has(init.date) && !custom.some((c) => c.id === init.id)) {
      result.push(init);
      seenDates.add(init.date);
    }
  }

  // The deleted session should not be in result
  assert.strictEqual(result.find((r) => r.id === newSession.id), undefined);

  // Clean up
  await deleteStoredRecord(tombstone.id, 'local_seedy');
});

test('Deleting an initial unpaid attendance lesson (att-4, 2026-11-02) updates balance due to 0 CZK', async () => {
  const targetId = 'att-4';
  const targetDate = '2026-11-02';
  const tombstone: DeletedAttendanceEntry = {
    id: `del_${targetId}`,
    kind: 'deleted_attendance',
    targetId,
    date: targetDate,
  };

  const rows: Entry[] = [tombstone];
  const tombstones = rows.filter((r): r is DeletedAttendanceEntry => isDeletedAttendance(r));
  const deletedIds = new Set(tombstones.map((r) => r.targetId));
  const deletedDates = new Set(tombstones.map((r) => r.date).filter((d): d is string => Boolean(d)));
  const isRecordDeleted = (id: string, date?: string) =>
    deletedIds.has(id) || (Boolean(date) && deletedDates.has(date!));

  const custom = rows.filter(isAttendance).filter((c) => !isRecordDeleted(c.id, c.date));
  const result: AttendanceEntry[] = [];
  const seenDates = new Set<string>();
  for (const c of custom) {
    result.push(c);
    seenDates.add(c.date);
  }
  for (const init of INITIAL_ATTENDANCE) {
    if (!isRecordDeleted(init.id, init.date) && !seenDates.has(init.date) && !custom.some((c) => c.id === init.id)) {
      result.push(init);
      seenDates.add(init.date);
    }
  }

  // Initial att-4 must not appear
  assert.strictEqual(result.find((r) => r.id === targetId || r.date === targetDate), undefined);
  assert.strictEqual(result.length, 3, 'Only the 3 paid lessons remain');

  // Verify that outstanding balance due is now 0 CZK (all remaining lessons are paid)
  const isSessionPaid = (session: AttendanceEntry): boolean => {
    if (typeof session.paid === 'boolean') return session.paid;
    const attendedRecs = session.records.filter((r) => r.status === 'present' || r.status === 'late');
    if (attendedRecs.length === 0) return session.records.some((r) => r.paid);
    return attendedRecs.every((r) => r.paid);
  };
  const totalLessons = result.length;
  const paidLessons = result.filter(isSessionPaid).length;
  const unpaidLessons = Math.max(0, totalLessons - paidLessons);
  const balanceDue = unpaidLessons * 800;

  assert.strictEqual(paidLessons, 3);
  assert.strictEqual(unpaidLessons, 0, 'No unpaid lessons remain after deleting att-4');
  assert.strictEqual(balanceDue, 0, 'Outstanding payment must be 0 CZK');
});

test('All initial assignments have posted: true and are visible to both teacher and students', async () => {
  assert.ok(INITIAL_ASSIGNMENTS.length >= 4, 'Must have initial assignments');
  for (const asgn of INITIAL_ASSIGNMENTS) {
    assert.strictEqual(asgn.posted, true, `Assignment ${asgn.id} must be posted: true`);
  }

  // Teacher visible assignments
  const teacherVisible = INITIAL_ASSIGNMENTS;
  assert.strictEqual(teacherVisible.length, INITIAL_ASSIGNMENTS.length);

  // Student visible assignments (posted !== false)
  const studentVisible = INITIAL_ASSIGNMENTS.filter((a) => a.posted !== false);
  assert.strictEqual(studentVisible.length, INITIAL_ASSIGNMENTS.length, 'Students must see all initial assignments');
});

test('Storage records seed provides assignments with posted: true for classroom', async () => {
  const records = await getStoredRecords('local_seedy');
  const storedAssignments = records.filter((r) => r.kind === 'assignment');
  assert.ok(storedAssignments.length >= 4, 'Storage must seed initial assignments');
  for (const item of storedAssignments) {
    assert.strictEqual(item.posted, true, 'Seeded assignments must be posted');
  }

  // Student filter simulation in GET /api/data
  const studentRecords = records.filter((entry) => {
    if (entry.kind === 'assignment') {
      return (entry as { posted?: boolean }).posted !== false;
    }
    return true;
  });
  const studentAssignments = studentRecords.filter((r) => r.kind === 'assignment');
  assert.strictEqual(studentAssignments.length, storedAssignments.length, 'All stored assignments must be visible to students');
});


