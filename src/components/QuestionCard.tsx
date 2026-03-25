import { useEffect, useState } from 'react';
import type { Question } from '../types/models';
import { getRevealAll } from '../storage/appStorage';

function normalizeChoice(ans: string): string {
  const t = ans.trim().toUpperCase();
  if (/^[A-D]$/.test(t)) return t;
  return ans.trim();
}

export function QuestionCard({
  question,
  userChoice,
  onChoose,
  disabled,
}: {
  question: Question;
  userChoice: string | null;
  onChoose: (label: string) => void;
  disabled?: boolean;
}) {
  const [revealAll, setRevealAll] = useState(getRevealAll);
  useEffect(() => {
    const on = () => setRevealAll(getRevealAll());
    window.addEventListener('app-reveal-changed', on);
    return () => window.removeEventListener('app-reveal-changed', on);
  }, []);

  const showAnswer = revealAll || userChoice !== null;

  return (
    <article className="question-card">
      <p className="stem">
        <strong>{question.ordinal}.</strong> {question.stem}
      </p>

      {question.qtype === 'choice' && question.options && (
        <div className="options">
          {question.options.map((o) => {
            const picked = userChoice === o.label;
            const isRight = normalizeChoice(o.label) === normalizeChoice(question.answer);
            let cls = 'opt-btn';
            if (showAnswer) {
              if (isRight) cls += ' opt-right';
              else if (picked) cls += ' opt-wrong';
            } else if (picked) cls += ' opt-picked';
            return (
              <button
                key={o.label}
                type="button"
                className={cls}
                disabled={disabled}
                onClick={() => onChoose(o.label)}
              >
                {o.label}. {o.text}
              </button>
            );
          })}
        </div>
      )}

      {question.qtype === 'boolean' && (
        <div className="options bool-row">
          {(['正确', '错误'] as const).map((label) => {
            const picked = userChoice === label;
            const isRight =
              (label === '正确' && question.answer.includes('正确')) ||
              (label === '错误' && question.answer.includes('错误'));
            let cls = 'opt-btn';
            if (showAnswer) {
              if (isRight) cls += ' opt-right';
              else if (picked) cls += ' opt-wrong';
            } else if (picked) cls += ' opt-picked';
            return (
              <button
                key={label}
                type="button"
                className={cls}
                disabled={disabled}
                onClick={() => onChoose(label)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {showAnswer && question.explanation && (
        <p className="explain">解析：{question.explanation}</p>
      )}
    </article>
  );
}
