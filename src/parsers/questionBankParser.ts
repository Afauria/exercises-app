import type { QuestionOption, QuestionType } from '../types/models';

export interface ParsedQuestion {
  ordinal: number;
  stem: string;
  type: QuestionType;
  options: QuestionOption[];
  answer: string;
  explanation: string;
}

const ANSWER_RE = /^\s*答案[:：]\s*(.+?)\s*$/;
const EXPLAIN_RE = /^\s*解析[:：]\s*(.*)$/;
const OPTION_RE = /^\s*([A-D])[\.．]\s*(.*)$/;
const NEW_Q_RE = /^(\d+)\.\s*(.*)$/;

/**
 * 解析题库文本：单选（答案 A）、多选（答案 A,B 或 A, B）、判断（正确/错误）
 */
export function parseQuestionBank(raw: string): {
  questions: ParsedQuestion[];
  errors: string[];
} {
  const lines = raw.split(/\r?\n/);
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const startLine = lines[i]!;
    const head = startLine.match(NEW_Q_RE);
    if (!head) {
      i += 1;
      continue;
    }

    const ordinal = parseInt(head[1]!, 10);
    let stem = (head[2] ?? '').trim();
    const options: QuestionOption[] = [];
    i += 1;

    let answer: string | null = null;
    let explanation = '';

    while (i < lines.length) {
      const cur = lines[i]!;

      const nextHead = cur.match(NEW_Q_RE);
      if (nextHead) {
        const nextOrd = parseInt(nextHead[1]!, 10);
        if (nextOrd !== ordinal) {
          errors.push(`题号 ${ordinal}：在出现「答案」前遇到了新题 ${nextOrd}`);
          break;
        }
        stem = (nextHead[2] ?? '').trim();
        i += 1;
        continue;
      }

      const ansMatch = cur.match(ANSWER_RE);
      if (ansMatch) {
        answer = ansMatch[1]!.trim();
        i += 1;

        if (i < lines.length) {
          const exLine = lines[i]!;
          const exMatch = exLine.match(EXPLAIN_RE);
          if (exMatch) {
            explanation = (exMatch[1] ?? '').trim();
            i += 1;
            while (i < lines.length) {
              const l = lines[i]!;
              if (NEW_Q_RE.test(l)) break;
              if (l.trim() === '') {
                const next = i + 1 < lines.length ? lines[i + 1]! : '';
                if (next && NEW_Q_RE.test(next)) {
                  i += 1;
                  break;
                }
                i += 1;
                continue;
              }
              explanation = explanation
                ? `${explanation}\n${l.trim()}`
                : l.trim();
              i += 1;
            }
          }
        }
        break;
      }

      const optMatch = cur.match(OPTION_RE);
      if (optMatch) {
        options.push({
          label: optMatch[1]!,
          text: (optMatch[2] ?? '').trim(),
        });
        i += 1;
        continue;
      }

      if (cur.trim() === '') {
        i += 1;
        continue;
      }

      stem = stem ? `${stem}\n${cur.trim()}` : cur.trim();
      i += 1;
    }

    if (answer === null) {
      errors.push(`题号 ${ordinal}：未找到「答案」行`);
      continue;
    }

    let type: QuestionType;
    let normalizedAnswer: string;

    if (options.length === 0) {
      type = 'boolean';
      if (answer !== '正确' && answer !== '错误') {
        errors.push(
          `题号 ${ordinal}：判断题答案应为「正确」或「错误」，得到「${answer}」`
        );
        continue;
      }
      normalizedAnswer = answer;
    } else {
      const compact = answer.replace(/\s+/g, '').toUpperCase().replace(/，/g, ',');
      if (/^[A-D]$/.test(compact)) {
        type = 'single';
        normalizedAnswer = compact;
      } else if (/^[A-D](,[A-D])+$/.test(compact)) {
        type = 'multi';
        const parts = compact.split(',').filter(Boolean);
        normalizedAnswer = [...new Set(parts)].sort().join(',');
      } else {
        errors.push(
          `题号 ${ordinal}：选择题答案应为单个字母或逗号分隔的多个字母（如 A,B），得到「${answer}」`
        );
        continue;
      }
    }

    questions.push({
      ordinal,
      stem,
      type,
      options,
      answer: normalizedAnswer,
      explanation,
    });
  }

  return { questions, errors };
}
