import type { Question, QuestionType } from '../types/models';

/** 题库 JSON 中曾用 choice，统一为 single / multi */
export function normalizeQuestionType(q: Question): QuestionType {
  const t = q.qtype as string;
  if (t === 'single' || t === 'multi' || t === 'boolean') return t;
  if (t === 'choice') {
    return /[,，]/.test(String(q.answer).trim()) ? 'multi' : 'single';
  }
  return 'single';
}

export function normalizeQuestion(q: Question): Question {
  const qtype = normalizeQuestionType(q);
  return {
    ...q,
    qtype,
    options: qtype === 'boolean' ? null : q.options,
  };
}

export function normalizeBankQuestions(questions: Question[]): Question[] {
  return questions.map(normalizeQuestion);
}

/** 多选答案规范为排序后的 A,B,C */
export function normalizeMultiAnswer(raw: string): string {
  const parts = raw
    .split(/[,，、\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-D]$/.test(s));
  return [...new Set(parts)].sort().join(',');
}

function normalizeSingleToken(raw: string): string {
  const t = raw.trim().toUpperCase();
  return /^[A-D]$/.test(t) ? t : raw.trim();
}

export function isAnswerCorrect(q: Question, userAnswer: string): boolean {
  const qt = normalizeQuestionType(q);
  if (qt === 'boolean') {
    return (
      (q.answer.includes('正确') && userAnswer === '正确') ||
      (q.answer.includes('错误') && userAnswer === '错误')
    );
  }
  if (qt === 'multi') {
    return normalizeMultiAnswer(userAnswer) === normalizeMultiAnswer(q.answer);
  }
  return normalizeSingleToken(userAnswer) === normalizeSingleToken(q.answer);
}

export function questionTypeLabel(qtype: QuestionType): string {
  switch (qtype) {
    case 'multi':
      return '多选题';
    case 'boolean':
      return '判断题';
    default:
      return '单选题';
  }
}

/** 某选项是否为正确答案（用于高亮） */
export function isCorrectOptionLabel(q: Question, label: string): boolean {
  const qt = normalizeQuestionType(q);
  const L = label.trim().toUpperCase();
  if (qt === 'boolean') return false;
  if (qt === 'multi') {
    const set = new Set(
      normalizeMultiAnswer(q.answer)
        .split(',')
        .filter(Boolean)
    );
    return set.has(L);
  }
  return normalizeSingleToken(q.answer) === L;
}
