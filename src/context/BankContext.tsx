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
import { getCustomBankJson, setCustomBankJson } from '../storage/appStorage';
import { parseQuestionBank } from '../parsers/questionBankParser';

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

async function fetchBuiltin(): Promise<BankDocument> {
  const res = await fetch('/bank.json');
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
    options: q.type === 'choice' ? q.options : null,
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
        const doc = JSON.parse(custom) as BankDocument;
        setState({ status: 'ready', doc });
        return;
      }
      const doc = await fetchBuiltin();
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
    setCustomBankJson(JSON.stringify(doc));
    setState({ status: 'ready', doc });
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
