import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages 项目站地址为 https://<user>.github.io/<仓库名>/
 * 与仓库目录名一致（此处为 ai_test）。若改名，请同步修改此处或构建时设置环境变量 VITE_BASE。
 */
const pagesBase = process.env.VITE_BASE?.trim();
const base =
  pagesBase != null && pagesBase !== ''
    ? pagesBase.endsWith('/')
      ? pagesBase
      : `${pagesBase}/`
    : '/ai_test/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 5174, strictPort: true, host: '127.0.0.1' },
});
