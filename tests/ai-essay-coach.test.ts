import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeEssayWithAi } from '../lib/ai-essay-coach.ts';

const SAMPLE_DIAGNOSTIC_ESSAY = `In my opinion, our school should change the rule about desk work and give us 30 minutes of outdoor project time every day.

One reason is that sitting in a chair for six hours makes students very tired and lose focus. When we go outside, the fresh air and sunlight wake up our brains. For example, last Wednesday our science class observed leaves in the courtyard, and everyone remembered the plant parts much better than reading a textbook.

Another reason is that outdoor time teaches teamwork. We can build small gardens, measure shadows, and talk to each other without whispering. Some teachers might worry that students will play and get dirty, but if we have clear project goals, it will be very good and fun.

In conclusion, replacing 30 minutes of sitting with outdoor learning will make students healthier, happier, and more creative.`;

test('analyzeEssayWithAi produces accurate diagnostics on structured student essay', () => {
  const result = analyzeEssayWithAi({
    essayText: SAMPLE_DIAGNOSTIC_ESSAY,
    studentName: 'Hajun',
    assignmentTitle: 'Week 1 Diagnostic: Change one school rule',
    targetWordCount: 150,
    reviewFocus: 'balanced',
  });

  assert.strictEqual(result.studentName, 'Hajun');
  assert.ok(result.wordCount >= 130, `Expected at least 130 words, got ${result.wordCount}`);
  assert.strictEqual(result.paragraphCount, 4);
  assert.ok(['B1 (Intermediate)', 'B2 (Upper-Intermediate / Competition)'].includes(result.readingLevel));
  assert.ok(result.strengths.length >= 2, 'Should identify at least 2 strengths');
  assert.ok(result.growthOpportunities.length >= 1, 'Should identify growth opportunities');
});

test('analyzeEssayWithAi generates actionable Socratic prompts for the teacher', () => {
  const result = analyzeEssayWithAi({
    essayText: SAMPLE_DIAGNOSTIC_ESSAY,
    studentName: 'Hajun',
    assignmentTitle: 'Week 1 Diagnostic: Change one school rule',
  });

  assert.ok(result.teacherAdvisingPrompts.length >= 4, 'Should provide at least 4 teacher prompts');

  for (const prompt of result.teacherAdvisingPrompts) {
    assert.ok(prompt.category, 'Prompt must have a category');
    assert.ok(prompt.teacherGoal.length > 5, 'Prompt must advise the teacher on pedagogical goal');
    assert.ok(prompt.studentPrompt.includes('Hajun'), 'Prompt question should address the student by name');
    assert.ok(prompt.pedagogicalRationale.length > 10, 'Prompt must explain why this helps');
  }
});

test('analyzeEssayWithAi identifies overused words and suggests Tier-2 vocabulary replacements', () => {
  const essayWithOverusedWords = `The weather was good and the dog was big. It was very fun and nice.`;
  const result = analyzeEssayWithAi({
    essayText: essayWithOverusedWords,
    studentName: 'Mark',
    assignmentTitle: 'My Pet Story',
  });

  const vocabPrompt = result.teacherAdvisingPrompts.find((p) => p.category === 'Vocabulary & Flair');
  assert.ok(vocabPrompt, 'Should generate a vocabulary prompt');
  assert.ok(
    vocabPrompt.studentPrompt.includes('good') ||
    vocabPrompt.studentPrompt.includes('big') ||
    vocabPrompt.studentPrompt.includes('fun') ||
    vocabPrompt.studentPrompt.includes('nice'),
    'Should quote an overused word found in text'
  );
});

test('analyzeEssayWithAi computes Cambridge scorecard rubric out of 25 with rationale', () => {
  const result = analyzeEssayWithAi({
    essayText: SAMPLE_DIAGNOSTIC_ESSAY,
    studentName: 'Juwon',
    assignmentTitle: 'Should every school have a garden?',
  });

  const scorecard = result.suggestedScorecard;
  assert.ok(scorecard.ideas >= 1 && scorecard.ideas <= 5);
  assert.ok(scorecard.structure >= 1 && scorecard.structure <= 5);
  assert.ok(scorecard.development >= 1 && scorecard.development <= 5);
  assert.ok(scorecard.vocabulary >= 1 && scorecard.vocabulary <= 5);
  assert.ok(scorecard.grammar >= 1 && scorecard.grammar <= 5);
  assert.strictEqual(
    scorecard.total,
    scorecard.ideas + scorecard.structure + scorecard.development + scorecard.vocabulary + scorecard.grammar
  );
  assert.ok(scorecard.total >= 5 && scorecard.total <= 25);
  assert.ok(scorecard.targetSkills.length > 0, 'Scorecard should provide target improvement skills');

  // Check rationale map
  assert.ok(result.scorecardRationale.ideas.length > 5);
  assert.ok(result.scorecardRationale.structure.length > 5);
  assert.ok(result.scorecardRationale.development.length > 5);
  assert.ok(result.scorecardRationale.vocabulary.length > 5);
  assert.ok(result.scorecardRationale.grammar.length > 5);
});

test('analyzeEssayWithAi formats encouraging teacher feedback draft', () => {
  const result = analyzeEssayWithAi({
    essayText: SAMPLE_DIAGNOSTIC_ESSAY,
    studentName: 'Hajun',
    assignmentTitle: 'Week 1 Diagnostic',
  });

  assert.ok(result.suggestedTeacherFeedback.includes('Hajun'), 'Feedback draft should mention student');
  assert.ok(result.suggestedTeacherFeedback.includes('Week 1 Diagnostic'), 'Feedback draft should mention assignment');
  assert.ok(result.suggestedTeacherFeedback.includes('little steps'), 'Feedback should reflect Little Steps tone');
});

test('analyzeEssayWithAi includes Pro Version preview metadata', () => {
  const result = analyzeEssayWithAi({
    essayText: SAMPLE_DIAGNOSTIC_ESSAY,
    studentName: 'Hajun',
    assignmentTitle: 'Week 1 Diagnostic',
  });

  assert.strictEqual(result.proMeta.badge, 'PRO PREVIEW');
  assert.strictEqual(result.proMeta.isProFeature, true);
  assert.ok(result.proMeta.featuresIncluded.length >= 3);
  assert.ok(result.proMeta.upcomingProFeatures.length >= 3);
});

test('analyzeEssayWithAi handles empty or single sentence text gracefully', () => {
  const emptyResult = analyzeEssayWithAi({
    essayText: '',
    studentName: 'Hajun',
    assignmentTitle: 'Unstarted Draft',
  });

  assert.strictEqual(emptyResult.wordCount, 0);
  assert.strictEqual(emptyResult.paragraphCount, 1);
  assert.ok(emptyResult.teacherAdvisingPrompts.length > 0);
  assert.ok(emptyResult.suggestedScorecard.total >= 5);
});

test('analyzeEssayWithAi adjusts expectations when reviewFocus is competition', () => {
  const standardResult = analyzeEssayWithAi({
    essayText: SAMPLE_DIAGNOSTIC_ESSAY,
    studentName: 'Hajun',
    assignmentTitle: 'Week 1 Diagnostic',
    reviewFocus: 'balanced',
  });

  const competitionResult = analyzeEssayWithAi({
    essayText: SAMPLE_DIAGNOSTIC_ESSAY,
    studentName: 'Hajun',
    assignmentTitle: 'Week 1 Diagnostic',
    reviewFocus: 'competition',
  });

  const hasCompetitionPrompt = competitionResult.teacherAdvisingPrompts.some(
    (p) => p.category === 'Competition Stretch'
  );
  assert.ok(hasCompetitionPrompt, 'Competition focus should provide a Competition Stretch prompt');
});
