import type { ExamResult, ImportReport, Question } from '../types/models';
import type { ParsedQuestion } from '../parsers/questionBankParser';
import { getDatabase } from './database';

function mapQuestion(row: {
  id: number;
  bank_id: string;
  ordinal: number;
  stem: string;
  qtype: string;
  answer: string;
  explanation: string | null;
  options_json: string | null;
}): Question {
  return {
    id: row.id,
    bankId: row.bank_id,
    ordinal: row.ordinal,
    stem: row.stem,
    qtype: row.qtype as Question['qtype'],
    answer: row.answer,
    explanation: row.explanation,
    options: row.options_json ? JSON.parse(row.options_json) : null,
  };
}

export async function listBanks(): Promise<
  { id: string; name: string; questionCount: number; importedAt: number }[]
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    question_count: number;
    imported_at: number;
  }>('SELECT id, name, question_count, imported_at FROM banks ORDER BY imported_at DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    questionCount: r.question_count,
    importedAt: r.imported_at,
  }));
}

export async function getDefaultBankId(): Promise<string | null> {
  const banks = await listBanks();
  return banks[0]?.id ?? null;
}

export async function importQuestionBank(
  name: string,
  parsed: ParsedQuestion[],
  replaceBankId?: string
): Promise<ImportReport> {
  const db = await getDatabase();
  const bankId = replaceBankId ?? `bank_${Date.now()}`;
  const errors: string[] = [];
  let failed = 0;

  const upsertBank = async () => {
    if (!replaceBankId) {
      await db.runAsync(
        'INSERT INTO banks (id, name, imported_at, question_count) VALUES (?, ?, ?, ?)',
        [bankId, name, Date.now(), parsed.length]
      );
    } else {
      await db.runAsync('DELETE FROM questions WHERE bank_id = ?', [bankId]);
      await db.runAsync(
        'UPDATE banks SET name = ?, imported_at = ?, question_count = ? WHERE id = ?',
        [name, Date.now(), parsed.length, bankId]
      );
    }
  };

  /** 不用 withTransactionAsync：Web(wa-sqlite) 上 COMMIT/ROLLBACK 易触发 “no transaction is active”；逐条自动提交更稳 */
  const insertQuestions = async () => {
    const seenOrdinal = new Set<number>();
    let insertedBatch = 0;
    for (const q of parsed) {
      if (seenOrdinal.has(q.ordinal)) {
        failed += 1;
        errors.push(`题号 ${q.ordinal} 重复，已跳过（保持原题号不重排）`);
        continue;
      }
      seenOrdinal.add(q.ordinal);
      const optionsJson =
        q.type === 'choice' ? JSON.stringify(q.options) : null;
      try {
        await db.runAsync(
          `INSERT INTO questions (bank_id, ordinal, stem, qtype, answer, explanation, options_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            bankId,
            q.ordinal,
            q.stem,
            q.type,
            q.answer,
            q.explanation || null,
            optionsJson,
          ]
        );
        insertedBatch += 1;
        if (insertedBatch % 120 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      } catch (e) {
        failed += 1;
        errors.push(`题号 ${q.ordinal} 写入失败: ${String(e)}`);
      }
    }
  };

  await upsertBank();
  await insertQuestions();

  return {
    bankId,
    bankName: name,
    parsed: parsed.length - failed,
    failed,
    errors,
  };
}

export async function getQuestionCount(bankId: string | null): Promise<number> {
  const db = await getDatabase();
  if (!bankId) {
    const r = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) as c FROM questions'
    );
    return r?.c ?? 0;
  }
  const r = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM questions WHERE bank_id = ?',
    [bankId]
  );
  return r?.c ?? 0;
}

export async function getQuestionsSequential(
  bankId: string,
  offset: number,
  limit: number
): Promise<Question[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    bank_id: string;
    ordinal: number;
    stem: string;
    qtype: string;
    answer: string;
    explanation: string | null;
    options_json: string | null;
  }>(
    'SELECT * FROM questions WHERE bank_id = ? ORDER BY ordinal ASC LIMIT ? OFFSET ?',
    [bankId, limit, offset]
  );
  return rows.map(mapQuestion);
}

export async function searchQuestions(
  bankId: string,
  query: string,
  limit = 100,
  offset = 0
): Promise<Question[]> {
  const db = await getDatabase();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const numberPart = Number(trimmed);
  const isNumeric = Number.isFinite(numberPart) && /^\d+$/.test(trimmed);

  const rows = isNumeric
    ? await db.getAllAsync<{
        id: number;
        bank_id: string;
        ordinal: number;
        stem: string;
        qtype: string;
        answer: string;
        explanation: string | null;
        options_json: string | null;
      }>(
        `SELECT * FROM questions
         WHERE bank_id = ?
           AND (ordinal = ? OR CAST(ordinal AS TEXT) LIKE ?)
         ORDER BY ABS(ordinal - ?) ASC, ordinal ASC
         LIMIT ? OFFSET ?`,
        [bankId, numberPart, `${trimmed}%`, numberPart, limit, offset]
      )
    : await db.getAllAsync<{
        id: number;
        bank_id: string;
        ordinal: number;
        stem: string;
        qtype: string;
        answer: string;
        explanation: string | null;
        options_json: string | null;
      }>(
        `SELECT * FROM questions
         WHERE bank_id = ?
           AND stem LIKE ?
         ORDER BY ordinal ASC
         LIMIT ? OFFSET ?`,
        [bankId, `%${trimmed}%`, limit, offset]
      );

  return rows.map(mapQuestion);
}

export async function getQuestionsByIds(ids: number[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<{
    id: number;
    bank_id: string;
    ordinal: number;
    stem: string;
    qtype: string;
    answer: string;
    explanation: string | null;
    options_json: string | null;
  }>(
    `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY ordinal ASC`,
    ids
  );
  return rows.map(mapQuestion);
}

export async function getRandomQuestionIds(
  bankId: string,
  count: number
): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM questions WHERE bank_id = ? ORDER BY RANDOM() LIMIT ?',
    [bankId, count]
  );
  return rows.map((r) => r.id);
}

export async function recordPractice(
  questionId: number,
  correct: boolean,
  userChoice: string | null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO practice_records (question_id, correct, answered_at, user_choice) VALUES (?, ?, ?, ?)',
    [questionId, correct ? 1 : 0, Date.now(), userChoice]
  );
}

export async function addWrong(questionId: number): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO wrong_questions (question_id, wrong_count, last_wrong_at)
     VALUES (?, 1, ?)
     ON CONFLICT(question_id) DO UPDATE SET
       wrong_count = wrong_count + 1,
       last_wrong_at = excluded.last_wrong_at`,
    [questionId, now]
  );
}

export async function removeWrong(questionId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wrong_questions WHERE question_id = ?', [
    questionId,
  ]);
}

export async function listWrongQuestionIds(): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ question_id: number }>(
    'SELECT question_id FROM wrong_questions ORDER BY last_wrong_at DESC'
  );
  return rows.map((r) => r.question_id);
}

export async function toggleFavorite(questionId: number): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ question_id: number }>(
    'SELECT question_id FROM favorites WHERE question_id = ?',
    [questionId]
  );
  if (row) {
    await db.runAsync('DELETE FROM favorites WHERE question_id = ?', [
      questionId,
    ]);
    return false;
  }
  await db.runAsync(
    'INSERT INTO favorites (question_id, created_at) VALUES (?, ?)',
    [questionId, Date.now()]
  );
  return true;
}

export async function isFavorite(questionId: number): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ question_id: number }>(
    'SELECT question_id FROM favorites WHERE question_id = ?',
    [questionId]
  );
  return !!row;
}

export async function listFavoriteIds(): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ question_id: number }>(
    'SELECT question_id FROM favorites ORDER BY created_at DESC'
  );
  return rows.map((r) => r.question_id);
}

export async function createExamSession(
  sessionId: string,
  bankId: string | null,
  startedAt: number,
  endedAt: number,
  durationSec: number,
  questionCount: number,
  correctCount: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO exam_sessions (id, bank_id, started_at, ended_at, duration_sec, question_count, correct_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      bankId,
      startedAt,
      endedAt,
      durationSec,
      questionCount,
      correctCount,
    ]
  );
}

export async function insertExamAnswer(
  sessionId: string,
  questionId: number,
  userChoice: string | null,
  correct: boolean
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO exam_answers (session_id, question_id, user_choice, correct) VALUES (?, ?, ?, ?)',
    [sessionId, questionId, userChoice, correct ? 1 : 0]
  );
}

export async function getExamSessions(limit = 30): Promise<ExamResult[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    question_count: number;
    correct_count: number;
    duration_sec: number;
    ended_at: number;
  }>(
    'SELECT id, question_count, correct_count, duration_sec, ended_at FROM exam_sessions ORDER BY ended_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((r) => ({
    sessionId: r.id,
    total: r.question_count,
    correct: r.correct_count,
    durationSec: r.duration_sec,
    endedAt: r.ended_at,
  }));
}

export async function getPracticeStats(): Promise<{
  totalAttempts: number;
  correctAttempts: number;
  practicedQuestions: number;
}> {
  const db = await getDatabase();
  const total = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM practice_records'
  );
  const correct = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM practice_records WHERE correct = 1'
  );
  const distinct = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(DISTINCT question_id) as c FROM practice_records'
  );
  return {
    totalAttempts: total?.c ?? 0,
    correctAttempts: correct?.c ?? 0,
    practicedQuestions: distinct?.c ?? 0,
  };
}

export async function getPracticeStatsLastDays(
  days: number
): Promise<{ day: string; attempts: number; correct: number }[]> {
  const db = await getDatabase();
  const since = Date.now() - days * 86400000;
  const rows = await db.getAllAsync<{
    answered_at: number;
    correct: number;
  }>(
    'SELECT answered_at, correct FROM practice_records WHERE answered_at >= ?',
    [since]
  );
  const map = new Map<string, { attempts: number; correct: number }>();
  for (const r of rows) {
    const d = new Date(r.answered_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cur = map.get(key) ?? { attempts: 0, correct: 0 };
    cur.attempts += 1;
    if (r.correct) cur.correct += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }));
}

export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM exam_answers;
    DELETE FROM exam_sessions;
    DELETE FROM practice_records;
    DELETE FROM favorites;
    DELETE FROM wrong_questions;
    DELETE FROM questions;
    DELETE FROM banks;
  `);
}
