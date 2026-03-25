# 题库练习（静态 Web）

Vite + React + TypeScript 单页应用，构建产物为纯静态文件，可部署到任意静态托管；题库在构建时由 `assets/bundled-question-bank.txt` 解析生成 `public/bank.json`。

**需求与功能边界**见 [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)（便于复用与迭代）。

## 开发

```bash
npm install
npm run dev
```

浏览器访问终端提示的本地地址。本地默认 `base` 为 **`/ai_test/`**（仅本地回退；与 Playwright 一致），开发时请打开 **`http://localhost:5173/ai_test/`**。

**GitHub Actions** 构建时会带上环境变量 **`GITHUB_REPOSITORY`**，`vite.config` 会自动使用 **`/<仓库名>/`**，与 `https://<用户>.github.io/<仓库名>/` 一致，一般**不必改路径**。

手动覆盖：`VITE_BASE=/你的路径/`（根站点用 `VITE_BASE=/`）。

## 构建与部署

```bash
npm run build
```

产物在 `dist/`。将 **`dist/` 下全部内容**（含 `404.html`）上传到静态站点。

**GitHub Pages（`gh-pages` 分支 = `dist` 根目录）**  
- 项目站 URL：`https://<user>.github.io/<仓库名>/`。构建在 **GitHub Actions** 上执行时，**`base` 自动为 `/<仓库名>/`**（读 `GITHUB_REPOSITORY`）。本地构建若要模拟线上，可执行：  
  `GITHUB_REPOSITORY=你的名/你的仓库名 npm run build`  
- 路由为 **Hash**（如 `.../<仓库名>/#/practice`），刷新不会请求不存在的 `/practice` 路径。  
- **`404.html`** 由构建脚本复制，可作备用。

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
