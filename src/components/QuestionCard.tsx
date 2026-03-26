import { useEffect, useState } from 'react';
import type { Question } from '../types/models';
import { getRevealAll } from '../storage/appStorage';
import {
  isCorrectOptionLabel,
  normalizeMultiAnswer,
  normalizeQuestionType,
} from '../lib/questionAnswer';

function selectedLabels(choice: string | null): Set<string> {
  if (!choice) return new Set();
  const norm = normalizeMultiAnswer(choice);
  if (!norm) return new Set();
  return new Set(norm.split(','));
}

export function QuestionCard({
  question,
  userChoice,
  onChoose,
  answerRevealed,
  onMultiSubmit,
  disabled,
}: {
  question: Question;
  userChoice: string | null;
  onChoose: (label: string) => void;
  /** 为 true 时展示正误色与解析（多选题需提交后才会为 true，除非全局「显示答案」） */
  answerRevealed: boolean;
  /** 多选题专用：点击「提交答案」后由父组件将 answerRevealed 置为 true */
  onMultiSubmit?: () => void;
  disabled?: boolean;
}) {
  const [revealAll, setRevealAll] = useState(getRevealAll);
  useEffect(() => {
    const on = () => setRevealAll(getRevealAll());
    window.addEventListener('app-reveal-changed', on);
    return () => window.removeEventListener('app-reveal-changed', on);
  }, []);

  const qt = normalizeQuestionType(question);
  const showAnswer = revealAll || answerRevealed;

  const multiSelected = selectedLabels(userChoice);

  return (
    <article className="question-card">
      <p className="stem">
        <strong>{question.ordinal}.</strong> {question.stem}
      </p>

      {(qt === 'single' || qt === 'multi') && question.options && (
        <div className="options">
          {question.options.map((o) => {
            const label = o.label.trim().toUpperCase();
            const picked =
              qt === 'multi' ? multiSelected.has(label) : userChoice === o.label;
            const isRight = isCorrectOptionLabel(question, o.label);
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
          {qt === 'multi' && onMultiSubmit && !showAnswer && (
            <div className="multi-submit-row">
              <button type="button" className="primary-btn multi-submit-btn" onClick={onMultiSubmit}>
                提交答案
              </button>
            </div>
          )}
        </div>
      )}

      {qt === 'boolean' && (
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
