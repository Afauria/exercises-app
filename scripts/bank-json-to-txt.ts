/**
 * 将 public/bank.json 导出为与 docs/试题库_1432题.txt 相同风格的 TXT，供 assets 内置题库使用。
 * 多选题答案行为「答案: A,B」。
 *
 *   npx tsx scripts/bank-json-to-txt.ts
 *   npx tsx scripts/bank-json-to-txt.ts --out ./assets/bundled-question-bank.txt
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Question } from '../src/types/models';
import { normalizeQuestionType } from '../src/lib/questionAnswer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function parseArgs(): { outPaths: string[] } {
  const argv = process.argv.slice(2);
  const defaults = [
    path.join(root, 'assets', 'bundled-question-bank.txt'),
    path.join(root, 'assets', '试题库_1432题.txt'),
  ];
  const outPaths: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out' && argv[i + 1]) outPaths.push(path.resolve(root, argv[++i]!));
  }
  return { outPaths: outPaths.length ? outPaths : defaults };
}

function questionToTxt(q: Question): string {
  const lines: string[] = [];
  lines.push(`${q.ordinal}. ${q.stem}`);
  const qt = normalizeQuestionType(q);
  if (qt !== 'boolean' && q.options?.length) {
    for (const o of q.options) {
      lines.push(`\t ${o.label}. ${o.text}`);
    }
  }
  lines.push(`答案: ${q.answer}`);
  lines.push(`解析: ${q.explanation ?? ''}`);
  return lines.join('\n');
}

function main(): void {
  const bankPath = path.join(root, 'public', 'bank.json');
  if (!fs.existsSync(bankPath)) {
    console.error(`缺少 ${bankPath}`);
    process.exit(1);
  }
  const { outPaths } = parseArgs();
  const doc = JSON.parse(fs.readFileSync(bankPath, 'utf8')) as { questions: Question[] };
  const blocks = doc.questions.map((q) => questionToTxt(q));
  const body = blocks.join('\n\n') + '\n';
  for (const outPath of outPaths) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, body, 'utf8');
    console.log(`Wrote ${doc.questions.length} questions -> ${outPath}`);
  }
}

main();
