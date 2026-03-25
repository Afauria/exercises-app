# 题库练习应用 — 迭代与重写纲要

> 本文档汇总**需求、架构、实施阶段、用户功能与测试用例**，便于后续重写、迁移技术栈或分阶段迭代。  
> 代码路径以仓库根目录为基准；版本信息以 `package.json` 为准（Expo ~55、RN 0.83、expo-sqlite ~55）。

---

## 1. 需求文档（摘要）

### 1.1 产品定位

- 离线优先的**题库学习与测验**应用：支持练习、模拟考试、错题与收藏、学习统计。
- 题库来源：**内置 TXT**（随包）与**用户导入 TXT**；同一套解析与入库逻辑。

### 1.2 功能需求（Must）

| 编号 | 需求 | 说明 |
|------|------|------|
| R1 | 题库管理 | 首次启动自动加载内置题库；可清空全部数据；可导入内置/本地 TXT |
| R2 | 练习模式 | 按「节」分页（每节固定题量）；随机一节；单题前进/后退；题号语义与源文件一致 |
| R3 | 答案展示 | 支持全局「显示/隐藏全部答案」；单题层面与练习 UI 一致 |
| R4 | 搜索 | 按题号或题干关键词搜索，跳转练习（指定题目列表） |
| R5 | 考试模式 | 选节、设置时长与题量、限时答题、交卷、判分、结果页 |
| R6 | 错题本 | 答错收录；列表与重练流程 |
| R7 | 收藏 | 收藏题目；与错题分区展示 |
| R8 | 统计 | 练习正确率、题库总量、近期节奏、考试历史等 |

### 1.3 非功能需求

- **离线**：核心数据在本地 SQLite（`expo-sqlite`）；Web 使用 wa-sqlite + OPFS。
- **多端**：Expo（iOS / Android / Web）；Web 需单独验证 OPFS/浏览器存储策略。
- **性能**：大题库导入（约 1400+ 题）可接受分批 `setTimeout(0)` 让出主线程；列表/节缓存见 `sectionQuestionCache`。
- **一致性**：`ordinal`（题号）与源 TXT 对齐，导入时重复题号跳过并记录报告。

### 1.4 约束与已知平台差异

- Web 上 **journal_mode 使用 DELETE**（非 WAL），因 wa-sqlite/OPFS 对 WAL 的 `xFileControl` 支持不完整。
- **同一 DB 单例**：`getDatabase()` 合并并发打开，避免 Web 多 SyncAccessHandle 冲突。
- **导入事务**：`importQuestionBank` **不使用** `withTransactionAsync`；在 Web 上显式事务 + 失败行被 catch 易导致 SQLite 中止态与 `ROLLBACK` 异常（见实现注释）。
- **脏数据**：若存在 `banks` 行但题目数为 0，`ensureDefaultBankLoaded` 需对默认库 **replace 重导**（见 `importService.ts`）。

### 1.5 题库格式（解析契约）

- 解析器：`src/parsers/questionBankParser.ts`。
- 结构要点：`N. 题干`、选项 `A.`–`D.`、**答案：**、**解析：**；支持判断题（正确/错误）。
- 输出：`ParsedQuestion[]` + 解析过程 `errors[]`。

---

## 2. 架构文档

### 2.1 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Expo ~55、React 19、React Native 0.83、react-native-web |
| 导航 | `@react-navigation/native`、bottom-tabs、native-stack |
| 状态 | 局部 `useState` / `useCallback`；全局答案开关 `zustand`（`revealAnswersStore`） |
| 持久化 | `expo-sqlite`；`postinstall` 复制 WASM（`scripts/copy-sqlite-wasm.js`） |
| E2E | Playwright（Chromium），`CI=1 expo start --web --port 8765` |

### 2.2 目录与分层

```
App.tsx                      # 根：启动 ensureDefaultBankLoaded、Tab、错误横幅
src/
  db/
    database.ts              # 单例 DB、迁移 SQL、journal_mode
    repository.ts            # 所有 SQL 访问与业务写入
  features/
    practice/                # 练习栈：首页、做题页、导航
    exam/                    # 考试栈：首页、测验、结果
    wrongbook/               # 错题 + 收藏
    stats/                   # 统计看板
    importer/                # 导入服务（内置/本地/ensureDefault）
  parsers/
    questionBankParser.ts    # TXT → ParsedQuestion
  shared/                    # 主题、题卡、搜索栏、节常量、缓存、Header 动作
  types/
    models.ts                # Question、ImportReport、ExamConfig 等
    navigation.ts            # Practice / Exam 栈参数类型
assets/
  bundled-question-bank.txt  # 内置题库（或引用试题库文件经构建链处理）
e2e/
  app-verification.spec.ts   # 冒烟：Tab、文案、菜单
  practice-bank-flow.spec.ts # 题库加载、做题、换节
```

### 2.3 导航结构

- **Tab**：练习（无顶栏，自管 header）、考试、错题、统计（后两者 `headerRight`：`AppHeaderActions`）。
- **练习栈**（`PracticeStackParamList`）：`PracticeHome` → `PracticeQuiz`（`section` | `search`）。
- **考试栈**（`ExamStackParamList`）：`ExamHome` → `ExamQuiz` → `ExamResult`。

### 2.4 数据模型（SQLite）

表（见 `database.ts`）：

- `banks`：题库元数据  
- `questions`：`bank_id` + `ordinal` 唯一；`options_json`  
- `practice_records`：练习答题轨迹  
- `exam_sessions` / `exam_answers`：考试会话与作答  
- `favorites` / `wrong_questions`：收藏与错题  

索引：`bank_id`、`ordinal`、`stem`、`practice_records.answered_at`、`exam_sessions.ended_at`。

### 2.5 关键数据流

1. **冷启动**：`ensureDefaultBankLoaded()` → 无库或**有库无题**则导入内置 TXT → `importQuestionBank` → `clearQuestionSectionCache()`。  
2. **练习节**：`PAGE_SIZE`（`sectionConstants.ts`，当前 50）切分；`prefetchInitialSections` 预取。  
3. **全局显隐答案**：`AppHeaderActions` 切换 `revealAnswersStore`，题卡组件消费。  
4. **导入**：`AppHeaderActions` Modal → `importFromBundledBank` / `pickAndImportQuestionBank` → `repository.importQuestionBank`。

### 2.6 对外 API 边界（重写时可替换实现）

`repository.ts` 已集中暴露：`listBanks`、`getDefaultBankId`、`importQuestionBank`、`getQuestionCount`、`getQuestionsSequential`、`searchQuestions`、`getQuestionsByIds`、`recordPractice`、错题/收藏 CRUD、考试会话与 `getExamSessions`、`getPracticeStats*`、`clearAllData` 等。  
重写时优先保持这些**语义**，UI 可整体替换。

---

## 3. 实施计划（阶段划分，便于对照进度）

以下为**逻辑阶段**，可与 Git 里程碑对应；当前仓库已实现全流程。

| 阶段 | 内容 | 主要产出 |
|------|------|----------|
| P0 | 工程脚手架 | Expo、TypeScript、Tab + 空屏 |
| P1 | SQLite 与迁移 | `database.ts`、表结构 |
| P2 | 解析与导入 | `questionBankParser`、`importQuestionBank`、`ImportReport` |
| P3 | 练习 | 分节列表、做题页、进度、随机节、记录练习 |
| P4 | 考试 | 配置、倒计时、交卷、结果、会话落库 |
| P5 | 错题与收藏 | 列表、重练、与练习栈衔接 |
| P6 | 统计 | 正确率、题量、趋势、考试记录展示 |
| P7 | 搜索与优化 | `searchQuestions`、索引、`GlobalSearchBar` |
| P8 | 质量保障 | Playwright 配置、`verify` 脚本、Web 导入/事务修复 |

**重写建议顺序**：P1 数据模型 → P2 导入 → P3 练习（含节与题号）→ P4 考试 → P5/P6 → P7 → P8。

---

## 4. 用户功能清单（按场景）

### 4.1 练习 Tab

- 展示「共 N 题 · 每节 M 题」、节网格（第 1 节…）、**随机一节**。  
- **搜索**：题号或题干 → 进入搜索模式做题。  
- 进入节后：**载入本题组**、进度 `x / y`、上一题/下一题、选项或判断、收藏/错题相关操作（以当前 `PracticeQuizScreen` 为准）。  
- 列表加载完成：`testID="practice-home-list-loaded"`（供 E2E）。

### 4.2 考试 Tab

- 选择节、本场时长与题量 → **进入考试** → 答题 → 交卷 → **结果页**（正确数/总数等）。

### 4.3 错题 Tab

- 巩固列表；**收藏**分区；空态文案。

### 4.4 统计 Tab

- 练习正确率、题库总量、近 30 日节奏、考试记录等卡片/列表。

### 4.5 全局（Header）

- **眼睛**：显示/隐藏全部答案。  
- **数据与题库**：清空全部数据、导入内置题库、导入本地 TXT、关闭。

### 4.6 启动异常

- 内置题库加载失败时顶部红色横幅：`题库自动加载失败：…`。

---

## 5. 测试用例

### 5.1 自动化 E2E（Playwright）

| 套件 | 文件 | 覆盖要点 |
|------|------|----------|
| 冒烟 | `e2e/app-verification.spec.ts` | 四 Tab；练习搜索占位与随机一节；考试步骤文案；错题/统计关键标题；数据菜单项；眼睛切换后练习仍可交互 |
| 题库与练习 | `e2e/practice-bank-flow.spec.ts` | `practice-home-list-loaded`；有/无题库时导入内置；`共 N 题`、第 1 节；做题、下一题进度；返回后换第 2 节题号（如 51.）与进度重置 |

**运行**：

```bash
npm run test:e2e
# 或完整校验（含 tsc + 安装 chromium + CI 下跑全部）
npm run verify
```

**环境**：`playwright.config.ts` 默认拉起 `CI=1 npx expo start --web --port 8765`，`baseURL` `http://127.0.0.1:8765`。  
**注意**：定位器需处理 **重复节点**（如多个「第 1 节」、子串匹配「1. 选择一节」）：使用 `.first()`、`exact: true` 等。

### 5.2 建议手工 / 真机用例（补充 E2E）

| ID | 场景 | 预期 |
|----|------|------|
| M1 | 首次安装 / 清站数据后打开 | 自动出现题库与分节，无红色横幅 |
| M2 | 导入本地 TXT | 报告成功/失败条数；列表刷新 |
| M3 | 清空全部数据 | 练习页无章节；可再次导入 |
| M4 | iOS/Android 大题库导入 | 不卡死、不 OOM；完成后可用 |
| M5 | Web 隐私模式 / 无痕 | OPFS 不可用时的降级或明确提示（若产品要求） |
| M6 | 考试超时 | 自动交卷或禁止作答，结果一致 |
| M7 | 断网 | 除题库资源外功能仍可用 |

### 5.3 回归关注点（迭代清单）

- 修改 `PAGE_SIZE` 后：同步 E2E 中 `1 / 50`、`51.` 等断言。  
- 修改解析器后：跑一遍全量导入 + 抽样题号与题干。  
- 改动 `importQuestionBank` 事务策略时：**优先在 Web 上跑 `practice-bank-flow`**。  
- 改动 `ensureDefaultBankLoaded`：验证「有 bank 无题」会重导。

---

## 6. 文档维护

- 大功能变更时：更新本文 **§1 需求**、**§2 架构** 与 **§5 测试**。  
- 若拆分多文档，建议保留本文为索引，并链接到 `docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 等。

---

*生成自当前代码树梳理；如有与实现不一致处，以源码为准。*
