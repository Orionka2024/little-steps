import { getCurrentUser } from '../../../lib/auth-server';
import { getStoredRecords, upsertStoredRecord } from '../../../lib/storage';
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
  if (bodyText.length > 150000) {
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
    (validated.kind === 'assignment' || validated.kind === 'material') &&
    roleHeader === 'Student'
  ) {
    return Response.json(
      { error: 'Only teachers can create assignments or materials.' },
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
