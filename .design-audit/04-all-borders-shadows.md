# 04 - 所有边框/圆角/阴影值

---

## Border Width

| 值 | 位置 | 次数 | 用途 |
|----|------|------|------|
| 1px | 全局通用 `var(--new-color-border)` / `var(--color-border)` | 大量 | 标准边框 |
| 1px dashed | GroupItem .title border-bottom | 1 | 分组标题分割 |
| 2px dashed | ImageUpload .default-image | 1 | 上传区虚线框 |
| 2px solid | ImageUpload .preview-image | 1 | 预览图边框 |
| 2px transparent | ClipboardView .tab-item border-bottom | 1 | 激活指示器(透明默认) |
| 2px dashed | ListView .sortable-ghost outline | 1 | 拖拽幽灵轮廓 |
| 3px solid | main.css #left border-right | 1 | 侧栏右边界 |
| 3px solid | main.css .highlighted border-left | 1 | 选中项左标记 |
| 3px solid | ClipboardView .text-card.pinned border-left | 1 | 置顶卡片左标记 |
| 5px solid | loading.html .loader border | 1 | 加载转圈 |

## Border Radius

| 值 | 位置 | 次数 | 用途 |
|----|------|------|------|
| 4px | loading.html .reload-btn | 1 | 按钮圆角 |
| 8px | ImageUpload .default-image / .preview-image | 2 | 上传区/预览图 |
| 8px | ClipboardView .text-card | 1 | 卡片圆角 |
| 8px | ListView .sortable-* | 2 | 拖拽排序 |
| 10px | main.css ::-webkit-scrollbar 系列 | 2 | 滚动条圆角 |
| 50% | main.css / loading / transfer css 中 .logo>span / loader | 多处 | 圆形 |

## Box-shadow

| 值 | 位置 | 行 | 用途 |
|----|------|----|------|
| `5px 0 5px -2px rgba(0,0,0,0.3)` | #left (main.css) | 21 | 侧边栏阴影 |
| `0 6px 20px rgba(0,0,0,0.09)` | .text-card:hover (ClipboardView) | 349 | 剪贴板卡片悬停 |
| `0 0 2px var(--color-text)` | .jseditor>span:hover (LinkItem) | 217 | 图标 hover |
| `0 8px 24px rgba(0,0,0,0.18)` | .sortable-chosen (ListView) | 220 | 拖拽选中抬高 |

## 一致性问题

1. **圆角混乱**: 4px (loading), 8px (cards/upload), 10px (scrollbar) — 无统一圆角层级
2. **阴影无层级**: 3 种不同阴影值，无统一的 `--shadow-sm` / `--shadow-md` / `--shadow-lg` token
3. **边线标记**: 选中态用了 3 种不同方式(左侧3px实线/底部2px实线/高亮背景)
