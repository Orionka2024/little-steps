import { z } from 'zod';

export const FileAttachmentSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  size: z.number().int().nonnegative().max(10485760),
});

export const QuizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
  explanation: z.string().default(''),
});

export const QuizActivitySchema = z.object({
  type: z.literal('quiz'),
  title: z.string().min(1),
  questions: z.array(QuizQuestionSchema).min(1),
});

export const WordScrambleItemSchema = z.object({
  scrambled: z.string().min(1),
  word: z.string().min(1),
  hint: z.string().default(''),
});

export const WordScrambleActivitySchema = z.object({
  type: z.literal('word_scramble'),
  title: z.string().min(1),
  words: z.array(WordScrambleItemSchema).min(1),
});

export const ConnectingWordsPairSchema = z.object({
  phrase: z.string().min(1),
  category: z.string().min(1),
});

export const ConnectingWordsActivitySchema = z.object({
  type: z.literal('connecting_words'),
  title: z.string().min(1),
  pairs: z.array(ConnectingWordsPairSchema).min(1),
});

export const InteractiveActivitySchema = z.discriminatedUnion('type', [
  QuizActivitySchema,
  WordScrambleActivitySchema,
  ConnectingWordsActivitySchema,
]);

export const ActivityScoreSchema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  completedAt: z.string().min(1),
});

export const AssignmentPayloadSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('assignment'),
  title: z.string().min(1).max(100),
  type: z.string().min(1).max(40),
  due: z.string().min(1),
  minutes: z.number().int().positive().default(25),
  words: z.number().int().positive().optional(),
  description: z.string().min(1).max(300),
  instructions: z.string().min(1).max(6000),
  color: z.enum(['peach', 'mint', 'lavender']).or(z.string()).default('mint'),
  icon: z.string().optional(),
  interactive: InteractiveActivitySchema.optional(),
  localId: z.string().optional(),
});

export const MaterialPayloadSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('material'),
  title: z.string().min(1).max(100),
  type: z.string().min(1).max(40),
  color: z.enum(['peach', 'mint', 'lavender']).or(z.string()).default('mint'),
  icon: z.string().optional(),
  body: z.string().min(1).max(15000),
  file: FileAttachmentSchema.optional(),
  interactive: InteractiveActivitySchema.optional(),
  localId: z.string().optional(),
});

export const SubmissionPayloadSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('submission'),
  assignment: z.string().min(1),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  text: z.string().max(50000).default(''),
  files: z.array(FileAttachmentSchema).default([]),
  status: z.enum(['To do', 'Draft', 'Handed in', 'Reviewed']).default('Draft'),
  feedback: z.string().max(10000).optional().default(''),
  annotations: z.string().max(500000).optional(),
  activityScore: ActivityScoreSchema.optional(),
  updated: z.string().optional(),
  localId: z.string().optional(),
});

export const MessagePayloadSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('message'),
  text: z.string().min(1).max(3000),
  sender: z.string(),
  studentId: z.string().optional(),
  time: z.string().min(1),
  localId: z.string().optional(),
});

export const EntryPayloadSchema = z.discriminatedUnion('kind', [
  AssignmentPayloadSchema,
  MaterialPayloadSchema,
  SubmissionPayloadSchema,
  MessagePayloadSchema,
]);

export type ValidatedEntry = z.infer<typeof EntryPayloadSchema>;
