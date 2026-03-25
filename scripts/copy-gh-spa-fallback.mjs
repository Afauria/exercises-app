import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const index = path.join(dist, 'index.html');
const fallback = path.join(dist, '404.html');

if (!fs.existsSync(index)) {
  console.warn('copy-gh-spa-fallback: dist/index.html missing, skip');
  process.exit(0);
}
fs.copyFileSync(index, fallback);
console.log('Copied dist/index.html -> dist/404.html (GitHub Pages SPA fallback)');
