import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import { useSwipePrevNext } from '../hooks/useSwipePrevNext';
import type { Question } from '../types/models';
import { isAnswerCorrect, normalizeQuestionType, questionTypeLabel } from '../lib/questionAnswer';
import { appendExamSession } from '../storage/appStorage';

function scoreExam(questions: Question[], answers: (string | null)[]): number {
  let c = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const ch = answers[i];
    if (ch != null && isAnswerCorrect(questions[i]!, ch)) c += 1;
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
  const [answers, setAnswers] = useState<(string | null)[]>(() =>
    questions.map(() => null)
  );
  const [revealed, setRevealed] = useState<boolean[]>(() => questions.map(() => false));
  const [started] = useState(() => Date.now());
  const [leftSec, setLeftSec] = useState(durationMinutes * 60);
  const snap = useRef({ answers, idx });
  snap.current = { answers, idx };
  const timeUpDone = useRef(false);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const swipeHandlersRef = useRef({ prev: () => {}, next: () => {} });

  const choice = answers[idx] ?? null;

  const q = questions[idx] ?? null;
  const total = questions.length;

  const markRevealed = (i: number) => {
    setRevealed((r) => {
      if (r[i]) return r;
      const n = [...r];
      n[i] = true;
      return n;
    });
  };

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
    return () => clearInterval(id);
  }, [questions.length]);

  useEffect(() => {
    if (leftSec !== 0 || questions.length === 0 || timeUpDone.current) return;
    timeUpDone.current = true;
    const { answers: a } = snap.current;
    setRevealed(questions.map(() => true));
    finalize([...a]);
  }, [leftSec, questions.length]);

  const onChoose = (label: string) => {
    const cur = questions[idx];
    if (!cur) return;
    const qt = normalizeQuestionType(cur);
    if (qt === 'multi') {
      setAnswers((prev) => {
        const curS = prev[idx] ?? '';
        const set = new Set(
          curS
            .split(/[,，]+/)
            .map((x) => x.trim().toUpperCase())
            .filter((x) => /^[A-D]$/.test(x))
        );
        const L = label.trim().toUpperCase();
        if (set.has(L)) set.delete(L);
        else set.add(L);
        const joined = [...set].sort().join(',');
        const nextA = [...prev];
        nextA[idx] = joined.length ? joined : null;
        return nextA;
      });
      return;
    }
    setAnswers((prev) => {
      if (prev[idx] !== null) return prev;
      const nextA = [...prev];
      nextA[idx] = label;
      return nextA;
    });
  };

  const prev = () => {
    if (total === 0 || idx <= 0) return;
    markRevealed(idx);
    setIdx((i) => i - 1);
  };

  const next = () => {
    if (total === 0) return;
    markRevealed(idx);
    if (idx + 1 >= total) {
      finalize([...answers]);
      return;
    }
    setIdx((i) => i + 1);
  };

  const submitAll = () => {
    if (total === 0) return;
    setRevealed(questions.map(() => true));
    finalize([...answers]);
  };

  swipeHandlersRef.current = { prev, next };
  useSwipePrevNext(swipeAreaRef, swipeHandlersRef, total > 0 && q ? 1 : 0);

  const mm = String(Math.floor(leftSec / 60)).padStart(2, '0');
  const ss = String(leftSec % 60).padStart(2, '0');

  if (!q) return null;

  const qt = normalizeQuestionType(q);
  const answerRevealed = revealed[idx] || (choice != null && qt !== 'multi');

  return (
    <div className="quiz-page quiz-page-with-side-nav">
      <div className="quiz-main-col" ref={swipeAreaRef}>
        <div className="exam-timer">
          剩余 {mm}:{ss}
          <button type="button" className="linkish" onClick={submitAll}>
            交卷
          </button>
        </div>
        <p className="progress-text">
          {idx + 1} / {total} （{questionTypeLabel(qt)}）
        </p>
        <p className="swipe-hint muted">左右滑动可切换题目</p>
        <QuestionCard
          question={q}
          userChoice={choice}
          onChoose={onChoose}
          answerRevealed={answerRevealed}
        />
      </div>
      <aside className="quiz-nav-rail" aria-label="题目切换">
        <button type="button" className="secondary-btn" disabled={idx === 0} onClick={prev}>
          上一题
        </button>
        <button type="button" className="primary-btn nav-next-btn" onClick={next}>
          {idx + 1 >= total ? '完成' : '下一题'}
        </button>
      </aside>
    </div>
  );
}
