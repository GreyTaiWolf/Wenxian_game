# Wenxian Game（修仙文字 RPG）

## 项目介绍
Wenxian Game 是一个**移动端优先**的修仙题材文字 RPG，强调“短回合反馈 + 长线养成”的体验：
- 通过修炼与突破推进境界成长；
- 在大世界中进行州域探索、地点互动与剧情历练；
- 以回合制战斗获取资源、挑战更高难度内容；
- 结合宗门与洞府系统形成中长期目标。

当前版本聚焦炼气到筑基阶段，已形成“修炼—背包—历练—战斗—宗门—洞府—存档”的核心循环。

## 运行方式
### 环境要求
- Node.js 18+
- Yarn 1.22+

### 本地启动
```bash
yarn
yarn dev
```
启动后在浏览器访问命令行输出地址（默认由 Vite 提供本地开发地址）。

## 技术栈
- **前端框架**：React 18
- **语言**：TypeScript（strict）
- **构建工具**：Vite 6
- **图标库**：lucide-react
- **运行模式**：纯前端本地存档（LocalStorage）

## 当前版本
- **版本号**：`0.1.0`
- **包名**：`xiuxian-text-rpg`
- **状态**：可游玩的早期版本（炼气-筑基阶段主循环已打通）

## 核心玩法
- **修炼与突破**：手动聚气积累修为，消耗资源突破境界。
- **背包与装备**：管理材料、丹药与装备，支持品级与构筑成长。
- **历练与地图**：通过大世界进入州域、地点与场景，触发探索、采集、战斗与机缘。
- **回合制战斗**：玩家 + 队友/灵宠对抗妖兽与敌修，基于速度排序执行行动。
- **宗门成长**：加入青云宗后获得身份、贡献与声望相关内容。
- **洞府养成**：筑基后可进行闭关与聚灵阵升级，形成离线成长节奏。
- **本地存档**：多槽位存档管理，支持新建、继续与删除。

## 目录结构
```text
Wenxian_game/
├─ src/
│  ├─ components/     # UI 组件与轻交互
│  ├─ data/           # 配置数据（境界、技能、物品、敌人、地图、主线等）
│  ├─ game/           # 核心游戏逻辑（状态、战斗、任务、存档、AI、主线推导）
│  ├─ types.ts        # 共享类型定义与状态结构
│  └─ styles.css      # 全局样式与主题变量
├─ docs/
│  ├─ GAME_DESIGN.md          # 玩法与系统设计文档
│  ├─ BALANCE.md              # 数值、公式与调参文档
│  ├─ DEVELOPMENT_ROADMAP.md  # 手游产品、工程、测试与发布执行路线
│  ├─ MAIN_QUEST.md           # 主线阶段、判定与回归清单
│  └─ QUEST_SYSTEM.md         # 通用任务目标、前置、结算与迁移规则
├─ package.json
└─ README.md
```

## 开发命令
```bash
yarn dev      # 本地开发（Vite）
yarn build    # TypeScript 检查 + 生产构建
yarn preview  # 本地预览构建产物
npm run android:apk:debug  # 构建 Android 调试包（需已安装 Android SDK）
```

## 部署方式
本项目为标准 Vite 静态站点，可部署到任意静态托管平台：
1. 执行 `yarn build` 生成 `dist/`；
2. 将 `dist/` 发布到静态服务（如 Nginx、Vercel、Netlify、GitHub Pages 等）；
3. 配置 SPA 回退（history fallback）到 `index.html`（若平台需要）。

仓库还包含：
- `Verify game build`：在 PR 与 `main` 提交时执行依赖锁定安装、TypeScript 检查和生产构建；
- `Deploy preview to GitHub Pages`：在 `main` 更新后构建并发布 GitHub Pages。
- `Build Android test APK`：在面向 `main` 的 PR 或手动触发时构建 `debug APK`；完成后可在该 Actions 运行记录的 `Artifacts` 中下载 `wenxian-android-debug-apk`。

## 当前完成内容
- 已完成移动端优先 UI 基础框架与核心信息层。
- 已完成修炼、突破、背包、历练、大世界探索、回合制战斗、宗门、洞府、存档等主系统基础闭环。
- 已开放中州与南疆主要地点；东海、西漠、北境已在大世界预留。
- 已建立数据驱动的当前主线目标，串联聚气、任务、采集、战斗、突破、入宗、筑基和南疆。
- 已统一普通任务的采集、击杀、到达、对话、境界与穿戴目标契约，并将接取/结算移入规则层。
- 已建立 PR/主分支自动构建门禁。
- 已建立并持续维护设计、数值、主线与开发路线文档：
  - `docs/GAME_DESIGN.md`
  - `docs/BALANCE.md`
  - `docs/DEVELOPMENT_ROADMAP.md`
  - `docs/MAIN_QUEST.md`
  - `docs/QUEST_SYSTEM.md`

## 开发路线

完整执行顺序、里程碑、迭代拆分、测试策略、存档安全、PWA/原生封装和发布标准请阅读：

- `docs/DEVELOPMENT_ROADMAP.md`
- `docs/MAIN_QUEST.md`
- `docs/QUEST_SYSTEM.md`

## 下一步计划
- 完成新档至筑基初期端到端验收。
- 落地普通怪、精英与 Boss 的统一掉落表和首次奖励规则。
- 完成装备来源、对比、出售/分解与构筑反馈闭环。
- 深化南疆悬赏、筑基材料、秘境与洞府资源路线。
- 丰富宗门系统（委托、藏经阁、兑换、职位、关系线）。
- 深化洞府养成（灵田、炼丹、更多设施联动）。
- 增加存档导入/导出、PWA 安装与离线能力。
- 在炼气—筑基闭环通过质量门禁后扩展结丹与下一州域。

---
如需了解详细玩法、数值与开发执行标准，请优先阅读：
- `docs/GAME_DESIGN.md`
- `docs/BALANCE.md`
- `docs/DEVELOPMENT_ROADMAP.md`
- `docs/MAIN_QUEST.md`
- `docs/QUEST_SYSTEM.md`
