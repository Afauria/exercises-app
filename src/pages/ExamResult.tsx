import { useLocation, useNavigate } from 'react-router-dom';

export function ExamResult() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { total?: number; correct?: number };
  };
  const total = state?.total ?? 0;
  const correct = state?.correct ?? 0;

  if (total === 0) {
    return (
      <div>
        <p className="muted">无考试结果</p>
        <button type="button" className="primary-btn" onClick={() => navigate('/exam')}>
          返回
        </button>
      </div>
    );
  }

  const pct = Math.round((correct / total) * 100);

  return (
    <div className="result-page">
      <h2>考试结束</h2>
      <p className="result-big">
        {correct} / {total} 正确（{pct}%）
      </p>
      <button type="button" className="primary-btn wide" onClick={() => navigate('/exam')}>
        再考一场
      </button>
    </div>
  );
}
