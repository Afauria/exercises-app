import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import type { Question } from '../types/models';
import {
  appendPracticeRecord,
  getFavoriteIds,
  getWrongIds,
  setFavoriteIds,
  setWrongIds,
} from '../storage/appStorage';

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

export function PracticeQuiz() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { questions?: Question[] };
  };
  const questions = state?.questions ?? [];
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() =>
    questions.map(() => null)
  );
  /** 本题在本轮中是否已写入练习记录（离开本题时写入） */
  const writtenForIndexRef = useRef<Set<number>>(new Set());
  const [favTick, setFavTick] = useState(0);

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

  const progress = useMemo(
    () => (q ? `${idx + 1} / ${total}` : ''),
    [idx, total, q]
  );

  const choice = answers[idx] ?? null;

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

  const onChoose = (label: string) => {
    if (!q) return;
    setAnswers((prev) => {
      if (prev[idx] !== null) return prev;
      const next = [...prev];
      next[idx] = label;
      return next;
    });
  };

  /** 离开下标 i 的题目时写入统计与错题（跳过记为错误并进入错题本） */
  const flushAtIndex = (i: number) => {
    if (writtenForIndexRef.current.has(i)) return;
    const cur = questions[i];
    if (!cur) return;
    writtenForIndexRef.current.add(i);
    const ans = answers[i];
    if (ans == null) {
      appendPracticeRecord({
        questionId: cur.id,
        correct: false,
        userChoice: '(跳过)',
        at: Date.now(),
      });
      const w = new Set(getWrongIds());
      w.add(cur.id);
      setWrongIds([...w]);
      return;
    }
    const ok = isCorrect(cur, ans);
    appendPracticeRecord({
      questionId: cur.id,
      correct: ok,
      userChoice: ans,
      at: Date.now(),
    });
    if (!ok) {
      const w = new Set(getWrongIds());
      w.add(cur.id);
      setWrongIds([...w]);
    }
  };

  const prev = () => {
    if (idx <= 0) return;
    const target = idx - 1;
    // 回到尚未选题的题目时，允许再次离开时再记一条（例如先跳过再返回补答）
    if (answers[target] == null) {
      writtenForIndexRef.current.delete(target);
    }
    setIdx(target);
  };

  const next = () => {
    flushAtIndex(idx);
    if (idx + 1 >= total) {
      navigate('/practice');
      return;
    }
    setIdx((i) => i + 1);
  };

  if (loading || !q) {
    return <p className="loading-banner">载入本题组</p>;
  }

  return (
    <div className="quiz-page">
      <p className="progress-text">{progress}</p>
      <QuestionCard question={q} userChoice={choice} onChoose={onChoose} />
      <div className="fav-row">
        <button type="button" className="small-btn" onClick={toggleFav}>
          {favIds.has(q.id) ? '已收藏' : '收藏本题'}
        </button>
      </div>
      <div className="quiz-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            flushAtIndex(idx);
            navigate('/practice');
          }}
        >
          返回练习列表
        </button>
        <button
          type="button"
          className="secondary-btn"
          disabled={idx === 0}
          onClick={prev}
        >
          上一题
        </button>
        <button type="button" className="primary-btn" onClick={next}>
          {idx + 1 >= total ? '完成' : '下一题'}
        </button>
      </div>
    </div>
  );
}
