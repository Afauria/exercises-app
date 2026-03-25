import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuestions } from '../context/BankContext';
import { getExamSessions, getPracticeRecords } from '../storage/appStorage';

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function Stats() {
  const all = useQuestions();
  const [tick, setTick] = useState(0);
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

  const records = useMemo(() => getPracticeRecords(), [tick]);
  const exams = useMemo(() => getExamSessions(), [tick]);

  const practiceStats = useMemo(() => {
    const total = records.length;
    const correct = records.filter((r) => r.correct).length;
    const rate = total === 0 ? 0 : Math.round((correct / total) * 100);
    return { total, correct, rate };
  }, [records]);

  const last30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const map = new Map<string, number>();
    for (const r of records) {
      if (r.at < cutoff) continue;
      const k = dayKey(r.at);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [records]);

  return (
    <div className="stats-page">
      <section className="stat-card">
        <h2>练习正确率</h2>
        <p className="stat-big">{practiceStats.rate}%</p>
        <p className="muted">
          {practiceStats.correct} / {practiceStats.total} 题有记录
        </p>
      </section>

      <section className="stat-card">
        <h2>题库总量</h2>
        <p className="stat-big">{all.length}</p>
      </section>

      <section className="stat-card">
        <h2>近 30 日节奏</h2>
        {last30.length === 0 ? (
          <p className="muted">暂无练习记录</p>
        ) : (
          <ul className="rhythm-list">
            {last30.map(([day, n]) => (
              <li key={day}>
                {day} — {n} 次作答
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stat-card">
        <h2>考试记录</h2>
        {exams.length === 0 ? (
          <p className="muted">尚无考试场次</p>
        ) : (
          <ul className="rhythm-list">
            {exams
              .slice()
              .reverse()
              .slice(0, 20)
              .map((e) => (
                <li key={e.sessionId}>
                  {new Date(e.endedAt).toLocaleString()} — {e.correct}/{e.total}，用时{' '}
                  {e.durationSec}s
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
