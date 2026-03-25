# 题库练习（静态 Web）

Vite + React + TypeScript 单页应用，构建产物为纯静态文件，可部署到任意静态托管；题库在构建时由 `assets/bundled-question-bank.txt` 解析生成 `public/bank.json`。

## 开发

```bash
npm install
npm run dev
```

浏览器访问终端提示的本地地址（默认 `http://localhost:5173`）。`dev` 会先执行一次题库 JSON 生成脚本。

## 构建与部署

```bash
npm run build
```

产物在 `dist/`。将 `dist/` 内文件上传到静态站点（如 GitHub Pages、对象存储 + CDN、Nginx 根目录等）。确保服务器对所有路由回退到 `index.html`（SPA history fallback），或使用仅哈希路由时可省略（当前为 History 模式，需 fallback）。

内置 `bank.json` 会随 `prebuild` 写入 `public/` 并打进包内；也可在应用内通过「数据与题库 → 导入本地 TXT」覆盖为自定义题库（存于 `localStorage`）。

## 数据与清空

- **清空全部数据**：清除错题、收藏、练习记录、考试记录、全局「显示答案」状态；**不删除**内置 `bank.json` 题库，分节列表仍在。
- **导入内置题库**：清除自定义题库缓存并刷新页面，恢复默认 `bank.json`。

## 验收（类型检查 + E2E）

```bash
npm run verify
```

将安装 Chromium（如未安装）、执行 `tsc`、生产构建，并启动 `vite preview`（`127.0.0.1:5174`）跑 Playwright 用例。

若本地已有预览进程占用 5174，请先结束该进程再运行。

仅跑 E2E（需已构建且预览服务可用，或由 Playwright 自动拉起）：

```bash
npm run test:e2e
```

跳过 Playwright 自带 Web 服务（自行提供服务）时：

```bash
PLAYWRIGHT_SKIP_SERVER=1 npm run test:e2e
```

## 分支说明

`master` 上保留迁移前快照；静态站实现在分支 `refactor/static-html`。
