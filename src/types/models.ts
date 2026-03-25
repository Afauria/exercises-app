export type QuestionType = 'choice' | 'boolean';

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: number;
  bankId: string;
  ordinal: number;
  stem: string;
  qtype: QuestionType;
  answer: string;
  explanation: string | null;
  options: QuestionOption[] | null;
}

export interface ImportReport {
  bankId: string;
  bankName: string;
  parsed: number;
  failed: number;
  errors: string[];
}

export interface ExamConfig {
  durationMinutes: number;
  questionCount: number;
  bankId: string | null;
}

export interface ExamResult {
  sessionId: string;
  total: number;
  correct: number;
  durationSec: number;
  endedAt: number;
}
