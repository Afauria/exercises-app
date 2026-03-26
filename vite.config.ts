import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 静态资源与 fetch(bank.json) 的前缀，须与线上 URL 路径一致。
 *
 * 优先级：
 * 1. VITE_BASE（手动覆盖，须以 / 开头，建议带末尾 /，如 /my-repo/）
 * 2. GitHub Actions 中的 GITHUB_REPOSITORY（自动为 owner/repo → /repo/）
 * 3. 本地开发回退 /ai_test/（与 Playwright 默认一致；仓库名不同时请设 VITE_BASE 或改回退值）
 */
function resolveBase(): string {
  const explicit = process.env.VITE_BASE?.trim();
  if (explicit) {
    return explicit.endsWith('/') ? explicit : `${explicit}/`;
  }
  const gh = process.env.GITHUB_REPOSITORY;
  if (gh) {
    const repo = gh.split('/')[1];
    if (repo) return `/${repo}/`;
  }
  return '/ai_test/';
}

const base = resolveBase();

/** 打进前端用于 fetch(bank.json) 的查询参数，避免 GitHub Pages / 浏览器长期缓存旧题库 */
const bankStamp =
  process.env.GITHUB_SHA?.slice(0, 12) || `local-${Date.now()}`;

export default defineConfig({
  base,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BANK_STAMP': JSON.stringify(bankStamp),
  },
  server: { port: 5173 },
  preview: { port: 5174, strictPort: true, host: '127.0.0.1' },
});
