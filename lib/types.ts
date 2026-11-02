export type Role = 'Student' | 'Teacher';

export type HomeworkStatus = 'To do' | 'Draft' | 'Handed in' | 'Reviewed';

export interface Student {
  id: string;
  name: string;
  avatar: string;
}

export const STUDENTS: Student[] = [
  { id: 'hajun', name: 'Hajun', avatar: 'H' },
  { id: 'mark', name: 'Mark', avatar: 'M' },
  { id: 'juwon', name: 'Juwon', avatar: 'J' },
];

export const PREVIEW_STUDENT: Student = {
  id: 'preview',
  name: 'Student',
  avatar: 'S',
};

export interface FileAttachment {
  key: string;
  name: string;
  size: number;
}

export type ActivityType = 'quiz' | 'word_scramble' | 'connecting_words' | 'flashcards';

export interface FlashCardItem {
  front: string;
  back: string;
  hint?: string;
}

export interface FlashCardsActivity {
  type: 'flashcards';
  title: string;
  cards: FlashCardItem[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizActivity {
  type: 'quiz';
  title: string;
  questions: QuizQuestion[];
}

export interface WordScrambleItem {
  scrambled: string;
  word: string;
  hint: string;
}

export interface WordScrambleActivity {
  type: 'word_scramble';
  title: string;
  words: WordScrambleItem[];
}

export interface ConnectingWordsPair {
  phrase: string;
  category: string;
}

export interface ConnectingWordsActivity {
  type: 'connecting_words';
  title: string;
  pairs: ConnectingWordsPair[];
}

export type InteractiveActivity =
  | QuizActivity
  | WordScrambleActivity
  | ConnectingWordsActivity
  | FlashCardsActivity;

export type AssignmentTaskType =
  | 'essay'
  | 'flashcards'
  | 'test'
  | 'word_scramble'
  | 'connecting_words';

export interface ActivityScore {
  score: number;
  total: number;
  completedAt: string;
}

export interface AssignmentEntry {
  id: string;
  kind: 'assignment';
  title: string;
  type: string;
  taskType?: AssignmentTaskType;
  due: string;
  minutes: number;
  words?: number;
  description: string;
  instructions: string;
  color: 'peach' | 'mint' | 'lavender' | string;
  icon?: string;
  interactive?: InteractiveActivity;
  localId?: string;
  posted?: boolean;
}

export interface MaterialEntry {
  id: string;
  kind: 'material';
  title: string;
  type: string;
  color: 'peach' | 'mint' | 'lavender' | string;
  icon?: string;
  body: string;
  file?: FileAttachment;
  interactive?: InteractiveActivity;
  localId?: string;
}

export interface AnnotationPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface AnnotationStroke {
  color: string;
  size: number;
  isHighlighter?: boolean;
  points: AnnotationPoint[];
}

export interface WritingScorecard {
  ideas: number;
  structure: number;
  development: number;
  vocabulary: number;
  grammar: number;
  total: number;
  targetSkills: string[];
  interpretation?: string;
  assessedWeek?: string;
  assessedAt?: string;
}

export interface SubmissionEntry {
  id: string;
  kind: 'submission';
  assignment: string;
  studentId?: string;
  studentName?: string;
  text: string;
  files: FileAttachment[];
  status: HomeworkStatus;
  feedback?: string;
  annotations?: string;
  activityScore?: ActivityScore;
  scorecard?: WritingScorecard;
  updated?: string;
  localId?: string;
}

export interface MessageEntry {
  id: string;
  kind: 'message';
  text: string;
  sender: Role | string;
  studentId?: string;
  time: string;
  localId?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface StudentAttendanceRecord {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  chargeable: boolean;
  paid?: boolean;
  note?: string;
}

export interface AttendanceEntry {
  id: string;
  kind: 'attendance';
  date: string;
  topic?: string;
  durationMinutes?: number;
  records: StudentAttendanceRecord[];
  ratePerLesson?: number;
  paid?: boolean;
  notes?: string;
  localId?: string;
}

export interface StudentBillingProfile {
  studentId: string;
  ratePerLesson?: number;
  paidLessonsCount: number;
  notes?: string;
}

export interface BillingConfigEntry {
  id: string;
  kind: 'billing_config';
  defaultRate: number;
  currency: string;
  profiles: Record<string, StudentBillingProfile>;
  localId?: string;
}

export interface DeletedAttendanceEntry {
  id: string;
  kind: 'deleted_attendance';
  targetId: string;
  localId?: string;
}

export type Entry =
  | AssignmentEntry
  | MaterialEntry
  | SubmissionEntry
  | MessageEntry
  | AttendanceEntry
  | BillingConfigEntry
  | DeletedAttendanceEntry;

export function isAssignment(entry: Entry): entry is AssignmentEntry {
  return entry.kind === 'assignment';
}

export function isMaterial(entry: Entry): entry is MaterialEntry {
  return entry.kind === 'material';
}

export function isSubmission(entry: Entry): entry is SubmissionEntry {
  return entry.kind === 'submission';
}

export function isMessage(entry: Entry): entry is MessageEntry {
  return entry.kind === 'message';
}

export function isAttendance(entry: Entry): entry is AttendanceEntry {
  return entry.kind === 'attendance';
}

export function isBillingConfig(entry: Entry): entry is BillingConfigEntry {
  return entry.kind === 'billing_config';
}

export function isDeletedAttendance(entry: Entry): entry is DeletedAttendanceEntry {
  return entry.kind === 'deleted_attendance';
}


