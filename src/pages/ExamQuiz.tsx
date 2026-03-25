import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import type { Question } from '../types/models';
import { appendExamSession } from '../storage/appStorage';

function normalizeChoice(ans: string): string {
  const t = ans.trim().toUpperCase();
  if (/^[A-D]$/.test(t)) return t;
  return ans.trim();
}

function isCorrect(q: Question, choice: string): boolean {
  if (q.qtype === 'boolean') {
    return (
      (q.answer.includes('正确') && choice === '正确') ||
      (q.answer.includes('错误') && choice === '错误')
    );
  }
  return normalizeChoice(choice) === normalizeChoice(q.answer);
}

function scoreExam(questions: Question[], answers: (string | null)[]): number {
  let c = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const ch = answers[i];
    if (ch != null && isCorrect(questions[i]!, ch)) c += 1;
  }
  return c;
}

export function ExamQuiz() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { questions?: Question[]; durationMinutes?: number };
  };
  const questions = state?.questions ?? [];
  const durationMinutes = state?.durationMinutes ?? 30;
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>(() =>
    questions.map(() => null)
  );
  const [started] = useState(() => Date.now());
  const [leftSec, setLeftSec] = useState(durationMinutes * 60);
  const snap = useRef({ answers, idx, choice });
  snap.current = { answers, idx, choice };
  const timeUpDone = useRef(false);

  const finalize = (finalAnswers: (string | null)[]) => {
    const total = questions.length;
    const correct = scoreExam(questions, finalAnswers);
    appendExamSession({
      sessionId: crypto.randomUUID(),
      total,
      correct,
      durationSec: Math.floor((Date.now() - started) / 1000),
      endedAt: Date.now(),
    });
    navigate('/exam/result', {
      state: { total, correct },
      replace: true,
    });
  };

  useEffect(() => {
    if (questions.length === 0) {
      navigate('/exam', { replace: true });
    }
  }, [questions.length, navigate]);

  useEffect(() => {
    if (questions.length === 0) return;
    const id = window.setInterval(() => {
      setLeftSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [questions.length]);

  useEffect(() => {
    if (leftSec !== 0 || questions.length === 0 || timeUpDone.current) return;
    timeUpDone.current = true;
    const { answers: a, idx: i, choice: ch } = snap.current;
    const copy = [...a];
    copy[i] = ch ?? copy[i] ?? null;
    finalize(copy);
  }, [leftSec, questions.length]);

  const q = questions[idx];
  const total = questions.length;

  if (!q) return null;

  const onChoose = (label: string) => {
    if (choice !== null) return;
    setChoice(label);
  };

  const next = () => {
    const copy = [...answers];
    copy[idx] = choice;
    if (idx + 1 >= total) {
      finalize(copy);
      return;
    }
    setAnswers(copy);
    setIdx((i) => i + 1);
    setChoice(null);
  };

  const submitAll = () => {
    const copy = [...answers];
    copy[idx] = choice ?? copy[idx] ?? null;
    finalize(copy);
  };

  const mm = String(Math.floor(leftSec / 60)).padStart(2, '0');
  const ss = String(leftSec % 60).padStart(2, '0');

  return (
    <div className="quiz-page">
      <div className="exam-timer">
        剩余 {mm}:{ss}
        <button type="button" className="linkish" onClick={submitAll}>
          交卷
        </button>
      </div>
      <p className="progress-text">
        {idx + 1} / {total}
      </p>
      <QuestionCard question={q} userChoice={choice} onChoose={onChoose} />
      <div className="quiz-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={choice === null}
          onClick={next}
        >
          {idx + 1 >= total ? '完成' : '下一题'}
        </button>
      </div>
    </div>
  );
}
