import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../context/BankContext';
import type { Question } from '../types/models';
import {
  getFavoriteIds,
  getWrongIds,
  setFavoriteIds,
  setWrongIds,
} from '../storage/appStorage';

export function WrongBook() {
  const all = useQuestions();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const on = () => bump();
    window.addEventListener('app-storage-cleared', on);
    window.addEventListener('app-data-updated', on);
    return () => {
      window.removeEventListener('app-storage-cleared', on);
      window.removeEventListener('app-data-updated', on);
    };
  }, [bump]);

  const wrongIds = getWrongIds();
  const favIds = getFavoriteIds();

  const byId = useMemo(() => {
    const m = new Map<number, Question>();
    for (const q of all) m.set(q.id, q);
    return m;
  }, [all]);

  const wrongQs = wrongIds.map((id) => byId.get(id)).filter(Boolean) as Question[];
  const favQs = favIds.map((id) => byId.get(id)).filter(Boolean) as Question[];

  const removeWrong = (id: number) => {
    setWrongIds(wrongIds.filter((x) => x !== id));
    bump();
  };

  const toggleFav = (id: number) => {
    const set = new Set(favIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setFavoriteIds([...set]);
    bump();
  };

  const openOne = (q: Question) => {
    navigate('/practice/quiz', { state: { questions: [q] } });
  };

  return (
    <div className="wrong-page">
      <h2 className="subheading">需要巩固的题目</h2>
      {wrongQs.length === 0 ? (
        <p className="muted">错题本是空的</p>
      ) : (
        <ul className="card-list">
          {wrongQs.map((q) => (
            <li key={q.id} className="wrong-row">
              <button type="button" className="link-btn" onClick={() => openOne(q)}>
                第 {q.ordinal} 题 · {q.stem.slice(0, 36)}
                {q.stem.length > 36 ? '…' : ''}
              </button>
              <button type="button" className="small-btn" onClick={() => removeWrong(q.id)}>
                移除
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="subheading">收藏</h2>
      {favQs.length === 0 ? (
        <p className="muted">还没有收藏</p>
      ) : (
        <ul className="card-list">
          {favQs.map((q) => (
            <li key={q.id} className="wrong-row">
              <button type="button" className="link-btn" onClick={() => openOne(q)}>
                第 {q.ordinal} 题
              </button>
              <button type="button" className="small-btn" onClick={() => toggleFav(q.id)}>
                取消收藏
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
