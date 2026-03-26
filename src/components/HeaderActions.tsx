import { useEffect, useRef, useState } from 'react';
import { useBank } from '../context/BankContext';
import {
  clearAllUserData,
  clearIncludingCustomBank,
  getPracticeAutoNextOnCorrect,
  getRevealAll,
  setPracticeAutoNextOnCorrect,
  setRevealAll,
} from '../storage/appStorage';

export function HeaderActions() {
  const { reload, importFromTxt } = useBank();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reveal, setRevealState] = useState(getRevealAll);
  const [autoNext, setAutoNextState] = useState(getPracticeAutoNextOnCorrect);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRevealState(getRevealAll());
  }, [menuOpen]);

  useEffect(() => {
    const sync = () => setAutoNextState(getPracticeAutoNextOnCorrect());
    window.addEventListener('app-practice-auto-changed', sync);
    return () => window.removeEventListener('app-practice-auto-changed', sync);
  }, []);

  const toggleReveal = () => {
    const next = !getRevealAll();
    setRevealAll(next);
    setRevealState(next);
    window.dispatchEvent(new CustomEvent('app-reveal-changed'));
  };

  const toggleAutoNext = () => {
    const next = !getPracticeAutoNextOnCorrect();
    setPracticeAutoNextOnCorrect(next);
    setAutoNextState(next);
  };

  const onClearAll = () => {
    if (!window.confirm('确定清空全部练习记录、错题、收藏与考试记录？内置题库不受影响。')) return;
    clearAllUserData();
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent('app-storage-cleared'));
    window.alert('已清空本地数据');
  };

  const onImportBuiltin = () => {
    clearIncludingCustomBank();
    setMenuOpen(false);
    void reload();
    window.location.reload();
  };

  const onPickFile = () => fileRef.current?.click();

  const onFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const r = importFromTxt(text);
      window.alert(r.message);
      if (r.ok) setMenuOpen(false);
    };
    reader.readAsText(f, 'utf8');
  };

  return (
    <div className="header-actions">
      <button
        type="button"
        className="icon-btn"
        aria-label={reveal ? '隐藏全部题目答案' : '显示全部题目答案'}
        onClick={toggleReveal}
      >
        {reveal ? '👁' : '👁‍🗨'}
      </button>
      <button
        type="button"
        className={`icon-btn${autoNext ? ' icon-btn-active' : ''}`}
        aria-label={autoNext ? '答对自动下一题（已开启）' : '答对自动下一题（已关闭）'}
        aria-pressed={autoNext}
        onClick={toggleAutoNext}
        title={autoNext ? '答对自动下一题（已开）' : '答对自动下一题（已关）'}
      >
        自动
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="清空或导入题库"
        onClick={() => setMenuOpen(true)}
      >
        🗑
      </button>

      {menuOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setMenuOpen(false)}>
          <div
            className="modal-panel"
            role="dialog"
            aria-labelledby="data-menu-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="data-menu-title">数据与题库</h2>
            <button type="button" className="menu-item" onClick={onClearAll}>
              清空全部数据
            </button>
            <button type="button" className="menu-item" onClick={onImportBuiltin}>
              导入内置题库
            </button>
            <button type="button" className="menu-item" onClick={onPickFile}>
              导入本地 TXT
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              hidden
              onChange={onFile}
            />
            <button type="button" className="menu-close" onClick={() => setMenuOpen(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
