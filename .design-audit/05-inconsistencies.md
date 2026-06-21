# 05 - 不一致性分析

> AI 手动分析。标识语义上近似的值差异 + 改造方案

---

## 🔴 高严重度

### 1. 品牌绿色冲突 — 3 种不同的"主绿"

| 值 | 位置 | 语义用途 |
|----|------|---------|
| `#10A37F` | 侧边栏选中项左边线 (main.css) | 选中/激活指示器 |
| `#25b39e` / `#25B39E` | SVG 图标 (refresh.vue, jseditor.vue) | 品牌图标色 |
| `#22c55e` | 剪贴板标签激活/高亮/置顶 (ClipboardView) | 激活/高亮 |
| `#2080f0` | 各处按钮/拖拽轮廓 (多组件) | 主操作色(蓝) |

**问题**: 项目没有统一的品牌色。侧栏用绿、图标用另一种绿、按钮用蓝、剪贴板用第三种绿。

**建议**: 统一为单一 brand primary。选择 `#10A37F` (已有语义) 或 `#2080f0` (Naive UI 默认) 作为主色。

### 2. 灰色层级混乱

| 值 | 语义用途 | 文件数 |
|----|---------|--------|
| `#333` | 文字色(GroupIcon) / 按钮色(loading) | 2 |
| `#666` | 标签文字(AiItem) / 赞助文字(SetView) | 2 |
| `#888` | 提示文字 / 空数据 / 标签未选中 / hint | 7+ |
| `#999` | 时间戳 / 删除按钮 / 空状态 | 3 |
| `#aaa` | 版本号 / 作者 (PluginMarket) | 1 |
| `#ccc` | 上传区边框 | 1 |

**问题**: 相同语义(次要文字/提示文字/占位)使用了不同色值。

**建议**: 定义标准文字层级:
- Primary: `var(--color-text)` 
- Secondary: `#666`
- Tertiary/Hint: `#999`
- Disabled: `#bbb` / `#ccc`

---

## 🟡 中严重度

### 3. Naive UI 按钮色硬编码

4 个组件(GroupDrawer, NewDrawer, JsEditorDrawer, GroupView, ListView) 中直接使用 `color="#2080f0"` 和 `color="#888"` 作为按钮 prop。

**建议**: 使用 Naive UI 的 `type="primary"` 或通过 `n-config-provider` 的 `themeOverrides` 统一管理。

### 4. 间距无网格

major 间距值 5px, 10px, 15px, 30px, 50px 均不是 4 的倍数。1rem=15px 也不在 4px 网格上。

**建议**: 基准改为 `font-size: 16px` 并建立 4px 间距系统。

### 5. 圆角无层级

| 文件 | 圆角值 | 元素类型 |
|------|--------|---------|
| loading.html | 4px | .reload-btn |
| ImageUpload | 8px | 上传区/预览 |
| ClipboardView | 8px | 卡片 |
| main.css | 10px | 滚动条 |

**建议**: 定义 `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`。

### 6. 阴影无层级

3 种不同的 box-shadow 各处分散。

**建议**: 定义 `--shadow-sm`, `--shadow-md`, `--shadow-lg`。

---

## 🟢 低严重度

### 7. SVG 图标的固定填充色

`refresh.vue` 和 `jseditor.vue` 使用了固定的 `#25b39e` 填充色，不是 `currentColor`。

**建议**: 改为 `fill="currentColor"`，由父级通过 color 控制。

### 8. `--color-border-hover` 暗色模式自引用 bug

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-border-hover: var(--color-border-hover); /* 自引用！ */
  }
}
```

**建议**: 暗色模式应赋值为 `var(--vt-c-divider-dark-1)` 或其他适当值。

### 9. 两套独立的 CSS 变量系统

| 系统 | 文件 | 作用域 |
|------|------|--------|
| Vue 设置页 | base.css + main.css | gui/setting/ (Vue SPA) |
| 新标签页 | transfer.css | gui/transfer.html |
| 侧边栏 | main.css (static) | gui/index.html |

三者之间**无共享变量**，主题切换需各自维护。

**建议**: 将 CSS 变量移到 Electron 层面注入，或各页面引入同一套 token CSS。
