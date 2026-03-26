import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BankDocument, Question } from '../types/models';
import { normalizeBankQuestions } from '../lib/questionAnswer';
import { getCustomBankJson, setCustomBankJson } from '../storage/appStorage';
import { parseQuestionBank } from '../parsers/questionBankParser';

function normalizeDoc(doc: BankDocument): BankDocument {
  return {
    ...doc,
    questions: normalizeBankQuestions(doc.questions),
  };
}

type BankState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; doc: BankDocument };

const BankCtx = createContext<{
  state: BankState;
  reload: () => void;
  applyImportedDoc: (doc: BankDocument) => void;
  importFromTxt: (text: string) => { ok: boolean; message: string };
} | null>(null);

function builtinBankFetchUrl(): string {
  const base = import.meta.env.BASE_URL;
  const path = base.endsWith('/') ? `${base}bank.json` : `${base}/bank.json`;
  const stamp = import.meta.env.VITE_BANK_STAMP;
  if (!stamp) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}v=${encodeURIComponent(stamp)}`;
}

async function fetchBuiltin(): Promise<BankDocument> {
  const res = await fetch(builtinBankFetchUrl(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`无法加载题库：HTTP ${res.status}`);
  return res.json() as Promise<BankDocument>;
}

function parseDocFromTxt(text: string): { doc: BankDocument | null; message: string } {
  const { questions, errors } = parseQuestionBank(text);
  if (questions.length === 0) {
    return { doc: null, message: `解析失败：有效题目 0。${errors.slice(0, 3).join('；')}` };
  }
  const out = questions.map((q, i) => ({
    id: i + 1,
    ordinal: q.ordinal,
    stem: q.stem,
    qtype: q.type,
    answer: q.answer,
    explanation: q.explanation || null,
    options: q.type === 'boolean' ? null : q.options,
  }));
  const doc: BankDocument = {
    bankName: '导入题库',
    questions: out,
    parseErrors: errors,
  };
  return { doc, message: `导入完成：${out.length} 题` };
}

export function BankProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BankState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const custom = getCustomBankJson();
      if (custom) {
        const doc = normalizeDoc(JSON.parse(custom) as BankDocument);
        setState({ status: 'ready', doc });
        return;
      }
      const doc = normalizeDoc(await fetchBuiltin());
      setState({ status: 'ready', doc });
    } catch (e) {
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyImportedDoc = useCallback((doc: BankDocument) => {
    const normalized = normalizeDoc(doc);
    setCustomBankJson(JSON.stringify(normalized));
    setState({ status: 'ready', doc: normalized });
  }, []);

  const importFromTxt = useCallback(
    (text: string) => {
      const { doc, message } = parseDocFromTxt(text);
      if (!doc) return { ok: false, message };
      applyImportedDoc(doc);
      return { ok: true, message };
    },
    [applyImportedDoc]
  );

  const value = useMemo(
    () => ({
      state,
      reload: load,
      applyImportedDoc,
      importFromTxt,
    }),
    [state, load, applyImportedDoc, importFromTxt]
  );

  return <BankCtx.Provider value={value}>{children}</BankCtx.Provider>;
}

export function useBank() {
  const v = useContext(BankCtx);
  if (!v) throw new Error('useBank outside BankProvider');
  return v;
}

export function useQuestions(): Question[] {
  const { state } = useBank();
  if (state.status !== 'ready') return [];
  return state.doc.questions;
}
