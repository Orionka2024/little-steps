import { getCurrentUser } from '../../../../lib/auth-server';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  return Response.json({
    authenticated: true,
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      studentId: user.studentId,
      avatar: user.avatar,
    },
  });
}
