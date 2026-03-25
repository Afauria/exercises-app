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

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 5174, strictPort: true, host: '127.0.0.1' },
});
