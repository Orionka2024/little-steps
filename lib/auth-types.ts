export interface ClassroomUser {
  username: string;
  password: string;
  displayName: string;
  role: 'Teacher' | 'Student';
  studentId?: string;
  avatar: string;
  expiresAt?: number;
}

export const CLASSROOM_USERS: ClassroomUser[] = [
  {
    username: 'teacher',
    password: 'MentorSteps!48',
    displayName: 'Teacher',
    role: 'Teacher',
    avatar: 'T',
  },
  {
    username: 'hajun',
    password: 'Hjn2015',
    displayName: 'Hajun',
    role: 'Student',
    studentId: 'hajun',
    avatar: 'H',
  },
  {
    username: 'mark',
    password: 'Mrk1004',
    displayName: 'Mark',
    role: 'Student',
    studentId: 'mark',
    avatar: 'M',
  },
  {
    username: 'juwon',
    password: 'Jwn1122',
    displayName: 'Juwon',
    role: 'Student',
    studentId: 'juwon',
    avatar: 'J',
  },
];

export const AUTH_COOKIE_NAME = 'classroom_session';

export function findUserByCredentials(username: string, pass: string): ClassroomUser | null {
  const normalizedUser = username.trim().toLowerCase();
  const matched = CLASSROOM_USERS.find(
    (u) => u.username.toLowerCase() === normalizedUser && u.password === pass.trim()
  );
  return matched || null;
}

export function findUserByUsername(username: string): ClassroomUser | null {
  const normalizedUser = username.trim().toLowerCase();
  return CLASSROOM_USERS.find((u) => u.username.toLowerCase() === normalizedUser) || null;
}
