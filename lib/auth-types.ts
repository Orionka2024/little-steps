export interface ClassroomUser {
  username: string;
  password: string;
  displayName: string;
  role: 'Teacher' | 'Student';
  studentId?: string;
  avatar: string;
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
    password: 'TigerBlue!73',
    displayName: 'Hajun',
    role: 'Student',
    studentId: 'hajun',
    avatar: 'H',
  },
  {
    username: 'mark',
    password: 'GalaxyQuest84',
    displayName: 'Mark',
    role: 'Student',
    studentId: 'mark',
    avatar: 'M',
  },
  {
    username: 'juwon',
    password: 'SunnyMaple#29',
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
