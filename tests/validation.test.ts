import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EntryPayloadSchema,
  AssignmentPayloadSchema,
  SubmissionPayloadSchema,
  MaterialPayloadSchema,
  MessagePayloadSchema,
  FileAttachmentSchema,
  InteractiveActivitySchema,
  FlashCardsActivitySchema,
  AttendancePayloadSchema,
  BillingConfigPayloadSchema,
} from '../lib/validation.ts';
import {
  INITIAL_ASSIGNMENTS,
  INITIAL_MATERIALS,
  INITIAL_ATTENDANCE,
  INITIAL_BILLING_CONFIG,
} from '../lib/initial-data.ts';


test('FileAttachmentSchema validates file constraints', () => {
  const validFile = {
    key: 'user123/file.pdf',
    name: 'essay.pdf',
    size: 5000,
  };
  assert.ok(FileAttachmentSchema.safeParse(validFile).success);

  // Exceeds 10MB
  const oversizeFile = {
    key: 'user123/huge.pdf',
    name: 'huge.pdf',
    size: 11 * 1024 * 1024,
  };
  assert.strictEqual(FileAttachmentSchema.safeParse(oversizeFile).success, false);
});

test('AssignmentPayloadSchema validates required assignment fields', () => {
  const validAssignment = {
    id: 'a100',
    kind: 'assignment',
    title: 'My Favourite Memory',
    type: 'Descriptive essay',
    due: '2026-11-15',
    minutes: 25,
    description: 'Write about a memorable experience.',
    instructions: 'Tell us who was there and how it felt.',
    color: 'peach',
  };
  const result = AssignmentPayloadSchema.safeParse(validAssignment);
  assert.ok(result.success);
  if (result.success) {
    assert.strictEqual(result.data.posted, true, 'Should default posted to true so homework is visible');
  }

  const unpostedAssignment = {
    ...validAssignment,
    id: 'a100-unposted',
    posted: false,
  };
  const unpostedResult = AssignmentPayloadSchema.safeParse(unpostedAssignment);
  assert.ok(unpostedResult.success);
  if (unpostedResult.success) {
    assert.strictEqual(unpostedResult.data.posted, false, 'Should accept explicit posted: false');
  }

  // Missing title
  const invalid = {
    id: 'a101',
    kind: 'assignment',
    type: 'Opinion',
  };
  assert.strictEqual(AssignmentPayloadSchema.safeParse(invalid).success, false);
});

test('InteractiveActivitySchema validates quiz and word scramble edutainment', () => {
  const quiz = {
    type: 'quiz',
    title: 'Warm-up Quiz',
    questions: [
      {
        question: 'What is a metaphor?',
        options: ['Direct comparison', 'A vegetable', 'A punctuation mark'],
        correctIndex: 0,
        explanation: 'A metaphor compares two things directly.',
      },
    ],
  };
  assert.ok(InteractiveActivitySchema.safeParse(quiz).success);

  const wordScramble = {
    type: 'word_scramble',
    title: 'Spelling Hunt',
    words: [
      {
        scrambled: 'COZY',
        word: 'COZY',
        hint: 'Warm and comfortable',
      },
    ],
  };
  assert.ok(InteractiveActivitySchema.safeParse(wordScramble).success);

  const connectors = {
    type: 'connecting_words',
    title: 'Connector Challenge',
    pairs: [
      {
        phrase: 'However',
        category: 'Show a difference',
      },
    ],
  };
  assert.ok(InteractiveActivitySchema.safeParse(connectors).success);

  const flashcards = {
    type: 'flashcards',
    title: 'Week 2 Vocabulary Cards',
    cards: [
      {
        front: 'MOMENTOUS',
        back: 'Of great importance or significance.',
        hint: 'Adjective',
      },
      {
        front: 'VIVID',
        back: 'Producing powerful clear images.',
      },
    ],
  };
  assert.ok(FlashCardsActivitySchema.safeParse(flashcards).success);
  assert.ok(InteractiveActivitySchema.safeParse(flashcards).success);

  const flashcardAssignment = {
    id: 'a-flashcards-1',
    kind: 'assignment',
    taskType: 'flashcards',
    title: 'Sensory Words Deck',
    type: 'Vocabulary Flash Cards',
    due: '2026-11-20',
    description: 'Master these 2 words.',
    instructions: 'Flip through the cards and test your recall.',
    interactive: flashcards,
  };
  const parsedFc = AssignmentPayloadSchema.safeParse(flashcardAssignment);
  assert.ok(parsedFc.success);
  if (parsedFc.success) {
    assert.strictEqual(parsedFc.data.taskType, 'flashcards');
  }
});

test('SubmissionPayloadSchema handles draft, student attribution, and edutainment score', () => {
  const validSubmission = {
    id: 's-a1-hajun',
    kind: 'submission',
    assignment: 'a1',
    studentId: 'hajun',
    studentName: 'Hajun',
    text: 'Once upon a time in autumn...',
    files: [
      {
        key: 'user/img1.png',
        name: 'img1.png',
        size: 1024,
      },
    ],
    status: 'Handed in',
    feedback: 'Great opening paragraph!',
    activityScore: {
      score: 3,
      total: 3,
      completedAt: new Date().toISOString(),
    },
    scorecard: {
      ideas: 3,
      structure: 3,
      development: 3,
      vocabulary: 3,
      grammar: 3,
      total: 15,
      targetSkills: ['Ideas and originality', 'Structure and organisation'],
      interpretation: 'Developing: identify two skills for targeted improvement.',
      assessedWeek: 'Week 1',
      assessedAt: new Date().toISOString(),
    },
  };
  const parsed = SubmissionPayloadSchema.safeParse(validSubmission);
  assert.ok(parsed.success);
  assert.strictEqual(parsed.data.scorecard?.total, 15);
  assert.strictEqual(parsed.data.scorecard?.targetSkills.length, 2);
});

test('MessagePayloadSchema validates student and teacher chat', () => {
  const validMessage = {
    id: 'msg-1',
    kind: 'message',
    text: 'Could you give an example of a good transition word?',
    sender: 'Hajun',
    studentId: 'hajun',
    time: new Date().toISOString(),
  };
  assert.ok(MessagePayloadSchema.safeParse(validMessage).success);

  // Empty text should fail
  const emptyMessage = {
    id: 'msg-2',
    kind: 'message',
    text: '',
    sender: 'Teacher',
    time: new Date().toISOString(),
  };
  assert.strictEqual(MessagePayloadSchema.safeParse(emptyMessage).success, false);
});

test('EntryPayloadSchema validates through discriminated union', () => {
  const assignmentEntry = {
    id: 'a-union',
    kind: 'assignment',
    title: 'Autumn Leaves',
    type: 'Poem',
    due: '2026-12-01',
    description: 'Describe autumn colors.',
    instructions: 'Use sensory details.',
  };
  const parsed = EntryPayloadSchema.safeParse(assignmentEntry);
  assert.ok(parsed.success);

  const unknownKind = {
    id: 'unknown-1',
    kind: 'unsupported_type',
  };
  assert.strictEqual(EntryPayloadSchema.safeParse(unknownKind).success, false);
});

test('Initial datasets adhere to domain constraints and interactive rules', () => {
  for (const assignment of INITIAL_ASSIGNMENTS) {
    const result = AssignmentPayloadSchema.safeParse(assignment);
    assert.ok(result.success, `Initial assignment ${assignment.id} must be valid`);
    assert.strictEqual(
      assignment.posted,
      true,
      `Initial assignment ${assignment.id} must be posted (posted: true) so it is visible to students and teacher`
    );
  }

  for (const material of INITIAL_MATERIALS) {
    const result = MaterialPayloadSchema.safeParse(material);
    assert.ok(result.success, `Initial material ${material.id} must be valid`);
  }

  for (const att of INITIAL_ATTENDANCE) {
    const result = AttendancePayloadSchema.safeParse(att);
    assert.ok(result.success, `Initial attendance session ${att.id} must be valid`);
    const entryResult = EntryPayloadSchema.safeParse(att);
    assert.ok(entryResult.success, `Initial attendance session ${att.id} must pass EntryPayloadSchema`);
  }

  const billingResult = BillingConfigPayloadSchema.safeParse(INITIAL_BILLING_CONFIG);
  assert.ok(billingResult.success, 'Initial billing config must be valid');
  const billingEntryResult = EntryPayloadSchema.safeParse(INITIAL_BILLING_CONFIG);
  assert.ok(billingEntryResult.success, 'Initial billing config must pass EntryPayloadSchema');
});

test('AttendancePayloadSchema validates session attendance and chargeable lesson tracking', () => {
  const validSession = {
    id: 'att-test-1',
    kind: 'attendance',
    date: '2026-11-02',
    topic: 'Sensory Detail Workshop',
    durationMinutes: 60,
    records: [
      {
        studentId: 'hajun',
        studentName: 'Hajun',
        status: 'present',
        chargeable: true,
        note: 'Participated actively',
      },
      {
        studentId: 'mark',
        studentName: 'Mark',
        status: 'late',
        chargeable: true,
      },
      {
        studentId: 'juwon',
        studentName: 'Juwon',
        status: 'absent',
        chargeable: false,
        note: 'Excused',
      },
    ],
  };
  const result = AttendancePayloadSchema.safeParse(validSession);
  assert.ok(result.success);
  if (result.success) {
    assert.strictEqual(result.data.records.length, 3);
    assert.strictEqual(result.data.records.filter((r) => r.chargeable).length, 2);
  }

  // Invalid session without topic or records
  const invalidSession = {
    id: 'att-invalid',
    kind: 'attendance',
    date: '2026-11-02',
    records: 'not an array',
  };
  assert.strictEqual(AttendancePayloadSchema.safeParse(invalidSession).success, false);
});

test('BillingConfigPayloadSchema validates default rates and student profiles', () => {
  const config = {
    id: 'billing_global',
    kind: 'billing_config',
    defaultRate: 45,
    currency: '₩',
    profiles: {
      hajun: {
        studentId: 'hajun',
        ratePerLesson: 50,
        paidLessonsCount: 4,
      },
    },
  };
  const result = BillingConfigPayloadSchema.safeParse(config);
  assert.ok(result.success);
  if (result.success) {
    assert.strictEqual(result.data.defaultRate, 45);
    assert.strictEqual(result.data.currency, '₩');
    assert.strictEqual(result.data.profiles.hajun.paidLessonsCount, 4);
  }
});

test('DeletedAttendancePayloadSchema validates tombstones in EntryPayloadSchema', () => {
  const tombstone = {
    id: 'del_att-1',
    kind: 'deleted_attendance',
    targetId: 'att-1',
    date: '2026-10-12',
  };
  const result = EntryPayloadSchema.safeParse(tombstone);
  assert.ok(result.success);
  if (result.success) {
    assert.strictEqual(result.data.kind, 'deleted_attendance');
    assert.strictEqual((result.data as { targetId: string }).targetId, 'att-1');
    assert.strictEqual((result.data as { date?: string }).date, '2026-10-12');
  }
});

test('CLASSROOM_USERS have unique and distinct passwords matching user specification', async () => {
  const { CLASSROOM_USERS } = await import('../lib/auth-types.ts');
  const passwords = CLASSROOM_USERS.map((u) => u.password);
  const uniquePasswords = new Set(passwords);

  // All passwords must be unique
  assert.strictEqual(uniquePasswords.size, CLASSROOM_USERS.length);

  assert.strictEqual(CLASSROOM_USERS.find((u) => u.username === 'hajun')?.password, 'Hjn2015');
  assert.strictEqual(CLASSROOM_USERS.find((u) => u.username === 'mark')?.password, 'Mrk1004');
  assert.strictEqual(CLASSROOM_USERS.find((u) => u.username === 'juwon')?.password, 'Jwn1122');
});

test('upsertStoredRecords and batch attendance entries are safely validated and persisted', async () => {
  const { upsertStoredRecords, getStoredRecords } = await import('../lib/storage.ts');

  const batchSessions = [
    {
      id: 'att-batch-1',
      kind: 'attendance',
      date: '2026-11-09',
      topic: 'Lesson 5',
      ratePerLesson: 800,
      paid: true,
      records: [
        { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: true },
        { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: true },
        { studentId: 'juwon', studentName: 'Juwon', status: 'present', chargeable: true, paid: true },
      ],
    },
    {
      id: 'att-batch-2',
      kind: 'attendance',
      date: '2026-11-16',
      topic: 'Lesson 6',
      ratePerLesson: 800,
      paid: false,
      records: [
        { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: false },
        { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: false },
        { studentId: 'juwon', studentName: 'Juwon', status: 'absent', chargeable: false, paid: false },
      ],
    },
  ];

  // Every item validates against EntryPayloadSchema
  for (const session of batchSessions) {
    const parsed = EntryPayloadSchema.safeParse(session);
    assert.ok(parsed.success, `Failed to validate ${session.id}`);
  }

  await upsertStoredRecords(
    batchSessions.map((b) => ({
      id: b.id,
      owner: 'local_seedy',
      kind: b.kind,
      data: b,
    }))
  );

  const stored = await getStoredRecords('local_seedy');
  const found1 = stored.find((s) => s.id === 'local_seedy:att-batch-1' || s.id === 'att-batch-1');
  const found2 = stored.find((s) => s.id === 'local_seedy:att-batch-2' || s.id === 'att-batch-2');

  assert.ok(found1, 'att-batch-1 should be stored');
  assert.ok(found2, 'att-batch-2 should be stored');
  assert.strictEqual((found1 as { ratePerLesson?: number }).ratePerLesson, 800);

  // Clean up test batch entries so they do not pollute storage
  const { deleteStoredRecord } = await import('../lib/storage.ts');
  await deleteStoredRecord('att-batch-1', 'local_seedy');
  await deleteStoredRecord('att-batch-2', 'local_seedy');
});

test('INITIAL_BILLING_CONFIG defaultRate is 900 CZK with 300 CZK each student', () => {
  assert.strictEqual(INITIAL_BILLING_CONFIG.defaultRate, 900);
  assert.strictEqual(INITIAL_BILLING_CONFIG.currency, 'CZK');
  assert.strictEqual(INITIAL_BILLING_CONFIG.profiles.hajun.ratePerLesson, 300);
  assert.strictEqual(INITIAL_BILLING_CONFIG.profiles.mark.ratePerLesson, 300);
  assert.strictEqual(INITIAL_BILLING_CONFIG.profiles.juwon.ratePerLesson, 300);

  // BillingConfigPayloadSchema default is 900
  const parsedDefault = BillingConfigPayloadSchema.parse({
    id: 'billing_global',
    kind: 'billing_config',
  });
  assert.strictEqual(parsedDefault.defaultRate, 900);
});

test('AttendancePayloadSchema defaults to 900 CZK and validates manual lesson price entry', async () => {
  const { upsertStoredRecord, getStoredRecords, deleteStoredRecord } = await import('../lib/storage.ts');

  // 1. Session without ratePerLesson defaults to 900
  const defaultSession = {
    id: 'att-test-default-rate',
    kind: 'attendance',
    date: '2026-11-23',
    records: [
      { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true },
    ],
  };
  const parsedDefault = AttendancePayloadSchema.parse(defaultSession);
  assert.strictEqual(parsedDefault.ratePerLesson, 900);

  // 2. Manual teacher entry with custom lesson price (e.g. 950 CZK)
  const customSession = {
    id: 'att-test-custom-price',
    kind: 'attendance',
    date: '2026-11-30',
    topic: 'Advanced Essay Workshop',
    ratePerLesson: 950,
    paid: false,
    records: [
      { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: false },
      { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: false },
      { studentId: 'juwon', studentName: 'Juwon', status: 'present', chargeable: true, paid: false },
    ],
  };
  const parsedCustom = EntryPayloadSchema.safeParse(customSession);
  assert.ok(parsedCustom.success);
  if (parsedCustom.success) {
    assert.strictEqual((parsedCustom.data as { ratePerLesson?: number }).ratePerLesson, 950);
  }

  // Persist custom price session to storage and retrieve
  await upsertStoredRecord(customSession.id, 'local_seedy', customSession.kind, customSession as unknown as Record<string, unknown>);
  const stored = await getStoredRecords('local_seedy');
  const found = stored.find((s) => s.id === customSession.id || s.id === `local_seedy:${customSession.id}`);
  assert.ok(found);
  assert.strictEqual((found as { ratePerLesson?: number }).ratePerLesson, 950);

  // Clean up
  await deleteStoredRecord(customSession.id, 'local_seedy');
});

test('Price history calculation preserves historical rates (800 CZK) alongside new rates (900 CZK) and custom rates', () => {
  // Simulate a session history:
  // - 3 paid lessons at 800 CZK (historical) = 2,400 CZK
  // - 1 unpaid lesson at 800 CZK (historical) = 800 CZK
  // - 1 new unpaid lesson at 900 CZK = 900 CZK
  // - 1 new paid lesson at 900 CZK = 900 CZK
  // - 1 special workshop at 1000 CZK (unpaid) = 1000 CZK
  const sessions = [
    { id: '1', date: '2026-10-12', ratePerLesson: 800, paid: true },
    { id: '2', date: '2026-10-19', ratePerLesson: 800, paid: true },
    { id: '3', date: '2026-10-26', ratePerLesson: 800, paid: true },
    { id: '4', date: '2026-11-02', ratePerLesson: 800, paid: false },
    { id: '5', date: '2026-11-09', ratePerLesson: 900, paid: false },
    { id: '6', date: '2026-11-16', ratePerLesson: 900, paid: true },
    { id: '7', date: '2026-11-23', ratePerLesson: 1000, paid: false },
  ];

  const currentDefaultRate = 900;

  const totalLessons = sessions.length;
  const paidLessons = sessions.filter((s) => s.paid).length;
  const unpaidLessons = sessions.filter((s) => !s.paid).length;

  const totalCharged = sessions.reduce((sum, s) => sum + (s.ratePerLesson ?? currentDefaultRate), 0);
  const totalPaid = sessions.filter((s) => s.paid).reduce((sum, s) => sum + (s.ratePerLesson ?? currentDefaultRate), 0);
  const balanceDue = sessions.filter((s) => !s.paid).reduce((sum, s) => sum + (s.ratePerLesson ?? currentDefaultRate), 0);

  // 800*4 + 900*2 + 1000 = 3200 + 1800 + 1000 = 6000
  assert.strictEqual(totalLessons, 7);
  assert.strictEqual(paidLessons, 4);
  assert.strictEqual(unpaidLessons, 3);
  assert.strictEqual(totalCharged, 6000);
  // Paid: 800*3 + 900 = 2400 + 900 = 3300
  assert.strictEqual(totalPaid, 3300);
  // Due: 800 (lesson 4) + 900 (lesson 5) + 1000 (lesson 7) = 2700
  assert.strictEqual(balanceDue, 2700);

  // Verify that price history groups into distinct tiers: 1000, 900, 800
  const tiers = new Map<number, number>();
  for (const s of sessions) {
    const rate = s.ratePerLesson ?? currentDefaultRate;
    tiers.set(rate, (tiers.get(rate) || 0) + 1);
  }
  assert.strictEqual(tiers.get(800), 4, '4 lessons at 800 CZK historical rate');
  assert.strictEqual(tiers.get(900), 2, '2 lessons at 900 CZK standard rate');
  assert.strictEqual(tiers.get(1000), 1, '1 lesson at 1000 CZK custom rate');
});



