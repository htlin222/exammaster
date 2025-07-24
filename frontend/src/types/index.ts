// Core data models based on PRD requirements

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
  answer: string[]; // Support multiple answers
  explanation?: string;
  tags?: string[];
  imageUrl?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  source?: string;
  index?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionGroup {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  questionIds: string[];
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionRecord {
  questionId: string;
  userAnswer: string[];
  isCorrect: boolean;
  timeSpent: number; // in seconds
  marked: boolean;
}

export interface PracticeSession {
  id: string;
  groupId: string;
  mode: PracticeMode;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  questions: QuestionRecord[];
  createdAt: string;
}

export type PracticeMode = 'test' | 'practice' | 'review' | 'wrong-questions';

export interface WrongQuestion {
  id: string;
  questionId: string;
  addedAt: string;
  reviewedAt?: string;
  timesReviewed: number;
  lastResult: boolean;
  notes: string;
}

export interface WrongQuestionWithDetails {
  wrongQuestion: WrongQuestion;
  question: Question;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  defaultPracticeMode: PracticeMode;
  dailyReminder: boolean;
  language: string;
}

// UI State interfaces
export interface PracticeState {
  currentQuestionIndex: number;
  userAnswers: Record<string, string[]>;
  markedQuestions: Set<string>;
  timeSpent: Record<string, number>;
  isTimerRunning: boolean;
  sessionStartTime?: Date;
}

// Import/Export interfaces
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: number;
}

export interface ExportData {
  questions: Question[];
  groups: QuestionGroup[];
  sessions: PracticeSession[];
  settings: UserSettings;
  exportedAt: string;
}

export interface PracticeSettings {
  mode: PracticeMode;
  questionCount: number;
  randomize: boolean;
  selectedGroups: string[];
  selectedTags: string[];
  difficulty: number[];
}