/**
 * expo-sqlite npm 包未附带 wa-sqlite.wasm，Web 打包会失败。
 * 从仓库内 assets/wa-sqlite.wasm 复制到 node_modules 对应路径（npm install 后自动执行）。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'wa-sqlite.wasm');
const dest = path.join(
  root,
  'node_modules',
  'expo-sqlite',
  'web',
  'wa-sqlite',
  'wa-sqlite.wasm'
);

if (!fs.existsSync(src)) {
  console.warn('[copy-sqlite-wasm] 跳过：未找到', src);
  process.exit(0);
}

try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('[copy-sqlite-wasm] 已复制到', dest);
} catch (e) {
  console.warn('[copy-sqlite-wasm] 复制失败（可忽略）:', e.message);
}
