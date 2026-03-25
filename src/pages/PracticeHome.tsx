import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBank, useQuestions } from '../context/BankContext';
import { getSectionCount, questionsInSection } from '../lib/sectionConstants';
import type { Question } from '../types/models';

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

  const sections = getSectionCount(all);
  const matches = useMemo(() => filterSearch(all, query), [all, query]);

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
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <h2 className="section-title">选择一节</h2>
          <div className="section-grid">
            {Array.from({ length: sections }, (_, i) => (
              <button
                key={i}
                type="button"
                className="section-tile"
                onClick={() =>
                  navigate('/practice/quiz', {
                    state: { questions: questionsInSection(all, i) },
                  })
                }
              >
                第 {i + 1} 节
              </button>
            ))}
          </div>
          <button
            type="button"
            className="primary-btn random-btn"
            disabled={sections === 0}
            onClick={() => {
              const idx = Math.floor(Math.random() * sections);
              navigate('/practice/quiz', {
                state: { questions: questionsInSection(all, idx) },
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
