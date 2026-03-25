import type { PracticeRecord, ExamSession } from '../types/models';

const PREFIX = 'exam_web:';

const STORAGE_KEYS = {
  wrongIds: `${PREFIX}wrong_ids`,
  favoriteIds: `${PREFIX}favorite_ids`,
  practiceRecords: `${PREFIX}practice_records`,
  examSessions: `${PREFIX}exam_sessions`,
  revealAll: `${PREFIX}reveal_all`,
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

