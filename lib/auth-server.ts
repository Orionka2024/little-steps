import { cookies } from 'next/headers';
import type { ClassroomUser } from './auth-types';
import { AUTH_COOKIE_NAME, CLASSROOM_USERS, findUserByUsername } from './auth-types';

export async function getCurrentUser(): Promise<ClassroomUser | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (sessionValue) {
    const user = findUserByUsername(sessionValue);
    if (user) return user;
  }

  // Fallback for local development if no cookie set yet
  if (process.env.NODE_ENV !== 'production' && !sessionValue) {
    return CLASSROOM_USERS[0];
  }

  return null;
}
