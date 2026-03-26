import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import { useSwipePrevNext } from '../hooks/useSwipePrevNext';
import type { Question } from '../types/models';
import { isAnswerCorrect, normalizeQuestionType, questionTypeLabel } from '../lib/questionAnswer';
import { appendExamSession, getRevealAll } from '../storage/appStorage';

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
  const bankKey = useMemo(() => questions.map((x) => x.id).join(','), [questions]);

  const durationMinutes = state?.durationMinutes ?? 30;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() =>
    questions.map(() => null)
  );
  const [revealed, setRevealed] = useState<boolean[]>(() => questions.map(() => false));
  const [multiSubmitted, setMultiSubmitted] = useState<boolean[]>(() =>
    questions.map(() => false)
  );
  const [, setRevealTick] = useState(0);
  const [started] = useState(() => Date.now());
  const [leftSec, setLeftSec] = useState(durationMinutes * 60);
  const snap = useRef({ answers, idx });
  snap.current = { answers, idx };
  const timeUpDone = useRef(false);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const swipeHandlersRef = useRef({ prev: () => {}, next: () => {} });

  useEffect(() => {
    const fn = () => setRevealTick((t) => t + 1);
    window.addEventListener('app-reveal-changed', fn);
    return () => window.removeEventListener('app-reveal-changed', fn);
  }, []);

  useEffect(() => {
    setIdx(0);
    setAnswers(questions.map(() => null));
    setRevealed(questions.map(() => false));
    setMultiSubmitted(questions.map(() => false));
  }, [bankKey]);

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
    const totalN = questions.length;
    const correct = scoreExam(questions, finalAnswers);
    appendExamSession({
      sessionId: crypto.randomUUID(),
      total: totalN,
      correct,
      durationSec: Math.floor((Date.now() - started) / 1000),
      endedAt: Date.now(),
    });
    navigate('/exam/result', {
      state: { total: totalN, correct },
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

  const revealAllGlobal = getRevealAll();

  const prev = () => {
    if (total === 0 || idx <= 0) return;
    markRevealed(idx);
    setIdx((i) => i - 1);
  };

  const next = () => {
    if (total === 0) return;
    if (q && normalizeQuestionType(q) === 'multi' && !multiSubmitted[idx] && !revealAllGlobal) {
      return;
    }
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
  const answerRevealed =
    revealAllGlobal ||
    revealed[idx] ||
    (qt === 'multi' ? multiSubmitted[idx] : choice !== null);

  const multiNextBlocked =
    qt === 'multi' && !multiSubmitted[idx] && !revealAllGlobal;

  return (
    <div className="quiz-page">
      <div className="exam-timer">
        剩余 {mm}:{ss}
        <button type="button" className="linkish" onClick={submitAll}>
          交卷
        </button>
      </div>
      <p className="progress-text">
        {idx + 1} / {total} （{questionTypeLabel(qt)}）
      </p>
      <div className="quiz-swipe-area" ref={swipeAreaRef}>
        <QuestionCard
          question={q}
          userChoice={choice}
          onChoose={onChoose}
          answerRevealed={answerRevealed}
          onMultiSubmit={
            qt === 'multi'
              ? () =>
                  setMultiSubmitted((m) => {
                    const n = [...m];
                    n[idx] = true;
                    return n;
                  })
              : undefined
          }
        />
      </div>
      <div className="quiz-toolbar">
        <div className="quiz-toolbar-actions" aria-label="题目切换">
          <div className="quiz-toolbar-btns">
            <button
              type="button"
              className="secondary-btn quiz-toolbar-btn"
              disabled={idx === 0}
              onClick={prev}
            >
              上一题
            </button>
            <button
              type="button"
              className="primary-btn quiz-toolbar-btn"
              disabled={multiNextBlocked}
              title={multiNextBlocked ? '请先点击「提交答案」' : undefined}
              onClick={next}
            >
              {idx + 1 >= total ? '完成' : '下一题'}
            </button>
          </div>
          <p className="swipe-hint muted quiz-swipe-hint">左右滑动可切换题目</p>
        </div>
      </div>
    </div>
  );
}
