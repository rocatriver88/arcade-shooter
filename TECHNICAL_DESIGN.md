# 《星际突击》 (Star Assault) - 技术设计文档 (TDD)

## 1. 架构总览 (Architecture Overview)

本项目采用轻量级的原生前端技术栈栈（Vanilla JS + HTML5 Canvas + CSS3），放弃了庞大的游戏引擎（如 Phaser 或 Pixi.js），从而保证极小的体积和原生的性能体验。

- **`index.html`**: 承载 DOM 结构，包含用于渲染的 `<canvas>` 层和用于展示 UI 文字（分数、生命值、菜单）的绝对定位 `<div>` 叠加层。
- **`style.css`**: 负责所有的 UI 美化、位置计算、以及非游戏内的动态效果（如发光按钮的 Hover 动效）。
- **`game.js`**: 核心逻辑脚本，负责主循环、状态机、实体类以及渲染逻辑。

---

## 2. 核心系统模块 (Core Systems)

### 2.1 游戏主循环 (Game Loop)
通过浏览器的 `window.requestAnimationFrame` 驱动。
* **deltaTime 机制**：每次循环计算当前时间戳 `timestamp` 与上一次 `lastTime` 的差值。所有实体的运动距离均乘以 `deltaTime / 1000`，确保物理运算在不同刷新率的屏幕上表现出一致的真实速度 (px/s)。
* **分离机制**：主循环被切分为两个核心职责：
  1. `update(deltaTime)`: 处理所有的逻辑位置更新、状态检查和碰撞判定。
  2. `render()`: 处理 Canvas 画布的清空与最终绘制 `ctx.draw()`。

### 2.2 实体生命周期管理 (Entity Manager)
游戏内存在多组逻辑池（对应多个 Array）：
`bullets`, `enemies`, `particles`, `items`, `bosses`, `enemyBullets`
* **统一销毁**：所有实体类均实现 `markedForDeletion` 布尔值。当实体飞出屏幕、生命周期归零或发生碰撞时，此值设为 `true`。
* **垃圾回收**：在每一帧的 `update` 结尾，通过 `Array.prototype.filter(obj => !obj.markedForDeletion)` 统一回收废弃对象。这种做法避免了循环遍历中的下标错位问题。

### 2.3 跨平台输入追踪 (Input Handling)
为了同时兼容 PC 和 移动端，放弃了传统的 `mousemove` / `touchstart`，而是采用了统一的 `PointerEvent` 规范：
* **事件绑定**：监听 Canvas 的 `pointermove`, `pointerdown`, `pointerup`, `pointerleave`。
* **矩阵缩放映射**：由于 Canvas 的 CSS 物理大小与其实际内部像素大小（`canvas.width`）可能不同，在获取光标 `clientX` 时，系统会通过 `getBoundingClientRect()` 计算真实的缩放比 (Scale Multiplier)，从而获得精确的游戏内映射坐标 `mouseX` 和 `mouseY`。

### 2.4 AABB 碰撞检测 (Collision System)
所有的碰撞（包括对于子弹这种类圆形实体）为了最高效的 O(n) 检测性能，均统一抽象为 `AABB`（Axis-Aligned Bounding Box，轴对齐边界框）包围盒检测。
```javascript
function checkCollision(obj1, obj2) {
    // 处理坐标、宽度、高度...
    return (
        x1 < x2 + w2 &&
        x1 + w1 > x2 &&
        y1 < y2 + h2 &&
        y1 + h1 > y2
    );
}
```
当同屏对象过多时，碰撞是 $O(N \times M)$ 的（如子弹 N，敌人 M）。但对于目前的轻量级数据量，直接双重遍历 `forEach` 完全可以稳定在 60fps。

---

## 3. 类定义设计 (Class Definitions)

### 3.1 主控对象：`Player`
* **核心属性**：`x`, `y`, `width`, `height`, `lives`, `weaponLevel`, `cooldown`, `lastShotTime`。
* **无敌时间**：使用倒计时 `invulnerableTimer`。在 `draw` 方法中通过 `performance.now() % 100` 的余数配合 `return` 跳过绘制帧，实现经典街机的“受伤闪烁”特效。
* **Lerp 跟随**：通过对目标坐标（转换为自机中心点）进行 `Math.max` 和 `Math.min` 的边界切断 (Clamp)，使其不能脱离 Canvas 视口。

### 3.2 自治敌人：`Enemy`
* **正弦波运动 (Sinewave Drift)**：抛弃单一的垂直下落。通过内置 `angle`, `angleSpeed`, `curve` 属性，在 `update` 时使用 `Math.sin(this.angle) * this.curve` 修改 X 轴向量，形成左右摇摆的动态轨迹。

### 3.3 首领对象：`Boss`
* **状态机设计 (State Machine)**：属性 `state` 拥有 `entering` 和 `moving`。进入 `entering` 时只允许纵向位移；达到指定 Y 值后切入 `moving`，开始横向逻辑和攻击行为。
* **数学弹幕 (Math-driven Bullet Spread)**：攻击时，计算两端极限弧度 (`Math.PI / 4` ~ `Math.PI * 3 / 4`)。通过步长划分，使用三角函数 `vx = Math.cos(angle) * speed` 与 `vy = Math.sin(angle) * speed`，向环境抛出扇形的 `EnemyBullet` 实体。

### 3.4 粒子系统：`Particle`
* **透明度生命周期**：初生时 `life = 1.0`。每帧减去基于随机数的 `decay`（衰减率）。
* **渲染保护**：调用 `ctx.globalAlpha = this.life` 渲染透明度后，系统强制将其置回 `1.0`，以防止粒子透明度溢出污染其他正常的 UI 实体的渲染栈。

---

## 4. 阶段与状态管理 (Progression & Game State)

### 4.1 核心全局变量
* `gameState`: 字符串枚举 (`START`, `PLAYING`, `GAMEOVER`)。阻塞和隔离生命周期的渲染分支。
* `currentLevel`: 追踪当前关卡。
* `enemiesKilledThisLevel`: 用于 Boss 触发的阈值。
* `bossActive`: 布尔锁。当为 `true` 时，阻断通过 `enemySpawnTimer` 的常规敌机生成流。

---

## 5. 性能与后续优化建议 (Future Optimizations)

当前系统使用 Vanilla JS 已经高度轻量且能在大多数设备保持 60帧渲染。但若要进一步提升规模（例如同屏 500+ 子弹级弹幕），可考虑：
1. **真实的对象池模型 (True Object Pooling)**：不使用 `Array.prototype.filter` 去触发 V8 引擎的垃圾回收 (GC)，而是维护一个固定长度数组，利用索引重写状态以避免内存抖动。
2. **四叉树计算 (QuadTree)**：引入四叉树空间划分，替代现有的碰撞检测两两遍历 $O(N \times M)$，极大削减 CPU 校验压力。
3. **离屏画布缓存 (Off-screen Canvas Cache)**：如果后续 Boss 结构和纹理极其庞大且包含静态组合件，可通过新建隐藏 Canvas 将其静态纹理绘制并调用，避免每帧执行过多的 `ctx.lineTo`, `ctx.arc` 等高开销路径指令。
