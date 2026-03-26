import type { Question, QuestionType } from '../types/models';
import { normalizeQuestionType } from './questionAnswer';

export const PAGE_SIZE = 50;

export interface SectionSlice {
  /** 在 `getSectionSlices` 结果中的下标，用于 `questionsInSection(all, sectionIndex)` */
  sectionIndex: number;
  /** 全局连续节号（单选第 1、2 节 → 多选第 3 节…） */
  sectionNumber: number;
  qtype: QuestionType;
  questions: Question[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * 按题型分组后各组内每 50 题一节；节号全局连续（先全部单选节，再多选节，再判断题节）。
 */
export function getSectionSlices(questions: Question[]): SectionSlice[] {
  const singles = questions.filter((q) => normalizeQuestionType(q) === 'single');
  const multis = questions.filter((q) => normalizeQuestionType(q) === 'multi');
  const bools = questions.filter((q) => normalizeQuestionType(q) === 'boolean');

  const slices: SectionSlice[] = [];
  let displayN = 1;

  for (const group of [singles, multis, bools]) {
    for (const slab of chunk(group, PAGE_SIZE)) {
      if (slab.length === 0) continue;
      const qtype = normalizeQuestionType(slab[0]!);
      slices.push({
        sectionIndex: slices.length,
        sectionNumber: displayN++,
        qtype,
        questions: slab,
      });
    }
  }

  return slices;
}

export function getSectionCount(questions: Question[]): number {
  return getSectionSlices(questions).length;
}

export function questionsInSection(questions: Question[], sectionIndex: number): Question[] {
  return getSectionSlices(questions)[sectionIndex]?.questions ?? [];
}

export function isSectionFullyCompleted(
  questions: Question[],
  sectionIndex: number,
  done: Set<number>
): boolean {
  const qs = questionsInSection(questions, sectionIndex);
  if (qs.length === 0) return false;
  return qs.every((q) => done.has(q.id));
}

/** 按题型分组后的切片（用于首页分块展示） */
export function getSectionSlicesByType(
  questions: Question[]
): { qtype: QuestionType; slices: SectionSlice[] }[] {
  const all = getSectionSlices(questions);
  const order: QuestionType[] = ['single', 'multi', 'boolean'];
  return order
    .map((qt) => ({
      qtype: qt,
      slices: all.filter((s) => s.qtype === qt),
    }))
    .filter((g) => g.slices.length > 0);
}
