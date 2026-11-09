import { getCurrentUser } from '../../../lib/auth-server';
import {
  getStoredRecords,
  upsertStoredRecord,
  upsertStoredRecords,
  deleteStoredRecord,
  deleteStoredRecordsByStudent,
  deleteStoredRecordsByAssignment,
} from '../../../lib/storage';
import { EntryPayloadSchema, type ValidatedEntry } from '../../../lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const entries = await getStoredRecords('local_seedy');
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  };

  return Response.json(entries, { headers });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const roleHeader = req.headers.get('x-user-role') || user?.role || 'Student';

  const bodyText = await req.text();
  if (bodyText.length > 600000) {
    return Response.json(
      { error: 'This entry is too long.' },
      { status: 413 }
    );
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const effectiveRole = user?.role === 'Teacher' || roleHeader === 'Teacher' ? 'Teacher' : 'Student';
  const isBatch = Array.isArray(rawJson);
  const itemsToValidate = isBatch ? (rawJson as unknown[]) : [rawJson];

  const validatedList: ValidatedEntry[] = [];
  for (const item of itemsToValidate) {
    const parseResult = EntryPayloadSchema.safeParse(item);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors.map((e) => e.message).join(', ');
      return Response.json(
        { error: `Validation error: ${errorDetails}` },
        { status: 400 }
      );
    }

    const validated = parseResult.data;

    // Server-side authorization guard
    if (
      (validated.kind === 'assignment' ||
        validated.kind === 'material' ||
        validated.kind === 'attendance' ||
        validated.kind === 'billing_config' ||
        validated.kind === 'deleted_attendance' ||
        validated.kind === 'deleted_assignment') &&
      effectiveRole !== 'Teacher'
    ) {
      return Response.json(
        { error: 'Only teachers can create or modify assignments, materials, or attendance.' },
        { status: 403 }
      );
    }

    validatedList.push(validated);
  }

  // Clear tombstones if an attendance record is saved
  for (const item of validatedList) {
    if (item.kind === 'attendance') {
      await deleteStoredRecord(`del_${item.id}`, 'local_seedy');
      if (item.date) {
        await deleteStoredRecord(`del_att-${item.date}`, 'local_seedy');
      }
    }
  }

  if (validatedList.length === 1 && !isBatch) {
    const single = validatedList[0];
    await upsertStoredRecord(
      single.id,
      'local_seedy',
      single.kind,
      single as unknown as Record<string, unknown>
    );
  } else if (validatedList.length > 0) {
    await upsertStoredRecords(
      validatedList.map((item) => ({
        id: item.id,
        owner: 'local_seedy',
        kind: item.kind,
        data: item as unknown as Record<string, unknown>,
      }))
    );
  }

  return Response.json({ ok: true, count: validatedList.length });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  const roleHeader = req.headers.get('x-user-role') || user?.role;
  const effectiveRole = user?.role === 'Teacher' || roleHeader === 'Teacher' ? 'Teacher' : 'Student';

  // Only teachers are authorized to delete classroom records, assignments, materials, or submissions
  if (effectiveRole !== 'Teacher') {
    return Response.json(
      { error: 'Only teachers can delete classroom records.' },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const date = url.searchParams.get('date');
  const studentId = url.searchParams.get('studentId');

  if (studentId) {
    const count = await deleteStoredRecordsByStudent(studentId);
    return Response.json({ ok: true, removed: count });
  }

  if (id) {
    const success = await deleteStoredRecord(id, 'local_seedy');
    // If an attendance record is deleted, record a tombstone so initial seed data doesn't resurrect it
    if (id.startsWith('att-') || id.includes('att')) {
      await upsertStoredRecord(`del_${id}`, 'local_seedy', 'deleted_attendance', {
        id: `del_${id}`,
        kind: 'deleted_attendance',
        targetId: id,
        ...(date ? { date } : {}),
      });
    } else if (!id.startsWith('s-')) {
      // Record tombstone for deleted assignment so initial seed data doesn't resurrect it
      await upsertStoredRecord(`del_asgn_${id}`, 'local_seedy', 'deleted_assignment', {
        id: `del_asgn_${id}`,
        kind: 'deleted_assignment',
        targetId: id,
      });
      // Clean up student submissions associated with this assignment
      await deleteStoredRecordsByAssignment(id);
    }
    return Response.json({ ok: true, deleted: success });
  }

  return Response.json(
    { error: 'Missing id or studentId parameter.' },
    { status: 400 }
  );
}
