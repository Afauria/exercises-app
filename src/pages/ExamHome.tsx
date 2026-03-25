import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../context/BankContext';
import { getSectionCount, questionsInSection } from '../lib/sectionConstants';

export function ExamHome() {
  const all = useQuestions();
  const navigate = useNavigate();
  const sections = getSectionCount(all);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(20);

  const pool = useMemo(
    () => questionsInSection(all, sectionIndex),
    [all, sectionIndex]
  );

  const start = () => {
    const n = Math.min(Math.max(1, questionCount), pool.length || 1);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    if (shuffled.length === 0) {
      window.alert('本节暂无题目');
      return;
    }
    navigate('/exam/quiz', {
      state: {
        questions: shuffled,
        durationMinutes: Math.max(1, durationMinutes),
      },
    });
  };

  return (
    <div className="exam-home">
      <section className="exam-block">
        <h2>1. 选择一节</h2>
        <select
          className="select-input"
          value={sectionIndex}
          onChange={(e) => setSectionIndex(Number(e.target.value))}
          disabled={sections === 0}
        >
          {Array.from({ length: sections }, (_, i) => (
            <option key={i} value={i}>
              第 {i + 1} 节
            </option>
          ))}
        </select>
      </section>
      <section className="exam-block">
        <h2>2. 本场设置</h2>
        <label className="field">
          时长（分钟）
          <input
            type="number"
            min={1}
            max={240}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </label>
        <label className="field">
          题量
          <input
            type="number"
            min={1}
            max={500}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
          />
        </label>
        <p className="muted">本节可用 {pool.length} 题</p>
      </section>
      <button type="button" className="primary-btn wide" onClick={start}>
        进入考试
      </button>
    </div>
  );
}
