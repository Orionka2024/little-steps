import { cookies } from 'next/headers';
import { findUserByUsername, AUTH_COOKIE_NAME } from '../../../../lib/auth-types';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
      teacherUnlock?: boolean;
      teacherPassword?: string;
    };
    const { username, password, teacherUnlock, teacherPassword } = body;

    if (!username || !username.trim()) {
      return Response.json(
        { error: 'Please choose or enter a username.' },
        { status: 400 }
      );
    }

    const user = findUserByUsername(username);
    if (!user) {
      return Response.json(
        { error: 'User not found. Please choose a valid profile.' },
        { status: 401 }
      );
    }

    // Teacher unlock authorization: teacher can unlock device and switch accounts
    if (teacherUnlock) {
      const teacherUser = findUserByUsername('teacher');
      if (!teacherUser || !teacherPassword || teacherPassword.trim() !== teacherUser.password) {
        return Response.json(
          { error: 'Incorrect Teacher password.' },
          { status: 401 }
        );
      }
    } else {
      // Direct login: users MUST enter their password at the very beginning
      if (!password || password.trim() !== user.password) {
        return Response.json(
          { error: 'Incorrect password. Please enter the correct password.' },
          { status: 401 }
        );
      }
    }

    const cookieStore = await cookies();
    // 30 days session persistence as requested
    const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
    cookieStore.set(AUTH_COOKIE_NAME, user.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS_SECONDS,
      expires: new Date(Date.now() + THIRTY_DAYS_SECONDS * 1000),
    });

    return Response.json({
      ok: true,
      user: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        studentId: user.studentId,
        avatar: user.avatar,
        expiresAt: Date.now() + THIRTY_DAYS_SECONDS * 1000,
      },
    });
  } catch {
    return Response.json({ error: 'Login failed.' }, { status: 500 });
  }
}
