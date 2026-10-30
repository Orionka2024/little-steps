import { cookies } from 'next/headers';
import { findUserByCredentials, AUTH_COOKIE_NAME } from '../../../../lib/auth-types';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return Response.json(
        { error: 'Please provide both username and password.' },
        { status: 400 }
      );
    }

    const user = findUserByCredentials(username, password);
    if (!user) {
      return Response.json(
        { error: 'Invalid username or password. Please try again.' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, user.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return Response.json({
      ok: true,
      user: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        studentId: user.studentId,
        avatar: user.avatar,
      },
    });
  } catch {
    return Response.json({ error: 'Login failed.' }, { status: 500 });
  }
}
