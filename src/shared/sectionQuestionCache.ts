import { getQuestionsSequential } from '../db/repository';
import type { Question } from '../types/models';
import { PAGE_SIZE, sectionCountFromTotal } from './sectionConstants';

const cache = new Map<string, Question[]>();

function key(bankId: string, sectionIndex: number) {
  return `${bankId}#${sectionIndex}`;
}

export function clearQuestionSectionCache() {
  cache.clear();
}

/**
 * 分节读取题目；命中缓存则同步返回，避免重复查库。
 */
export async function getOrLoadSectionQuestions(
  bankId: string,
  sectionIndex: number
): Promise<Question[]> {
  const k = key(bankId, sectionIndex);
  const hit = cache.get(k);
  if (hit) return hit;
  const rows = await getQuestionsSequential(
    bankId,
    sectionIndex * PAGE_SIZE,
    PAGE_SIZE
  );
  cache.set(k, rows);
  return rows;
}

/** 触发后台预加载（不 await），用于首屏后填充缓存 */
export function prefetchSectionQuestions(bankId: string, sectionIndex: number) {
  void getOrLoadSectionQuestions(bankId, sectionIndex);
}

/** 在首屏交互完成后预取前几节题目 */
export function prefetchInitialSections(
  bankId: string,
  totalCount: number,
  maxSections = 4
) {
  const n = sectionCountFromTotal(totalCount);
  const lim = Math.min(n, maxSections);
  for (let i = 0; i < lim; i++) {
    prefetchSectionQuestions(bankId, i);
  }
}
