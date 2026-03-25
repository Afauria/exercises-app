import type { Question } from '../types/models';

export const PAGE_SIZE = 50;

export function maxOrdinal(questions: Question[]): number {
  if (questions.length === 0) return 0;
  return Math.max(...questions.map((q) => q.ordinal));
}

export function getSectionCount(questions: Question[]): number {
  const m = maxOrdinal(questions);
  if (m === 0) return 0;
  return Math.ceil(m / PAGE_SIZE);
}

export function questionsInSection(questions: Question[], sectionIndex: number): Question[] {
  const start = sectionIndex * PAGE_SIZE + 1;
  const end = (sectionIndex + 1) * PAGE_SIZE;
  return questions.filter((q) => q.ordinal >= start && q.ordinal <= end);
}
