import { useEffect, useMemo, useState } from 'react';
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
  const [choice, setChoice] = useState<string | null>(null);
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
    if (!q || choice !== null) return;
    setChoice(label);
    const ok = isCorrect(q, label);
    appendPracticeRecord({
      questionId: q.id,
      correct: ok,
      userChoice: label,
      at: Date.now(),
    });
    if (!ok) {
      const w = new Set(getWrongIds());
      w.add(q.id);
      setWrongIds([...w]);
    }
  };

  const next = () => {
    if (idx + 1 >= total) {
      navigate('/practice');
      return;
    }
    setIdx((i) => i + 1);
    setChoice(null);
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
          onClick={() => navigate('/practice')}
        >
          返回练习列表
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={choice === null}
          onClick={next}
        >
          下一题
        </button>
      </div>
    </div>
  );
}
