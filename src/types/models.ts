export type QuestionType = 'choice' | 'boolean';

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: number;
  ordinal: number;
  stem: string;
  qtype: QuestionType;
  answer: string;
  explanation: string | null;
  options: QuestionOption[] | null;
}

export interface BankDocument {
  bankName: string;
  questions: Question[];
  parseErrors?: string[];
}

export interface PracticeRecord {
  questionId: number;
  correct: boolean;
  userChoice: string;
  at: number;
}

export interface ExamSession {
  sessionId: string;
  total: number;
  correct: number;
  durationSec: number;
  endedAt: number;
}
