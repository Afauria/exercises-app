/**
 * 从泰迪云课堂等导出的试卷 HTML（如项目根目录 fetch.html）解析题目，
 * 输出与 build-bank-json.ts 一致的 BankDocument JSON（bankName + questions + parseErrors）。
 *
 * 用法：
 *   npx tsx scripts/fetch-html-to-bank.ts
 *   npx tsx scripts/fetch-html-to-bank.ts --in ./fetch.html --out ./public/bank-from-fetch.json
 *
 * 构建已改为以 TXT 为准：生成 bank-from-fetch.json 后请执行
 *   cp public/bank-from-fetch.json public/bank.json && npm run bank:json-to-txt
 * 再运行 dev/build（会由 bundled TXT 生成 bank.json）；或直接维护 assets/bundled-question-bank.txt。
 *
 * 说明：多选题答案为逗号分隔字母（如 A,B,D）；应用内练习/考试已支持多选判分。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import type { BankDocument, Question, QuestionOption } from '../src/types/models';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function normSpace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function parseCliArgs(): { inPath: string; outPath: string } {
  const argv = process.argv.slice(2);
  let inPath = path.join(root, 'fetch.html');
  let outPath = path.join(root, 'public', 'bank-from-fetch.json');
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--in' && argv[i + 1]) {
      inPath = path.resolve(root, argv[++i]!);
    } else if (argv[i] === '--out' && argv[i + 1]) {
      outPath = path.resolve(root, argv[++i]!);
    }
  }
  return { inPath, outPath };
}

function extractTitle($: cheerio.CheerioAPI): string {
  const t = $('.testpaper-title__content').first().attr('title')?.trim();
  if (t) return t;
  const fromH1 = $('.testpaper-title__content').first().text().trim();
  if (fromH1) return fromH1;
  const docTitle = $('title').first().text().split('-')[0]?.trim();
  return docTitle || '导入题库';
}

function parseCorrectFromFooter($: cheerio.CheerioAPI, $q: cheerio.Cheerio<any>): string {
  const html = $q.find('.testpaper-question-result').first().html() ?? '';
  const m = html.match(/正确答案是\s*<strong[^>]*>([\s\S]*?)<\/strong>/i);
  if (!m?.[1]) return '';
  const frag = cheerio.load(`<div>${m[1]}</div>`);
  return normSpace(frag('div').text());
}

function explanationText($q: cheerio.Cheerio<any>): string | null {
  const well = $q.find('.testpaper-question-analysis .well').first();
  if (!well.length) return null;
  const raw = well.html() ?? '';
  const plain = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  return plain || null;
}

function optionLabelFromSpan(text: string): string {
  const t = normSpace(text);
  const m = t.match(/^([A-D])[.．]$/i);
  if (m) return m[1]!.toUpperCase();
  const m2 = t.match(/^([A-D])[.．]\s*/i);
  if (m2) return m2[1]!.toUpperCase();
  return t.charAt(0).toUpperCase();
}

function parseChoiceQuestion(
  $: cheerio.CheerioAPI,
  $q: cheerio.Cheerio<any>,
  errors: string[],
  seqHint: string
): Omit<Question, 'id'> | null {
  const stem = normSpace($q.find('.testpaper-question-stem').first().text());
  if (!stem) {
    errors.push(`序号 ${seqHint}：题干为空`);
    return null;
  }

  const options: QuestionOption[] = [];
  $q.find('.testpaper-question-choices li.testpaper-question-choice-item').each(
    (_, el) => {
      const $li = $(el);
      const $span = $li.find('.testpaper-question-body-item__index').first();
      const label = optionLabelFromSpan($span.text());
      const fullText = normSpace($li.text());
      const idxText = normSpace($span.text());
      let text = fullText;
      if (fullText.startsWith(idxText)) {
        text = normSpace(fullText.slice(idxText.length));
      }
      if (label && /^[A-D]$/i.test(label)) {
        options.push({ label: label.toUpperCase(), text });
      }
    }
  );

  const rights = new Set<string>();
  $q.find('li.testpaper-question-choice-item--right').each((_, el) => {
    const $li = $(el);
    const lab = optionLabelFromSpan(
      $li.find('.testpaper-question-body-item__index').first().text()
    );
    if (/^[A-D]$/i.test(lab)) rights.add(lab.toUpperCase());
  });

  let answer = [...rights].sort().join(',');
  const fromFooter = parseCorrectFromFooter($, $q);
  if (!answer && fromFooter) {
    answer = fromFooter
      .replace(/\s+/g, '')
      .split(/[,，、]/)
      .filter((x) => /^[A-D]$/i.test(x))
      .map((x) => x.toUpperCase())
      .sort()
      .join(',');
  }
  if (!answer && fromFooter && /^[A-D]$/i.test(fromFooter)) {
    answer = fromFooter.toUpperCase();
  }

  if (!answer) {
    errors.push(`序号 ${seqHint}：未解析到选择题答案（${stem.slice(0, 40)}…）`);
    return null;
  }

  if (options.length === 0) {
    errors.push(`序号 ${seqHint}：无选项`);
    return null;
  }

  const qtype: 'single' | 'multi' = answer.includes(',') ? 'multi' : 'single';

  return {
    ordinal: 0,
    stem,
    qtype,
    answer,
    explanation: explanationText($q),
    options,
  };
}

function parseBooleanQuestion(
  $: cheerio.CheerioAPI,
  $q: cheerio.Cheerio<any>,
  errors: string[],
  seqHint: string
): Omit<Question, 'id'> | null {
  const stem = normSpace($q.find('.testpaper-question-stem').first().text());
  if (!stem) {
    errors.push(`序号 ${seqHint}：题干为空`);
    return null;
  }
  const raw = parseCorrectFromFooter($, $q);
  let answer = '';
  const t = normSpace(raw);
  if (t === '错误') answer = '错误';
  else if (t === '正确') answer = '正确';
  else {
    errors.push(`序号 ${seqHint}：判断题答案无法识别「${raw}」`);
    return null;
  }
  return {
    ordinal: 0,
    stem,
    qtype: 'boolean',
    answer,
    explanation: explanationText($q),
    options: null,
  };
}

function main(): void {
  const { inPath, outPath } = parseCliArgs();
  if (!fs.existsSync(inPath)) {
    console.error(`找不到输入文件：${inPath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(inPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: true });
  const bankName = extractTitle($);
  const errors: string[] = [];
  const rawList: Omit<Question, 'id'>[] = [];

  $('.testpaper-question.js-testpaper-question').each((_, el) => {
    const $q = $(el);
    const seqText = normSpace($q.find('.testpaper-question-seq').first().text()) || '?';
    const isDetermine = $q.hasClass('testpaper-question-determine');
    let q: Omit<Question, 'id'> | null = null;
    if (isDetermine) {
      q = parseBooleanQuestion($, $q, errors, seqText);
    } else {
      q = parseChoiceQuestion($, $q, errors, seqText);
    }
    if (q) {
      const ord = parseInt(seqText, 10);
      q.ordinal = Number.isFinite(ord) ? ord : rawList.length + 1;
      rawList.push(q);
    }
  });

  rawList.sort((a, b) => a.ordinal - b.ordinal);

  const questions: Question[] = rawList.map((q, i) => ({
    id: i + 1,
    ordinal: q.ordinal,
    stem: q.stem,
    qtype: q.qtype,
    answer: q.answer,
    explanation: q.explanation,
    options: q.options,
  }));

  const doc: BankDocument = {
    bankName,
    questions,
    parseErrors: errors.length ? errors : undefined,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc), 'utf8');
  console.log(
    `已写入 ${questions.length} 题 → ${outPath}` +
      (errors.length ? `（${errors.length} 条解析告警，见 parseErrors）` : '')
  );
}

main();
