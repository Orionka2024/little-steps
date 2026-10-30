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

export interface FileAttachment {
  key: string;
  name: string;
  size: number;
}

export type ActivityType = 'quiz' | 'word_scramble' | 'connecting_words';

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
  | ConnectingWordsActivity;

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
  due: string;
  minutes: number;
  words?: number;
  description: string;
  instructions: string;
  color: 'peach' | 'mint' | 'lavender' | string;
  icon?: string;
  interactive?: InteractiveActivity;
  localId?: string;
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
  activityScore?: ActivityScore;
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

export type Entry = AssignmentEntry | MaterialEntry | SubmissionEntry | MessageEntry;

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
