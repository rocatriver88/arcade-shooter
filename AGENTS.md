# AGENTS.md

本文件是给 AI 编程智能体（Codex、Claude、Copilot 等）的工作说明。每次开始任务前请先读完。

## 项目概述

《星际突击》(Star Assault)：纯原生前端的竖版射击小游戏，使用 Vanilla JS + HTML5 Canvas + CSS，不使用任何框架、游戏引擎或构建工具。

| 文件 | 作用 |
| --- | --- |
| `index.html` | DOM 结构：`<canvas>` 和各个界面遮罩（开始页、失败页、胜利页、HUD） |
| `style.css` | 所有 UI 样式 |
| `game.js` | 全部游戏逻辑：主循环、状态机、实体类、碰撞、渲染 |
| `assets/` | 图片素材（PNG） |
| `REQUIREMENTS.md` / `TECHNICAL_DESIGN.md` | 需求与技术设计。文档已落后于代码（例如实体管理已改为对象池），**两者不一致时以代码为准** |

## 运行与验证

- 无需安装依赖，无构建步骤。
- 启动本地服务器：`./init.sh`（等同于 `python3 -m http.server 8000`），然后打开 `http://localhost:8000/`。
- 没有自动化测试。改动游戏逻辑后，至少按下面的路径检查，并在 PR 里写明实际检查了哪些：
  1. 首次开始游戏
  2. 失败后重新开始
  3. 胜利后再次游玩
  4. 浏览器控制台没有新增报错
- 无法实际运行浏览器时，必须在 PR 中写明"未做浏览器验证"，不要把源码阅读说成已验证。

## 代码约定

- 保持原生 JS，不引入 npm 包、框架、打包工具或 TypeScript。
- 运动计算统一乘以 `deltaTime / 1000`，保证不同刷新率下速度一致。
- 实体统一用对象池 `ObjectPool` 管理：用 `pool.get()` 取出并 `init()`，回收时设 `this.active = false`（例如越界或生命结束），不要 `new` 临时对象，也不要从数组里删除元素。
- 新增一种实体时，除了新建对应的 `ObjectPool`，还要把它加进 `initGame()` 的 `clear()`、主循环的 `update` 和 `draw`，漏掉任何一处都会导致实体不动、不显示或重开后残留。
- 输入统一使用 PointerEvent（`pointerdown` / `pointermove` / `pointerup` / `pointerleave`），不要另加 `mousemove` 或 `touch*` 监听。
- 碰撞检测沿用现有的 `checkCollision`（AABB），不要另写一套。
- 沿用现有的命名和代码风格，新代码放在相关的现有函数或类附近。

## 改动原则（最重要）

本项目最在意的是**改动小、范围准、容易审核**。

1. **只做 issue 要求的事。** 发现其他问题，写进 PR 描述的"顺带发现"里，不要顺手修。
2. **优先最简单的改法。** 能改一行就不改十行；能改现有函数就不新建抽象、工具函数或配置项。
3. **不做防御性扩展。** 不为"将来可能需要"添加参数、开关、兼容分支或额外的错误处理。
4. **改动预算。** 默认一个任务最多改 2 个文件、净增不超过 50 行。超出时先停下来，在 issue 里说明原因和方案，等确认后再继续。
5. **不改无关内容。** 不做顺手的格式化、重命名、重排、注释清理，也不改 `REQUIREMENTS.md`、`TECHNICAL_DESIGN.md`、`feature_list.json`、`claude-progress.txt`、`init.sh`，除非 issue 明确要求。

## 遇到这些情况，先停下来问

- 需求不清楚，或者有两种以上合理的理解
- 改法需要重构、调整架构，或者改动超出预算
- 需要新增文件、依赖、素材或 CI 配置
- 发现 issue 描述的问题其实不存在，或者原因和描述不一致

提问方式：在 issue 里留言，列出你的理解和备选方案，**不要先提一个大 PR 再让人删减**。

## 角色说明

按你这次的角色，完整读对应文件并遵守：

- 实现者（写代码、提交 PR）：`.github/agents/implementer.agent.md`
- 审核者（审核 PR）：`.github/agents/reviewer.agent.md`
