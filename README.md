# 题库练习 · 静态 Web

[![Deploy](https://github.com/Afauria/exercises-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/Afauria/exercises-app/actions/workflows/deploy.yml)

基于 **Vite + React + TypeScript** 的题库练习单页应用：构建产物为纯静态文件，可部署到 **GitHub Pages** 或任意静态托管；支持练习、模拟考试、错题本、收藏与统计，数据保存在浏览器 `localStorage`。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [可用脚本](#可用脚本)
- [本地开发](#本地开发)
- [构建与部署](#构建与部署)
- [测试](#测试)
- [文档](#文档)
- [仓库结构](#仓库结构)

---

## 功能特性

| 模块 | 说明 |
|------|------|
| **练习** | 按节刷题（每节 50 题）、随机一节、题号/题干搜索；支持上一题/下一题、可跳过；错题与练习统计落库 |
| **考试** | 选节、限时、抽题、交卷与成绩记录 |
| **错题 / 收藏** | 错题列表、收藏列表，可跳转重练 |
| **统计** | 练习正确率、题库总量、近 30 日节奏、考试记录 |
| **数据** | 清空本地记录、导入内置题库、导入本地 TXT（解析后存 `localStorage`，受容量限制） |

路由为 **Hash 模式**（例如 `https://用户名.github.io/仓库名/#/practice`），刷新子页面不依赖服务端 rewrite。

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 运行时 | React 19、TypeScript |
| 构建 | Vite 6 |
| 路由 | react-router-dom 7（`HashRouter`） |
| 样式 | 全局 CSS |
| E2E | Playwright |

---

## 环境要求

- **Node.js** ≥ 18（与 CI 一致即可）
- 现代浏览器（含移动端）

---

## 快速开始

```bash
git clone https://github.com/Afauria/exercises-app.git
cd exercises-app
npm ci
npm run dev
```

在浏览器打开终端提示的地址。本地默认需访问带 **base 路径** 的 URL（见下节）。

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 生成 `public/bank.json` 后启动开发服务器 |
| `npm run build` | 生产构建；输出 `dist/`，并复制 `index.html` → `404.html` |
| `npm run preview` | 本地预览生产构建 |
| `npm run preview:test` | 在 `127.0.0.1:5174` 以固定端口预览（供 E2E） |
| `npm run test:e2e` | 运行 Playwright（需已构建或配置 `webServer`） |
| `npm run verify` | `tsc` + 安装 Chromium + `build` + E2E，作为合并前验收 |

---

## 本地开发

- 默认 **Vite `base`** 在本地回退为 **`/ai_test/`**（与 Playwright 默认一致）。开发时请访问：  
  **`http://localhost:5173/ai_test/`**
- **CI / GitHub Actions** 构建时会注入 **`GITHUB_REPOSITORY`**，`vite.config` 自动使用 **`/<仓库名>/`**，与  
  `https://<用户>.github.io/<仓库名>/` 对齐，一般无需手改。
- 手动覆盖：构建或开发前设置  
  `VITE_BASE=/你的前缀/`  
  （根路径站点使用 `VITE_BASE=/`）。

题库源文件：**`assets/bundled-question-bank.txt`** → `prebuild` 会执行 `scripts/build-bank-json.ts`，**每次构建都会用 TXT 覆盖生成** **`public/bank.json`**。

- 更新题库后请 **`git add` 并推送 `assets/bundled-question-bank.txt`**（以及随之生成的 `public/bank.json` 若你一并纳入版本控制）。若只改本地 `bank.json` 而未改 TXT，或未把 TXT 推送到 GitHub，则 **Pages 构建仍会按仓库里的旧 TXT 出题**，表现常为「样式/代码已更新，题库还是旧的」。
- 构建产物中的内置 `bank.json` 请求会带版本查询参数（基于提交 SHA 或本地时间戳），减轻 **CDN/浏览器缓存** 导致仍加载旧 `bank.json` 的情况。

---

## 构建与部署

```bash
npm run build
```

将 **`dist/` 目录内全部文件**（含 `404.html`、`bank.json`、`assets/`）上传到静态站点根目录（或等价配置）。

### GitHub Pages

本仓库提供 **`.github/workflows/deploy.yml`**：在推送 **`main`** 时执行 `npm ci` + `npm run build`，并通过 **peaceiris/actions-gh-pages** 将 **`dist/`** 发布到 **`gh-pages`** 分支。

请在仓库 **Settings → Pages** 中将源设为 **`gh-pages` 分支**（通常为根目录）。

### 其它托管

若使用 History 模式以外的纯静态托管，需自行配置「未匹配路径回退到 `index.html`」；当前项目以 **Hash 路由** 为主，对静态托管友好。

---

## 测试

```bash
npm run verify
```

若本机 **5174** 已被占用，请先结束占用进程再运行。

仅跑 E2E（且自行保证预览服务可用时）：

```bash
npm run test:e2e
```

跳过 Playwright 内置 Web 服务：

```bash
PLAYWRIGHT_SKIP_SERVER=1 npm run test:e2e
```

Playwright 的 **`baseURL`** 与 Vite **`base`** 需一致；本地可通过环境变量 **`E2E_BASE`** 覆盖默认路径。

---

## 文档

| 文档 | 说明 |
|------|------|
| [**docs/REQUIREMENTS.md**](docs/REQUIREMENTS.md) | 需求说明、数据约定、路由与验收范围，便于复用与迭代 |

---

## 仓库结构

```
├── assets/                 # 内置题库 TXT（构建生成 bank.json）
├── docs/                   # 需求等文档
├── e2e/                    # Playwright 用例
├── public/                 # 静态资源（含构建生成的 bank.json）
├── scripts/                # build-bank-json、gh-pages 404 复制等
├── src/
│   ├── components/         # 布局、顶栏、题目卡片等
│   ├── context/            # 题库加载与上下文
│   ├── lib/                # 分节常量等
│   ├── pages/              # 各业务页面
│   ├── parsers/            # TXT 解析
│   ├── storage/            # localStorage 封装
│   └── ...
├── index.html
├── vite.config.ts
└── playwright.config.ts
```

---

## 数据说明（摘要）

- **清空全部数据**：清除错题、收藏、练习记录、考试记录、全局「显示答案」；**不删除**已导入的自定义题库 JSON。
- **导入内置题库**：清除自定义题库缓存并刷新，恢复随包 **`bank.json`**。

更多字段与行为见 [**docs/REQUIREMENTS.md**](docs/REQUIREMENTS.md)。
