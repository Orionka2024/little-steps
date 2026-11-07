import type { WritingScorecard } from './types';

export interface EssayAdvisingPrompt {
  id: string;
  category: 'Ideas & Depth' | 'Vocabulary & Flair' | 'Structure & Flow' | 'Evidence & Examples' | 'Grammar & Clarity' | 'Competition Stretch';
  icon: string;
  teacherGoal: string;
  studentPrompt: string;
  pedagogicalRationale: string;
  recommendedTag?: string;
}

export interface AiEssayReviewResult {
  studentName: string;
  assignmentTitle: string;
  wordCount: number;
  targetWordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  readingLevel: 'A2 (Elementary)' | 'B1 (Intermediate)' | 'B2 (Upper-Intermediate / Competition)';
  estimatedReadingTimeSeconds: number;
  reviewedAt: string;
  focusMode: 'balanced' | 'competition' | 'structure' | 'foundations';

  headline: string;
  strengths: string[];
  growthOpportunities: string[];
  teacherAdvisingPrompts: EssayAdvisingPrompt[];

  suggestedScorecard: WritingScorecard;
  scorecardRationale: {
    ideas: string;
    structure: string;
    development: string;
    vocabulary: string;
    grammar: string;
  };

  suggestedTeacherFeedback: string;

  proMeta: {
    badge: string;
    isProFeature: boolean;
    tier: 'Little Steps PRO Preview';
    featuresIncluded: string[];
    upcomingProFeatures: string[];
  };
}

export interface EssayReviewInput {
  essayText: string;
  studentName: string;
  assignmentTitle: string;
  assignmentType?: string;
  assignmentInstructions?: string;
  targetWordCount?: number;
  reviewFocus?: 'balanced' | 'competition' | 'structure' | 'foundations';
}

const COMMON_OVERUSED_WORDS: Record<string, string[]> = {
  good: ['delightful', 'rewarding', 'advantageous', 'exceptional', 'beneficial'],
  bad: ['detrimental', 'troublesome', 'disappointing', 'unfavourable', 'flawed'],
  big: ['immense', 'substantial', 'monumental', 'expansive', 'significant'],
  small: ['minute', 'compact', 'modest', 'subtle', 'delicate'],
  nice: ['pleasant', 'welcoming', 'charming', 'gracious', 'refreshing'],
  very: ['exceptionally', 'remarkably', 'genuinely', 'immensely', 'notably'],
  fun: ['exhilarating', 'entertaining', 'lively', 'engaging', 'captivating'],
  happy: ['cheerful', 'content', 'elated', 'joyful', 'beaming'],
  sad: ['sorrowful', 'downcast', 'disheartened', 'melancholy', 'glum'],
  cool: ['fascinating', 'striking', 'remarkable', 'captivating', 'novel'],
  thing: ['element', 'aspect', 'detail', 'concept', 'factor'],
  things: ['elements', 'features', 'circumstances', 'principles', 'factors'],
  stuff: ['belongings', 'materials', 'paraphernalia', 'objects', 'possessions'],
  a_lot: ['numerous', 'a multitude of', 'an abundance of', 'considerable', 'substantial'],
};

const TRANSITION_PATTERNS = [
  'in my opinion',
  'i believe that',
  'to begin with',
  'one reason is',
  'another reason is',
  'in addition',
  'furthermore',
  'moreover',
  'what is more',
  'also',
  'however',
  'on the other hand',
  'although',
  'even though',
  'instead',
  'for example',
  'for instance',
  'such as',
  'in particular',
  'in conclusion',
  'to sum up',
  'finally',
  'all in all',
  'in the end',
  'as a result',
  'therefore',
  'because',
];

const SENSORY_WORDS = [
  'whisper', 'shadow', 'glimmer', 'aroma', 'shiver', 'golden', 'thunder',
  'scent', 'crisp', 'radiant', 'echo', 'chilly', 'breeze', 'velvet',
  'sparkle', 'bustle', 'silence', 'fragrance', 'shimmer', 'cozy', 'warmth',
];

export function analyzeEssayWithAi(input: EssayReviewInput): AiEssayReviewResult {
  const {
    essayText = '',
    studentName = 'Student',
    assignmentTitle = 'Writing Assignment',
    assignmentType = 'Essay',
    targetWordCount = 150,
    reviewFocus = 'balanced',
  } = input;

  const cleanText = essayText.trim();
  const paragraphs = cleanText ? cleanText.split(/\n\s*\n/).filter((p) => p.trim().length > 0) : [];
  const paragraphCount = Math.max(1, paragraphs.length);

  // Word tokenization
  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // Sentence tokenization
  const sentences = cleanText
    ? cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    : [];
  const sentenceCount = Math.max(1, sentences.length);
  const averageSentenceLength = wordCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;
  const estimatedReadingTimeSeconds = Math.max(5, Math.round((wordCount / 180) * 60));

  const lowerText = cleanText.toLowerCase();

  // Find detected connectors
  const foundConnectors = TRANSITION_PATTERNS.filter((t) => lowerText.includes(t));

  // Find overused vocabulary
  const overusedDetected: Array<{ word: string; suggestions: string[] }> = [];
  for (const [key, suggestions] of Object.entries(COMMON_OVERUSED_WORDS)) {
    const searchTarget = key === 'a_lot' ? 'a lot' : key;
    const regex = new RegExp(`\\b${searchTarget}\\b`, 'i');
    if (regex.test(cleanText)) {
      overusedDetected.push({ word: searchTarget, suggestions });
    }
  }

  // Find sensory words
  const foundSensory = SENSORY_WORDS.filter((w) => lowerText.includes(w));

  // Check quotes or dialogue
  const hasDialogue = /["'“”‘’]/.test(cleanText);

  // Check sentence starters variation
  const starters = sentences
    .map((s) => s.trim().split(/\s+/)[0]?.toLowerCase())
    .filter(Boolean);
  const starterCounts: Record<string, number> = {};
  starters.forEach((st) => {
    starterCounts[st] = (starterCounts[st] || 0) + 1;
  });
  const repetitiveStarter = Object.entries(starterCounts).find(
    ([word, count]) => count >= 3 && ['i', 'the', 'and', 'then', 'so', 'it', 'my'].includes(word)
  );

  // Determine CEFR Reading Level approximation
  let readingLevel: 'A2 (Elementary)' | 'B1 (Intermediate)' | 'B2 (Upper-Intermediate / Competition)' = 'A2 (Elementary)';
  if (wordCount >= 180 && foundConnectors.length >= 3 && averageSentenceLength >= 12) {
    readingLevel = 'B2 (Upper-Intermediate / Competition)';
  } else if (wordCount >= 90 || foundConnectors.length >= 2 || averageSentenceLength >= 9) {
    readingLevel = 'B1 (Intermediate)';
  }

  // Strengths identification
  const strengths: string[] = [];
  if (wordCount >= targetWordCount * 0.9) {
    strengths.push(`Good essay stamina: reached ${wordCount} words (target: ${targetWordCount}).`);
  }
  if (paragraphCount >= 3) {
    strengths.push(`Clear macro-structure with ${paragraphCount} distinct paragraphs.`);
  } else if (paragraphCount === 2) {
    strengths.push('Organized into multiple sections to separate ideas.');
  }
  if (foundConnectors.length >= 2) {
    strengths.push(`Effective transitional cohesion using connectors like "${foundConnectors.slice(0, 2).join('", "')}".`);
  }
  if (foundSensory.length >= 1) {
    strengths.push(`Evocative sensory description present (e.g., "${foundSensory.slice(0, 2).join('", "')}").`);
  }
  if (hasDialogue) {
    strengths.push('Incorporated quotation marks / dialogue to bring the scenario alive.');
  }
  if (strengths.length === 0) {
    strengths.push('Presents an authentic, personal point of view on the topic.');
    strengths.push('Communicates the core message with straightforward intent.');
  }

  // Growth opportunities
  const growthOpportunities: string[] = [];
  if (paragraphCount < 3 && wordCount >= 70) {
    growthOpportunities.push('Group thoughts into 3 clear stages: Opening hook, Evidence body, and Concluding takeaway.');
  }
  if (foundConnectors.length < 2) {
    growthOpportunities.push('Introduce contrast and addition transition words (e.g. "Furthermore", "On the other hand").');
  }
  if (overusedDetected.length > 0) {
    const list = overusedDetected.slice(0, 2).map((o) => `"${o.word}"`).join(' and ');
    growthOpportunities.push(`Elevate familiar adjectives (${list}) with richer descriptive vocabulary.`);
  }
  if (repetitiveStarter) {
    growthOpportunities.push(`Vary sentence openings: several sentences currently begin with "${repetitiveStarter[0]}".`);
  }
  if (!hasDialogue && assignmentType.toLowerCase().includes('creative')) {
    growthOpportunities.push('Add a spoken exchange or direct exclamation to enhance dramatic tension.');
  }
  if (growthOpportunities.length === 0) {
    growthOpportunities.push('Deepen the counter-argument: explore what an opponent might claim and refute it gracefully.');
  }

  // Formulate Teacher Advising Prompts
  const teacherAdvisingPrompts: EssayAdvisingPrompt[] = [];

  // Prompt 1: Ideas & Socratic Depth
  let ideaPromptText = `Ask ${studentName}: "What is the biggest real-world consequence if your idea actually happened? How would ordinary school life feel on a rainy Monday morning?"`;
  let ideaGoal = `Challenge ${studentName} to move from a general claim to a high-definition real-life scenario.`;
  let ideaRationale = `Grounding abstract opinions in concrete daily consequences immediately elevates persuasive power in Cambridge writing rubrics.`;

  if (assignmentTitle.toLowerCase().includes('garden') || lowerText.includes('garden')) {
    ideaPromptText = `Ask ${studentName}: "Imagine a student who hates getting their shoes dirty or is allergic to bees. How could your school garden win them over?"`;
    ideaGoal = `Prompt ${studentName} to address the opposing perspective.`;
    ideaRationale = `Acknowledging a counter-view demonstrates mature rhetorical nuance and critical thinking.`;
  } else if (assignmentTitle.toLowerCase().includes('home') || lowerText.includes('home')) {
    ideaPromptText = `Ask ${studentName}: "If you had to describe this special place to someone blindfolded, what sound and smell would make them instantly know where they are?"`;
    ideaGoal = `Deepen sensory specificity.`;
    ideaRationale = `Sensory anchors prevent descriptive essays from drifting into vague emotional statements.`;
  } else if (assignmentTitle.toLowerCase().includes('rule') || lowerText.includes('rule')) {
    ideaPromptText = `Ask ${studentName}: "Why did teachers create this rule in the first place? What rule or safeguard could replace it so everyone stays safe?"`;
    ideaGoal = `Encourage multi-stakeholder reasoning.`;
    ideaRationale = `Showing respect for the original intention makes rule-change essays far more persuasive.`;
  }

  teacherAdvisingPrompts.push({
    id: 'prompt-ideas',
    category: 'Ideas & Depth',
    icon: '💡',
    teacherGoal: ideaGoal,
    studentPrompt: ideaPromptText,
    pedagogicalRationale: ideaRationale,
    recommendedTag: 'High Yield',
  });

  // Prompt 2: Vocabulary Upgrade
  if (overusedDetected.length > 0) {
    const top = overusedDetected[0];
    const suggestionsStr = top.suggestions.slice(0, 3).join(', ');
    teacherAdvisingPrompts.push({
      id: 'prompt-vocab',
      category: 'Vocabulary & Flair',
      icon: '🎨',
      teacherGoal: `Guide ${studentName} to upgrade everyday words to Tier-2 competition vocabulary.`,
      studentPrompt: `Prompt ${studentName}: "You wrote '${top.word}' in your essay. Can you test replacing it with one of our club words like ${suggestionsStr}?"`,
      pedagogicalRationale: `Targeting specific words the student actually wrote is 3x more effective than memorizing isolated vocabulary lists.`,
      recommendedTag: 'Word Swap',
    });
  } else {
    teacherAdvisingPrompts.push({
      id: 'prompt-vocab',
      category: 'Vocabulary & Flair',
      icon: '🎨',
      teacherGoal: `Introduce a stylistic flourish (metaphor or evocative verb).`,
      studentPrompt: `Prompt ${studentName}: "Pick your favourite verb in paragraph 2. Can you transform it into an action verb that paints an exact picture?"`,
      pedagogicalRationale: `Strong verbs drive the cadence of English prose far more effectively than strings of adjectives.`,
    });
  }

  // Prompt 3: Structure & Transition Flow
  if (foundConnectors.length < 2) {
    teacherAdvisingPrompts.push({
      id: 'prompt-flow',
      category: 'Structure & Flow',
      icon: '⚖️',
      teacherGoal: `Coach ${studentName} to link ideas with explicit transition markers.`,
      studentPrompt: `Prompt ${studentName}: "Look at where your first reason ends and your second begins. Can you glue them together with 'Furthermore', 'In addition', or 'On the other hand'?"`,
      pedagogicalRationale: `Transition phrases from the Little Steps word bank teach structural signposting, a top grading pillar.`,
      recommendedTag: 'Cohesion',
    });
  } else {
    teacherAdvisingPrompts.push({
      id: 'prompt-flow',
      category: 'Structure & Flow',
      icon: '⚖️',
      teacherGoal: `Refine paragraph pacing and rhetorical rhythm.`,
      studentPrompt: `Prompt ${studentName}: "Read paragraph 1 and paragraph 2 out loud back-to-back. Does the transition sound smooth or abrupt? Where can you add a breathing pause?"`,
      pedagogicalRationale: `Auditory self-reading unlocks rhythmic cadence and helps students detect clumsy sentence joints.`,
    });
  }

  // Prompt 4: Evidence & Examples
  teacherAdvisingPrompts.push({
    id: 'prompt-evidence',
    category: 'Evidence & Examples',
    icon: '🔍',
    teacherGoal: `Guide ${studentName} to add a micro-anecdote or specific piece of evidence.`,
    studentPrompt: `Ask ${studentName}: "Can you add a 1-sentence mini-story? For instance: 'Last Thursday, when the bell rang...'"`,
    pedagogicalRationale: `Micro-anecdotes anchor claims into memorable, undeniable evidence.`,
  });

  // Prompt 5: Competition Stretch / Polish
  if (reviewFocus === 'competition') {
    teacherAdvisingPrompts.push({
      id: 'prompt-competition',
      category: 'Competition Stretch',
      icon: '🏆',
      teacherGoal: `Polish rhetorical voice and closing resonance for competition judging.`,
      studentPrompt: `Challenge ${studentName}: "End with a memorable call-to-action or lingering question that will echo in the reader’s mind after they put the paper down."`,
      pedagogicalRationale: `Competition judges read hundreds of essays; a memorable final sentence often determines top placement.`,
      recommendedTag: 'Competition Polish',
    });
  }

  // Scoring Rubric Calculation (Ideas, Structure, Development, Vocabulary, Grammar out of 5)
  let ideasScore = 3;
  let structureScore = 3;
  let developmentScore = 3;
  let vocabularyScore = 3;
  let grammarScore = 3;

  // Ideas & originality
  if (wordCount >= 140 && (lowerText.includes('because') || lowerText.includes('reason') || cleanText.length > 300)) {
    ideasScore = cleanText.length > 600 ? 5 : 4;
  } else if (wordCount < 60) {
    ideasScore = 2;
  }

  // Structure & organisation
  if (paragraphCount >= 3 && foundConnectors.length >= 2) {
    structureScore = 5;
  } else if (paragraphCount >= 2 || foundConnectors.length >= 1) {
    structureScore = 4;
  } else {
    structureScore = 3;
  }

  // Development & examples
  if (foundSensory.length >= 1 || lowerText.includes('for example') || lowerText.includes('for instance')) {
    developmentScore = wordCount >= 150 ? 5 : 4;
  } else if (wordCount >= 100) {
    developmentScore = 3;
  } else {
    developmentScore = 2;
  }

  // Vocabulary & style
  if (overusedDetected.length === 0 && (foundSensory.length >= 2 || foundConnectors.length >= 3)) {
    vocabularyScore = 5;
  } else if (overusedDetected.length <= 1 && wordCount >= 80) {
    vocabularyScore = 4;
  } else {
    vocabularyScore = 3;
  }

  // Grammar & accuracy
  if (averageSentenceLength >= 8 && averageSentenceLength <= 24 && !repetitiveStarter) {
    grammarScore = 4;
    if (wordCount >= 120 && paragraphCount >= 2) grammarScore = 5;
  } else if (averageSentenceLength > 28 || averageSentenceLength < 5) {
    grammarScore = 3;
  }

  // Adjust for focus
  if (reviewFocus === 'competition') {
    // Stricter rubric bar for competition readiness
    ideasScore = Math.max(1, ideasScore - (cleanText.length < 500 ? 1 : 0));
    vocabularyScore = Math.max(1, vocabularyScore - (overusedDetected.length > 0 ? 1 : 0));
  } else if (reviewFocus === 'foundations') {
    grammarScore = Math.min(5, grammarScore + 1);
  }

  const total = ideasScore + structureScore + developmentScore + vocabularyScore + grammarScore;

  const targetSkills: string[] = [];
  if (foundConnectors.length < 2) targetSkills.push('Use at least 2 transition connectors between paragraphs');
  if (overusedDetected.length > 0) targetSkills.push(`Swap common adjectives with descriptive alternatives`);
  if (paragraphCount < 3) targetSkills.push('Format into 3 distinct sections: Hook, Proof, and Conclusion');
  if (targetSkills.length < 2) targetSkills.push('Add a 1-sentence real-world example or dialogue snippet');
  if (targetSkills.length < 2) targetSkills.push('Craft a lingering final sentence that speaks directly to the reader');

  const suggestedScorecard: WritingScorecard = {
    ideas: ideasScore,
    structure: structureScore,
    development: developmentScore,
    vocabulary: vocabularyScore,
    grammar: grammarScore,
    total,
    targetSkills: targetSkills.slice(0, 2),
    interpretation:
      total >= 21
        ? 'Competition ready: polish voice, stylistic flair, and rhetorical nuance.'
        : total >= 16
        ? 'Proficient: strong structure and clarity; develop richer details.'
        : total >= 11
        ? 'Developing: identify two skills for targeted improvement.'
        : 'Foundational: focus on complete sentences and core paragraph architecture.',
  };

  const scorecardRationale = {
    ideas: `${ideasScore}/5: ${ideasScore >= 4 ? 'Thoughtful individual perspective with clear core argument' : 'Presents a solid starting idea that will benefit from addressing counter-arguments'}.`,
    structure: `${structureScore}/5: ${paragraphCount >= 3 ? `${paragraphCount} well-defined paragraphs` : 'Developing paragraph flow; separate main sections more clearly'}.`,
    development: `${developmentScore}/5: ${developmentScore >= 4 ? 'Good concrete details and evidence supporting the thesis' : 'Expand on why this reason matters with a specific real-world example'}.`,
    vocabulary: `${vocabularyScore}/5: ${vocabularyScore >= 4 ? 'Vivid word choices and natural phrasing' : 'Great opportunity to replace everyday adjectives with rich synonyms'}.`,
    grammar: `${grammarScore}/5: ${grammarScore >= 4 ? 'Accurate sentence boundaries and punctuation throughout' : 'Keep an eye on varying sentence lengths and capitalisation'}.`,
  };

  // Formulate Suggested Teacher Feedback
  const primaryStrength = strengths[0] || 'Clear, authentic voice.';
  const primaryGrowth = growthOpportunities[0] || 'Develop ideas with more specific real-life details.';
  const topPromptQuestion = teacherAdvisingPrompts[0]?.studentPrompt || `Think about what makes your idea unique!`;

  const suggestedTeacherFeedback = `Super effort on "${assignmentTitle}", ${studentName}! 🌟

What stood out most: ${primaryStrength} Your enthusiasm and unique perspective shine through.

For your next revision step:
${primaryGrowth}

Try this thinking challenge:
${topPromptQuestion}

Keep taking these little steps—you are becoming a more confident and expressive writer every week! ✨`;

  return {
    studentName,
    assignmentTitle,
    wordCount,
    targetWordCount,
    paragraphCount,
    sentenceCount,
    averageSentenceLength,
    readingLevel,
    estimatedReadingTimeSeconds,
    reviewedAt: new Date().toISOString(),
    focusMode: reviewFocus,
    headline:
      total >= 20
        ? `Impressive draft with lively voice and strong stamina. Ready for advanced rhetorical polish.`
        : total >= 15
        ? `Solid, engaging draft with clear ideas. Prime opportunity to elevate transitions and descriptive vocabulary.`
        : `Promising start with genuine enthusiasm. Focus on paragraph architecture and sentence variety.`,
    strengths,
    growthOpportunities,
    teacherAdvisingPrompts,
    suggestedScorecard,
    scorecardRationale,
    suggestedTeacherFeedback,
    proMeta: {
      badge: 'PRO PREVIEW',
      isProFeature: true,
      tier: 'Little Steps PRO Preview',
      featuresIncluded: [
        'AI Preliminary Essay Diagnostics',
        'Pedagogical Socratic Prompts for Teachers',
        'Auto-Rubric Alignment & Scorecard Pre-fill',
        'One-Click Feedback Draft Generation',
      ],
      upcomingProFeatures: [
        'Custom school competition rubrics',
        'Audio conferencing prompts for teacher & student',
        'Longitudinal student progress tracking across weeks',
        'Class-wide writing trend analytics',
      ],
    },
  };
}
