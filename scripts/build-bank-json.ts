import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseQuestionBank } from '../src/parsers/questionBankParser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const txtPath = path.join(root, 'assets', 'bundled-question-bank.txt');
const outDir = path.join(root, 'public');
const outPath = path.join(outDir, 'bank.json');

const raw = fs.readFileSync(txtPath, 'utf8');
const { questions, errors } = parseQuestionBank(raw);

const out = questions.map((q, i) => ({
  id: i + 1,
  ordinal: q.ordinal,
  stem: q.stem,
  qtype: q.type,
  answer: q.answer,
  explanation: q.explanation || null,
  options: q.type === 'choice' ? q.options : null,
}));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({ bankName: '内置题库', questions: out, parseErrors: errors }),
  'utf8'
);
console.log(`Wrote ${out.length} questions to ${outPath}`);
