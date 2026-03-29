import type { PracticeRecord, ExamSession } from '../types/models';

const PREFIX = 'exam_web:';

const STORAGE_KEYS = {
  wrongIds: `${PREFIX}wrong_ids`,
  wrongMasterProgress: `${PREFIX}wrong_master_progress`,
  favoriteIds: `${PREFIX}favorite_ids`,
  practiceRecords: `${PREFIX}practice_records`,
  examSessions: `${PREFIX}exam_sessions`,
  revealAll: `${PREFIX}reveal_all`,
  practiceAutoNextOnCorrect: `${PREFIX}practice_auto_next`,
  customBankJson: `${PREFIX}custom_bank_json`,
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** 同标签页内通知各页面刷新（localStorage 的 storage 事件仅在其它标签页触发） */
export function notifyAppDataUpdated() {
  window.dispatchEvent(new CustomEvent('app-data-updated'));
}

export function getWrongIds(): number[] {
  return readJson<number[]>(STORAGE_KEYS.wrongIds, []);
}

export function setWrongIds(ids: number[]) {
  writeJson(STORAGE_KEYS.wrongIds, ids);
  notifyAppDataUpdated();
}

/** 错题本内题目连续答对次数（达 2 次自动移出错题本）；答错或跳过会清零 */
export function getWrongMasterProgress(): Record<string, number> {
  return readJson<Record<string, number>>(STORAGE_KEYS.wrongMasterProgress, {});
}

export function clearWrongMasterProgress(questionId: number) {
  const m = { ...getWrongMasterProgress() };
  const k = String(questionId);
  if (!(k in m)) return;
  delete m[k];
  writeJson(STORAGE_KEYS.wrongMasterProgress, m);
  notifyAppDataUpdated();
}

/** 练习模式下本题已在错题本中且本次判定为答对时调用 */
export function applyWrongBookCorrectStreak(questionId: number) {
  const k = String(questionId);
  const m = { ...getWrongMasterProgress() };
  const n = (m[k] ?? 0) + 1;
  if (n >= 2) {
    delete m[k];
    writeJson(STORAGE_KEYS.wrongMasterProgress, m);
    setWrongIds(getWrongIds().filter((id) => id !== questionId));
  } else {
    m[k] = n;
    writeJson(STORAGE_KEYS.wrongMasterProgress, m);
    notifyAppDataUpdated();
  }
}

export function getFavoriteIds(): number[] {
  return readJson<number[]>(STORAGE_KEYS.favoriteIds, []);
}

export function setFavoriteIds(ids: number[]) {
  writeJson(STORAGE_KEYS.favoriteIds, ids);
  notifyAppDataUpdated();
}

export function getPracticeRecords(): PracticeRecord[] {
  return readJson<PracticeRecord[]>(STORAGE_KEYS.practiceRecords, []);
}

/** 至少有一条练习记录（含跳过）的题目 id，用于「已完成」展示 */
export function getCompletedQuestionIds(): Set<number> {
  const set = new Set<number>();
  for (const r of getPracticeRecords()) {
    set.add(r.questionId);
  }
  return set;
}

export function appendPracticeRecord(r: PracticeRecord) {
  const all = getPracticeRecords();
  all.push(r);
  writeJson(STORAGE_KEYS.practiceRecords, all);
  notifyAppDataUpdated();
}

export function getExamSessions(): ExamSession[] {
  return readJson<ExamSession[]>(STORAGE_KEYS.examSessions, []);
}

export function appendExamSession(s: ExamSession) {
  const all = getExamSessions();
  all.push(s);
  writeJson(STORAGE_KEYS.examSessions, all);
  notifyAppDataUpdated();
}

export function getRevealAll(): boolean {
  return readJson<boolean>(STORAGE_KEYS.revealAll, false);
}

export function setRevealAll(v: boolean) {
  writeJson(STORAGE_KEYS.revealAll, v);
}

/** 练习模式：选对后是否自动进入下一题 */
export function getPracticeAutoNextOnCorrect(): boolean {
  return readJson<boolean>(STORAGE_KEYS.practiceAutoNextOnCorrect, false);
}

export function setPracticeAutoNextOnCorrect(v: boolean) {
  writeJson(STORAGE_KEYS.practiceAutoNextOnCorrect, v);
  window.dispatchEvent(new CustomEvent('app-practice-auto-changed'));
}

export function getCustomBankJson(): string | null {
  return localStorage.getItem(STORAGE_KEYS.customBankJson);
}

export function setCustomBankJson(json: string | null) {
  if (json == null) localStorage.removeItem(STORAGE_KEYS.customBankJson);
  else localStorage.setItem(STORAGE_KEYS.customBankJson, json);
}

/** 清空练习记录、错题、收藏、考试记录、显隐答案；保留自定义题库 JSON（若用户曾导入）。 */
export function clearAllUserData() {
  localStorage.removeItem(STORAGE_KEYS.wrongIds);
  localStorage.removeItem(STORAGE_KEYS.wrongMasterProgress);
  localStorage.removeItem(STORAGE_KEYS.favoriteIds);
  localStorage.removeItem(STORAGE_KEYS.practiceRecords);
  localStorage.removeItem(STORAGE_KEYS.examSessions);
  localStorage.removeItem(STORAGE_KEYS.revealAll);
}

/** 连自定义题库一并移除，回到仅内置 bank.json。 */
export function clearIncludingCustomBank() {
  clearAllUserData();
  localStorage.removeItem(STORAGE_KEYS.customBankJson);
}

