import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBank, useQuestions } from '../context/BankContext';
import {
  getSectionSlices,
  getSectionSlicesByType,
  isSectionFullyCompleted,
} from '../lib/sectionConstants';
import { questionTypeLabel } from '../lib/questionAnswer';
import type { Question } from '../types/models';
import { getCompletedQuestionIds } from '../storage/appStorage';

function filterSearch(all: Question[], q: string): Question[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return all.filter(
    (it) =>
      String(it.ordinal).includes(s) ||
      it.stem.toLowerCase().includes(s)
  );
}

export function PracticeHome() {
  const { state } = useBank();
  const all = useQuestions();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [recTick, setRecTick] = useState(0);

  useEffect(() => {
    const fn = () => setRecTick((t) => t + 1);
    window.addEventListener('app-data-updated', fn);
    window.addEventListener('app-storage-cleared', fn);
    return () => {
      window.removeEventListener('app-data-updated', fn);
      window.removeEventListener('app-storage-cleared', fn);
    };
  }, []);

  const slicesFlat = useMemo(() => getSectionSlices(all), [all]);
  const groups = useMemo(() => getSectionSlicesByType(all), [all]);
  const matches = useMemo(() => filterSearch(all, query), [all, query]);
  const completedIds = useMemo(() => getCompletedQuestionIds(), [recTick]);

  if (state.status === 'loading') {
    return <p className="muted">加载题库…</p>;
  }
  if (state.status === 'error') {
    return (
      <div>
        <p className="error-text">{state.message}</p>
        <p className="muted">可通过右上角菜单导入 TXT。</p>
      </div>
    );
  }

  const total = all.length;
  const line = `共 ${total} 题`;

  return (
    <div data-testid="practice-home-list-loaded">
      <p className="summary-line">{line}</p>
      <input
        className="search-input"
        placeholder="搜索题号或题干"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() ? (
        <div className="section-block">
          <h2 className="section-title">搜索结果</h2>
          {matches.length === 0 ? (
            <p className="muted">无匹配</p>
          ) : (
            <ul className="link-list">
              {matches.slice(0, 80).map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      navigate('/practice/quiz', { state: { questions: [q] } })
                    }
                  >
                    第 {q.ordinal} 题
                    {completedIds.has(q.id) && (
                      <span className="q-done-mark">（已完成）</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <h2 className="section-title">选择一节</h2>
          {groups.map(({ qtype, slices }) => (
            <div key={qtype} className="section-block">
              <h3 className="section-subtitle">{questionTypeLabel(qtype)}</h3>
              <div className="section-grid">
                {slices.map((slice) => {
                  const secDone = isSectionFullyCompleted(all, slice.sectionIndex, completedIds);
                  return (
                    <button
                      key={slice.sectionNumber}
                      type="button"
                      className={`section-tile${secDone ? ' section-tile--complete' : ''}`}
                      onClick={() =>
                        navigate('/practice/quiz', {
                          state: { questions: slice.questions },
                        })
                      }
                    >
                      第 {slice.sectionNumber} 节
                      {secDone && (
                        <span className="section-done-mark">（已完成）</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="primary-btn random-btn"
            disabled={slicesFlat.length === 0}
            onClick={() => {
              const ri = Math.floor(Math.random() * slicesFlat.length);
              const pick = slicesFlat[ri]!;
              navigate('/practice/quiz', {
                state: { questions: pick.questions },
              });
            }}
          >
            随机一节
          </button>
        </>
      )}
    </div>
  );
}
