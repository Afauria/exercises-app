# 题库练习（静态 Web）

Vite + React + TypeScript 单页应用，构建产物为纯静态文件，可部署到任意静态托管；题库在构建时由 `assets/bundled-question-bank.txt` 解析生成 `public/bank.json`。

## 开发

```bash
npm install
npm run dev
```

浏览器访问终端提示的本地地址。默认 `base` 为 **`/ai_test/`**（与 GitHub Pages 项目站路径一致），开发时请打开 **`http://localhost:5173/ai_test/`**（注意末尾路径）。`dev` 会先执行一次题库 JSON 生成脚本。

若需根路径部署，构建前设置环境变量，例如：`VITE_BASE=/ npm run build`（根路径需配合托管方 SPA 回退）。

## 构建与部署

```bash
npm run build
```

产物在 `dist/`。将 **`dist/` 下全部内容**（含 `404.html`）上传到静态站点。

**GitHub Pages（项目站 `https://<user>.github.io/<仓库名>/`）**  
- 默认按仓库名 **`ai_test`** 配置，资源前缀为 `/ai_test/`。若仓库名不同，请改 `vite.config.ts` 中的默认 `base`，或构建时使用 `VITE_BASE=/你的仓库名/`。  
- 路由采用 **Hash 模式**（地址形如 `.../ai_test/#/practice`）：刷新时只请求 `index.html`，不会出现「`/ai_test/practice` 刷新 404」的问题。  
- 构建脚本仍会复制 **`404.html`**，可作备用（例如误打开非 hash 路径时）。

其它托管需配置「所有未匹配路径回退到 `index.html`」；根目录部署时用 `VITE_BASE=/` 构建。

内置 `bank.json` 会随 `prebuild` 写入 `public/` 并打进包内；也可在应用内通过「数据与题库 → 导入本地 TXT」覆盖为自定义题库（存于 `localStorage`）。

## 数据与清空

- **清空全部数据**：清除错题、收藏、练习记录、考试记录、全局「显示答案」状态；**不删除**内置 `bank.json` 题库，分节列表仍在。
- **导入内置题库**：清除自定义题库缓存并刷新页面，恢复默认 `bank.json`。

## 验收（类型检查 + E2E）

```bash
npm run verify
```

将安装 Chromium（如未安装）、执行 `tsc`、生产构建，并启动 `vite preview`（`http://127.0.0.1:5174/ai_test/`）跑 Playwright 用例。

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
