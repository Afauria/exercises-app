import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import { useSwipePrevNext } from '../hooks/useSwipePrevNext';
import type { Question } from '../types/models';
import {
  isAnswerCorrect,
  normalizeMultiAnswer,
  normalizeQuestionType,
  questionTypeLabel,
} from '../lib/questionAnswer';
import {
  appendPracticeRecord,
  applyWrongBookCorrectStreak,
  clearWrongMasterProgress,
  getCompletedQuestionIds,
  getFavoriteIds,
  getPracticeAutoNextOnCorrect,
  getRevealAll,
  getWrongIds,
  setFavoriteIds,
  setWrongIds,
} from '../storage/appStorage';

/** 与 flushAtIndex 一致：未选/多选未选有效项视为跳过 */
function isPracticeSkippedUnanswered(question: Question, answer: string | null): boolean {
  const qt = normalizeQuestionType(question);
  const emptyMulti =
    qt === 'multi' && (answer == null || normalizeMultiAnswer(answer) === '');
  return answer == null || emptyMulti;
}

export function PracticeQuiz() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { questions?: Question[]; initialIndex?: number };
  };
  const questions = state?.questions ?? [];
  const initialIndexRaw = state?.initialIndex ?? 0;
  const bankKey = useMemo(() => questions.map((x) => x.id).join(','), [questions]);

  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(() =>
    questions.length === 0
      ? 0
      : Math.min(Math.max(0, initialIndexRaw), questions.length - 1)
  );
  const [answers, setAnswers] = useState<(string | null)[]>(() =>
    questions.map(() => null)
  );
  const [revealed, setRevealed] = useState<boolean[]>(() => questions.map(() => false));
  const [multiSubmitted, setMultiSubmitted] = useState<boolean[]>(() =>
    questions.map(() => false)
  );
  const [, setRevealTick] = useState(0);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const writtenForIndexRef = useRef<Set<number>>(new Set());
  const [autoNext, setAutoNext] = useState(getPracticeAutoNextOnCorrect);
  const [favTick, setFavTick] = useState(0);
  const [recTick, setRecTick] = useState(0);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const swipeHandlersRef = useRef({ prev: () => {}, next: () => {} });

  useEffect(() => {
    const fn = () => setRevealTick((t) => t + 1);
    window.addEventListener('app-reveal-changed', fn);
    return () => window.removeEventListener('app-reveal-changed', fn);
  }, []);

  useEffect(() => {
    const start =
      questions.length === 0
        ? 0
        : Math.min(Math.max(0, initialIndexRaw), questions.length - 1);
    setIdx(start);
    setAnswers(questions.map(() => null));
    setRevealed(questions.map(() => false));
    setMultiSubmitted(questions.map(() => false));
    writtenForIndexRef.current = new Set();
  }, [bankKey, initialIndexRaw, questions]);

  useEffect(() => {
    const fn = () => setRecTick((t) => t + 1);
    window.addEventListener('app-data-updated', fn);
    return () => window.removeEventListener('app-data-updated', fn);
  }, []);

  useEffect(() => {
    const fn = () => setAutoNext(getPracticeAutoNextOnCorrect());
    window.addEventListener('app-practice-auto-changed', fn);
    return () => window.removeEventListener('app-practice-auto-changed', fn);
  }, []);

  useEffect(() => {
    if (questions.length === 0) {
      navigate('/practice', { replace: true });
      return;
    }
    const t = requestAnimationFrame(() => setLoading(false));
    return () => cancelAnimationFrame(t);
  }, [questions.length, navigate]);

  const q = questions[idx] ?? null;
  const total = questions.length;

  const choice = answers[idx] ?? null;

  const completedIds = useMemo(() => getCompletedQuestionIds(), [recTick]);
  const progressDone = q ? completedIds.has(q.id) : false;

  const favIds = useMemo(() => new Set(getFavoriteIds()), [favTick, q?.id]);
  const toggleFav = () => {
    if (!q) return;
    const set = new Set(getFavoriteIds());
    if (set.has(q.id)) set.delete(q.id);
    else set.add(q.id);
    setFavoriteIds([...set]);
    window.dispatchEvent(new CustomEvent('app-storage-cleared'));
    setFavTick((t) => t + 1);
  };

  const markRevealed = (i: number) => {
    setRevealed((r) => {
      if (r[i]) return r;
      const n = [...r];
      n[i] = true;
      return n;
    });
  };

  const onChoose = (label: string) => {
    if (!q) return;
    const qt = normalizeQuestionType(q);
    if (qt === 'multi') {
      setAnswers((prev) => {
        const cur = prev[idx] ?? '';
        const set = new Set(
          cur
            .split(/[,，]+/)
            .map((x) => x.trim().toUpperCase())
            .filter((x) => /^[A-D]$/.test(x))
        );
        const L = label.trim().toUpperCase();
        if (set.has(L)) set.delete(L);
        else set.add(L);
        const joined = [...set].sort().join(',');
        const next = [...prev];
        next[idx] = joined.length ? joined : null;
        return next;
      });
      return;
    }
    setAnswers((prev) => {
      if (prev[idx] !== null) return prev;
      const next = [...prev];
      next[idx] = label;
      return next;
    });
  };

  const flushAtIndex = (i: number) => {
    if (writtenForIndexRef.current.has(i)) return;
    const cur = questions[i];
    if (!cur) return;
    writtenForIndexRef.current.add(i);
    const wrongIdsBefore = getWrongIds();
    const ans = answersRef.current[i];
    if (isPracticeSkippedUnanswered(cur, ans)) {
      appendPracticeRecord({
        questionId: cur.id,
        correct: false,
        userChoice: '(跳过)',
        at: Date.now(),
      });
      clearWrongMasterProgress(cur.id);
      const w = new Set(getWrongIds());
      w.add(cur.id);
      setWrongIds([...w]);
      return;
    }
    const answered = ans as string;
    const ok = isAnswerCorrect(cur, answered);
    appendPracticeRecord({
      questionId: cur.id,
      correct: ok,
      userChoice: answered,
      at: Date.now(),
    });
    if (!ok) {
      clearWrongMasterProgress(cur.id);
      const w = new Set(getWrongIds());
      w.add(cur.id);
      setWrongIds([...w]);
    } else if (wrongIdsBefore.includes(cur.id)) {
      applyWrongBookCorrectStreak(cur.id);
    }
  };

  const revealAllGlobal = getRevealAll();

  const prev = () => {
    if (idx <= 0) return;
    const curQ = questions[idx];
    if (curQ) {
      const qt = normalizeQuestionType(curQ);
      const curChoice = answersRef.current[idx] ?? null;
      const leaveRevealed =
        getRevealAll() ||
        (qt === 'multi'
          ? multiSubmitted[idx] &&
            !isPracticeSkippedUnanswered(curQ, curChoice)
          : curChoice !== null);
      if (leaveRevealed) markRevealed(idx);
    }
    const target = idx - 1;
    if (answers[target] == null) {
      writtenForIndexRef.current.delete(target);
      setRevealed((r) => {
        if (!r[target]) return r;
        const n = [...r];
        n[target] = false;
        return n;
      });
      setMultiSubmitted((m) => {
        if (!m[target]) return m;
        const n = [...m];
        n[target] = false;
        return n;
      });
    }
    setIdx(target);
  };

  const next = () => {
    if (q && normalizeQuestionType(q) === 'multi' && !multiSubmitted[idx] && !revealAllGlobal) {
      return;
    }
    const skipped = q
      ? isPracticeSkippedUnanswered(q, answersRef.current[idx] ?? null)
      : true;
    flushAtIndex(idx);
    if (!skipped) markRevealed(idx);
    else {
      setMultiSubmitted((m) => {
        if (!m[idx]) return m;
        const n = [...m];
        n[idx] = false;
        return n;
      });
    }
    if (idx + 1 >= total) {
      navigate('/practice');
      return;
    }
    setIdx((i) => i + 1);
  };

  useEffect(() => {
    if (!q || choice == null || !autoNext) return;
    if (normalizeQuestionType(q) === 'multi') return;
    if (!isAnswerCorrect(q, choice)) return;
    const thisIdx = idx;
    const tid = window.setTimeout(() => {
      if (writtenForIndexRef.current.has(thisIdx)) return;
      flushAtIndex(thisIdx);
      markRevealed(thisIdx);
      if (thisIdx + 1 >= total) {
        navigate('/practice');
        return;
      }
      setIdx(thisIdx + 1);
    }, 380);
    return () => clearTimeout(tid);
  }, [q?.id, choice, autoNext, idx, total, navigate]);

  swipeHandlersRef.current = { prev, next };
  useSwipePrevNext(swipeAreaRef, swipeHandlersRef, loading || !q ? 0 : 1);

  if (loading || !q) {
    return <p className="loading-banner">载入本题组</p>;
  }

  const qt = normalizeQuestionType(q);
  const answerRevealed =
    revealAllGlobal ||
    revealed[idx] ||
    (qt === 'multi'
      ? multiSubmitted[idx] && !isPracticeSkippedUnanswered(q, choice)
      : choice !== null);

  const multiNextBlocked =
    qt === 'multi' && !multiSubmitted[idx] && !revealAllGlobal;

  return (
    <div className="quiz-page">
      <p className="progress-text">
        {idx + 1}/{total} （{questionTypeLabel(qt)}）
        {progressDone && (
          <span className="q-done-mark" aria-label="本题已完成">
            {' '}
            （已完成）
          </span>
        )}
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
        <div className="quiz-toolbar-left">
          <button type="button" className="secondary-btn quiz-toolbar-btn" onClick={toggleFav}>
            {favIds.has(q.id) ? '已收藏' : '收藏本题'}
          </button>
        </div>
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
          <p className="swipe-hint muted quiz-swipe-hint">在题目框内左右滑切换题目</p>
        </div>
      </div>
    </div>
  );
}
