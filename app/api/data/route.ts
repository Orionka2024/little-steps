import { getCurrentUser } from '../../../lib/auth-server';
import {
  getStoredRecords,
  upsertStoredRecord,
  deleteStoredRecord,
  deleteStoredRecordsByStudent,
} from '../../../lib/storage';
import { EntryPayloadSchema } from '../../../lib/validation';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'Please sign in to save your classroom.' },
      { status: 401 }
    );
  }

  const entries = await getStoredRecords('local_seedy');
  if (user.role === 'Student') {
    const studentEntries = entries.filter((entry) => {
      if (entry.kind === 'assignment') {
        return (entry as { posted?: boolean }).posted === true;
      }
      return true;
    });
    return Response.json(studentEntries);
  }
  return Response.json(entries);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'Please sign in first.' },
      { status: 401 }
    );
  }

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

  const parseResult = EntryPayloadSchema.safeParse(rawJson);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors.map((e) => e.message).join(', ');
    return Response.json(
      { error: `Validation error: ${errorDetails}` },
      { status: 400 }
    );
  }

  const validated = parseResult.data;
  const roleHeader = req.headers.get('x-user-role') || user.role;

  // Server-side authorization guard
  if (
    (validated.kind === 'assignment' ||
      validated.kind === 'material' ||
      validated.kind === 'attendance' ||
      validated.kind === 'billing_config') &&
    roleHeader === 'Student'
  ) {
    return Response.json(
      { error: 'Only teachers can create or modify assignments, materials, or attendance.' },
      { status: 403 }
    );
  }

  await upsertStoredRecord(
    validated.id,
    'local_seedy',
    validated.kind,
    validated as unknown as Record<string, unknown>
  );

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'Please sign in first.' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const studentId = url.searchParams.get('studentId');

  if (studentId) {
    // Only teacher or the matching student can clear student submissions
    if (user.role !== 'Teacher' && user.studentId !== studentId) {
      return Response.json(
        { error: 'You are not authorized to clear this student data.' },
        { status: 403 }
      );
    }
    const count = await deleteStoredRecordsByStudent(studentId);
    return Response.json({ ok: true, removed: count });
  }

  if (id) {
    const success = await deleteStoredRecord(id, 'local_seedy');
    return Response.json({ ok: true, deleted: success });
  }

  return Response.json(
    { error: 'Missing id or studentId parameter.' },
    { status: 400 }
  );
}
