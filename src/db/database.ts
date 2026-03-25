import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

/**
 * expo-sqlite Web 持久化使用 OPFS（navigator.storage.getDirectory）。
 * 多数手机浏览器（尤其 iOS Safari）未实现，会报 undefined is not an object (evaluating 'navigator.storage.getDirectory')。
 * 此时改用内存库，应用可用但刷新后数据清空。
 */
function webStorageHasOpfs(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof navigator === 'undefined') return false;
  const sm = navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
  return typeof sm?.getDirectory === 'function';
}

/** Web 且浏览器无 OPFS：使用 :memory:，避免打开库时崩溃 */
export const webDatabaseIsEphemeral =
  Platform.OS === 'web' && !webStorageHasOpfs();

const DATABASE_PATH = webDatabaseIsEphemeral ? ':memory:' : 'quiz_exam.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
/** 合并并发 getDatabase()，避免 Web OPFS 上对同一库创建多个 SyncAccessHandle 而失败。 */
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/* 勿对 Web DB 做 Proxy 串行：expo-sqlite 的 runAsync/getAllAsync 内部会再调 prepareAsync，
 * 若嵌套调用也进全局队列会排在当前 runAsync 完成之后 → 死锁，表现为题库永不加载、listLoaded 永不 true。 */

/** Web 上 wa-sqlite + OPFS VFS 对 WAL 的 xFileControl 支持不完整，会报 xFileControl undefined。 */
const JOURNAL_MODE = Platform.OS === 'web' ? 'DELETE' : 'WAL';

const MIGRATION = `
PRAGMA journal_mode = ${JOURNAL_MODE};

CREATE TABLE IF NOT EXISTS banks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  imported_at INTEGER NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  stem TEXT NOT NULL,
  qtype TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  options_json TEXT,
  UNIQUE (bank_id, ordinal)
);

CREATE TABLE IF NOT EXISTS practice_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  answered_at INTEGER NOT NULL,
  user_choice TEXT
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  bank_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_sec INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  user_choice TEXT,
  correct INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  question_id INTEGER PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wrong_questions (
  question_id INTEGER PRIMARY KEY NOT NULL,
  wrong_count INTEGER NOT NULL DEFAULT 1,
  last_wrong_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_ordinal ON questions(ordinal);
CREATE INDEX IF NOT EXISTS idx_questions_stem ON questions(stem);
CREATE INDEX IF NOT EXISTS idx_practice_time ON practice_records(answered_at);
CREATE INDEX IF NOT EXISTS idx_exam_ended ON exam_sessions(ended_at);
`;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (!opening) {
    opening = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_PATH);
      try {
        await db.execAsync(MIGRATION);
      } catch (e) {
        try {
          await db.closeAsync();
        } catch {
          /* ignore */
        }
        throw e;
      }
      dbInstance = db;
      return db;
    })().finally(() => {
      opening = null;
    });
  }
  return opening;
}
