import type {
  AssignmentEntry,
  MaterialEntry,
  AttendanceEntry,
  BillingConfigEntry,
} from './types';


export const INITIAL_ASSIGNMENTS: AssignmentEntry[] = [
  {
    id: 'a0',
    kind: 'assignment',
    title: 'Week 1 Diagnostic: Change one school rule',
    type: 'Diagnostic essay',
    due: '2026-11-03',
    minutes: 30,
    words: 150,
    description:
      'Start with what matters to you! Give your honest opinion and convincing reasons for a school rule change.',
    instructions:
      'Spend 10 minutes brainstorming your idea out loud, then 20 minutes writing:\n\nIf you could change one rule in your school, what would it be and why?\n\n• State the rule you want to change clearly in your opening.\n• Give two convincing reasons supported by real-life details or examples.\n• Finish with a strong concluding thought about how school life would improve.',
    color: 'mint',
    icon: '🏫',
    posted: true,
    interactive: {
      type: 'quiz',
      title: 'Diagnostic Warm-up: Strong Arguments',
      questions: [
        {
          question: 'Which opening sentence makes the strongest argument for an essay?',
          options: [
            'I think some school rules are boring and not fun.',
            'If our school replaced 30 minutes of desk work with outdoor project time, students would become more creative and focused.',
            'Rules are everywhere and people must follow them.',
          ],
          correctIndex: 1,
          explanation:
            'A specific, bold statement with clear cause and effect gives your essay a memorable start!',
        },
        {
          question: 'What is the best step to do BEFORE writing your first draft?',
          options: [
            'Explain your argument aloud for 3 minutes to test your ideas',
            'Search for 10 complicated words in a dictionary',
            'Skip planning and write immediately',
          ],
          correctIndex: 0,
          explanation:
            'Explaining your ideas aloud first helps your brain organize reasons clearly and naturally.',
        },
      ],
    },
  },
  {
    id: 'a1',
    kind: 'assignment',
    title: 'A place that feels like home',
    type: 'Descriptive essay',
    due: '2026-11-04',
    minutes: 25,
    words: 150,
    description:
      'Every place has a story. Tell us about a place that makes you feel happy, safe, or completely yourself.',
    instructions:
      'Write 150–200 words about your special place. Start with an opening that makes your reader curious. Describe what you can see, hear and feel. Finish by explaining why this place matters to you.',
    color: 'peach',
    icon: '🏡',
    posted: true,
    interactive: {
      type: 'word_scramble',
      title: 'Warm-up: Sensory Words Game',
      words: [
        {
          scrambled: 'GLMIMRE',
          word: 'GLIMMER',
          hint: 'Shining softly with a gentle light',
        },
        {
          scrambled: 'WSHPIER',
          word: 'WHISPER',
          hint: 'A quiet, gentle sound you can hear',
        },
        {
          scrambled: 'CZYONISS',
          word: 'COZINESS',
          hint: 'Feeling warm, snug, and completely safe',
        },
      ],
    },
  },
  {
    id: 'a2',
    kind: 'assignment',
    title: 'Should every school have a garden?',
    type: 'Opinion essay',
    due: '2026-11-06',
    minutes: 30,
    words: 180,
    description: 'Your opinion matters. Let’s give it some good reasons.',
    instructions:
      'Write 180–250 words. State your opinion in the introduction, give two reasons with examples, and finish with a conclusion. Try using “I believe”, “For example” and “In conclusion”.',
    color: 'mint',
    icon: '🌱',
    posted: true,
    interactive: {
      type: 'quiz',
      title: 'Opinion vs. Fact Quick Quiz',
      questions: [
        {
          question: 'Which of these is an opinion statement?',
          options: [
            'Plants need sunlight and water to grow.',
            'School gardens are the most enjoyable place on Earth.',
            'Carrots grow underneath the soil.',
          ],
          correctIndex: 1,
          explanation:
            'Saying something is "the most enjoyable" expresses a personal feeling or opinion, not a scientific fact.',
        },
        {
          question: 'Which connecting phrase is best for introducing an example in your essay?',
          options: ['For instance', 'However', 'In addition'],
          correctIndex: 0,
          explanation:
            '"For instance" is a fantastic transition word to give a specific illustration of your point!',
        },
      ],
    },
  },
  {
    id: 'a3',
    kind: 'assignment',
    title: 'The day everything went backwards',
    type: 'Creative writing',
    due: '2026-11-10',
    minutes: 20,
    words: 120,
    description: 'A little imagination can take your story a long way.',
    instructions:
      'Write a story of 120–180 words. Include a beginning, a surprising problem and an ending. What happened when everything went backwards?',
    color: 'lavender',
    icon: '🚀',
    posted: true,
    interactive: {
      type: 'word_scramble',
      title: 'Creative Words Challenge',
      words: [
        {
          scrambled: 'MRSYEIT',
          word: 'MYSTERY',
          hint: 'Something strange or puzzling to solve',
        },
        {
          scrambled: 'SPRSIRUE',
          word: 'SURPRISE',
          hint: 'An unexpected event that shocks you',
        },
      ],
    },
  },
  {
    id: 'a4',
    kind: 'assignment',
    title: 'Would you rather?',
    type: 'Opinion essay',
    due: '2026-11-12',
    minutes: 30,
    words: 250,
    description:
      'Write a 200–250 body paragraph showing your opinion on one of the "Would you rather?" questions we covered in class.',
    instructions:
      'Write a 200–250 body paragraph showing your opinion on one of the ‘Would you rather?’ questions we covered in class. Try and use the PEEL structure that we did, and you don’t need to write an introduction or conclusion either.',
    color: 'peach',
    icon: '🤔',
    posted: true,
    interactive: {
      type: 'quiz',
      title: 'Warm-up: Persuasive Arguments Quiz',
      questions: [
        {
          question: 'What makes a "Would You Rather" body paragraph most persuasive?',
          options: [
            'Using the PEEL structure with clear Point, Evidence/Explanation, and Link',
            'Repeating your choice over and over without reasons',
            'Writing only one short sentence',
          ],
          correctIndex: 0,
          explanation:
            'The PEEL structure (Point, Explanation, Evidence, Link) ensures your argument is clear, organized, and persuasive!',
        },
        {
          question: 'Which transition phrase is best to compare your choice with the alternative?',
          options: ['On the other hand', 'In conclusion', 'Suddenly'],
          correctIndex: 0,
          explanation:
            '"On the other hand" is a great transitional phrase to contrast two opposing choices!',
        },
      ],
    },
  },
];

export const INITIAL_MATERIALS: MaterialEntry[] = [
  {
    id: 'r1',
    kind: 'material',
    title: 'The essay-building toolkit',
    type: 'Writing guide',
    color: 'mint',
    icon: '🧩',
    body: `Think of your essay as a little house.

1. INTRODUCTION — Open the door. Introduce your topic and let your reader know what to expect.

2. BODY — Explore the rooms. Each paragraph should have one main idea, an explanation and a specific example.

3. CONCLUSION — Say goodbye. Bring your ideas together and leave your reader with one final thought.

Try it: write one sentence for each part before you start your first draft.`,
    interactive: {
      type: 'quiz',
      title: 'Essay Architecture Quiz',
      questions: [
        {
          question: 'What is the main job of an essay introduction?',
          options: [
            'To introduce your topic and welcome the reader',
            'To write a list of spelling words',
            'To summarize the whole essay in two words',
          ],
          correctIndex: 0,
          explanation:
            'The introduction opens the door and lets your reader know what great ideas are coming!',
        },
        {
          question: 'What should each body paragraph focus on?',
          options: [
            'As many different topics as possible',
            'One clear main idea with an explanation and example',
            'Only drawings',
          ],
          correctIndex: 1,
          explanation:
            'Focusing on one main idea per paragraph makes your writing super clear and enjoyable to read.',
        },
      ],
    },
  },
  {
    id: 'r2',
    kind: 'material',
    title: 'Words that connect your ideas',
    type: 'Word bank',
    color: 'peach',
    icon: '🔗',
    body: `ADD AN IDEA
Also • In addition • Another reason

GIVE AN EXAMPLE
For example • For instance • Such as

SHOW A DIFFERENCE
However • On the other hand • Although

SHOW A REASON
Because • Therefore • As a result

FINISH YOUR ESSAY
In conclusion • To sum up

Challenge: choose three connecting phrases and use them in your next essay.`,
    interactive: {
      type: 'connecting_words',
      title: 'Connecting Words Challenge',
      pairs: [
        { phrase: 'For example', category: 'Give an example' },
        { phrase: 'However', category: 'Show a difference' },
        { phrase: 'In addition', category: 'Add an idea' },
        { phrase: 'Because', category: 'Show a reason' },
      ],
    },
  },
  {
    id: 'r3',
    kind: 'material',
    title: 'Ready to hand it in?',
    type: 'Revision checklist',
    color: 'lavender',
    icon: '🔍',
    body: `Read your writing out loud, then check:

□ Does my opening introduce the topic?
□ Does each paragraph have one main idea?
□ Have I included specific examples?
□ Does my ending bring the ideas together?
□ Do my sentences start with capital letters?
□ Have I checked spelling and punctuation?

A good writer revises. Small changes make a big difference!`,
    interactive: {
      type: 'word_scramble',
      title: 'Editor’s Vocabulary Scramble',
      words: [
        {
          scrambled: 'REISVE',
          word: 'REVISE',
          hint: 'To read your work again and polish your ideas',
        },
        {
          scrambled: 'CIPATAL',
          word: 'CAPITAL',
          hint: 'The kind of letter every good sentence starts with',
        },
      ],
    },
  },
];

export const INITIAL_BILLING_CONFIG: BillingConfigEntry = {
  id: 'billing_global',
  kind: 'billing_config',
  defaultRate: 900,
  currency: 'CZK',
  profiles: {
    hajun: {
      studentId: 'hajun',
      ratePerLesson: 300,
      paidLessonsCount: 3,
      notes: 'Paid through Oct 26',
    },
    mark: {
      studentId: 'mark',
      ratePerLesson: 300,
      paidLessonsCount: 4,
      notes: 'Paid through Nov 2',
    },
    juwon: {
      studentId: 'juwon',
      ratePerLesson: 300,
      paidLessonsCount: 2,
      notes: 'Paid for Oct 12 & Oct 26',
    },
  },
};

export const INITIAL_ATTENDANCE: AttendanceEntry[] = [
  {
    id: 'att-1',
    kind: 'attendance',
    date: '2026-10-12',
    topic: 'Lesson 1',
    ratePerLesson: 800,
    paid: true,
    records: [
      { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: true },
      { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: true },
      { studentId: 'juwon', studentName: 'Juwon', status: 'present', chargeable: true, paid: true },
    ],
  },
  {
    id: 'att-2',
    kind: 'attendance',
    date: '2026-10-19',
    topic: 'Lesson 2',
    ratePerLesson: 800,
    paid: true,
    records: [
      { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: true },
      { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: true },
      { studentId: 'juwon', studentName: 'Juwon', status: 'absent', chargeable: false, paid: true, note: 'Excused' },
    ],
  },
  {
    id: 'att-3',
    kind: 'attendance',
    date: '2026-10-26',
    topic: 'Lesson 3',
    ratePerLesson: 800,
    paid: true,
    records: [
      { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: true },
      { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: true },
      { studentId: 'juwon', studentName: 'Juwon', status: 'present', chargeable: true, paid: true },
    ],
  },
  {
    id: 'att-4',
    kind: 'attendance',
    date: '2026-11-02',
    topic: 'Lesson 4',
    ratePerLesson: 800,
    paid: false,
    records: [
      { studentId: 'hajun', studentName: 'Hajun', status: 'present', chargeable: true, paid: false },
      { studentId: 'mark', studentName: 'Mark', status: 'present', chargeable: true, paid: false },
      { studentId: 'juwon', studentName: 'Juwon', status: 'present', chargeable: true, paid: false },
    ],
  },
];

