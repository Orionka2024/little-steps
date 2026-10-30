import { getCurrentUser } from '../../../lib/auth-server';
import { getStoredFile, putStoredFile } from '../../../lib/storage';

const ALLOWED_EXTENSIONS = /\.(png|jpe?g|webp|heic|pdf|docx?|txt)$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function getContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Sign in required' }, { status: 401 });
  }

  const contentLength = Number(req.headers.get('content-length'));
  if (contentLength > 12 * 1024 * 1024) {
    return Response.json({ error: 'Maximum file size is 10 MB' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'Choose a file smaller than 10 MB' }, { status: 400 });
  }

  if (!ALLOWED_EXTENSIONS.test(file.name)) {
    return Response.json(
      { error: 'Use a photo, PDF, Word document or text file' },
      { status: 400 }
    );
  }

  const contentType = getContentType(file.name);
  const key = `${user.username}/${crypto.randomUUID()}`;

  await putStoredFile(key, await file.arrayBuffer(), file.name, contentType);

  return Response.json({
    key,
    name: file.name,
    size: file.size,
  });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Sign in required', { status: 401 });
  }

  const key = new URL(req.url).searchParams.get('key') || '';
  if (!key) {
    return new Response('Missing file key', { status: 400 });
  }

  const stored = await getStoredFile(key);
  if (!stored) {
    return new Response('File not found', { status: 404 });
  }

  const filename = stored.name || 'attachment';
  const contentType = stored.contentType || getContentType(filename);

  return new Response(Buffer.from(stored.body), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
