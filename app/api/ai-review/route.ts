import { getCurrentUser } from '../../../lib/auth-server';
import { analyzeEssayWithAi, type EssayReviewInput } from '../../../lib/ai-essay-coach';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const roleHeader = req.headers.get('x-user-role');

  const effectiveRole = user?.role || roleHeader;

  // Strict check: Only teachers can access the teacher essay review and advising tool
  if (effectiveRole !== 'Teacher') {
    return Response.json(
      { error: 'AI Preliminary Review is an exclusive Teacher Pro tool.' },
      { status: 403 }
    );
  }

  let body: Partial<EssayReviewInput> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    essayText = '',
    studentName = 'Student',
    assignmentTitle = 'Writing Assignment',
    assignmentType = 'Essay',
    assignmentInstructions = '',
    targetWordCount = 150,
    reviewFocus = 'balanced',
  } = body;

  try {
    // Perform thorough pedagogical and linguistic preliminary review
    const review = analyzeEssayWithAi({
      essayText,
      studentName,
      assignmentTitle,
      assignmentType,
      assignmentInstructions,
      targetWordCount,
      reviewFocus,
    });

    return Response.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('Error generating AI review:', error);
    return Response.json(
      { error: 'Failed to complete AI preliminary review.' },
      { status: 500 }
    );
  }
}
