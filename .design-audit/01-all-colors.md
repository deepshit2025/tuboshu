# 01 - 所有颜色值

> 按分类 + 频率排列。包括 CSS 变量定义、硬编码 hex/rgb/hsla、SVG fill。

---

## 1. 主题系统色 (CSS Variables — base.css)

| 变量名 | 值(亮色) | 值(暗色) | 用途 | 出现次数 |
|--------|---------|---------|------|---------|
| --vt-c-white | `#ffffff` | - | 白色 | 1 |
| --vt-c-white-soft | `#f8f8f8` | - | 浅灰背景 | 1 |
| --vt-c-white-mute | `#f2f2f2` | - | 更浅灰背景 | 1 |
| --vt-c-black | `#181818` | - | 黑色 | 1 |
| --vt-c-black-soft | `#222222` | - | 深色背景(软) | 1 |
| --vt-c-black-mute | `#282828` | - | 深色背景(哑) | 1 |
| --vt-c-indigo | `#2c3e50` | - | 深蓝(文字) | 1 |
| --vt-new-border | `#e7e7e7` | - | 边框 | 1 |
| --color-background | var(--vt-c-white) | var(--vt-c-black) | 页面背景 | 全局 |
| --color-background-soft | var(--vt-c-white-soft) | var(--vt-c-black-soft) | 标题栏背景 | 全局 |
| --color-background-mute | var(--vt-c-white-mute) | var(--vt-c-black-mute) | hover/工具条 | 全局 |
| --new-color-border | var(--vt-new-border) | var(--vt-c-divider-dark-2) | 边框主色 | 全局 |
| --color-border | rgba(60,60,60,0.12) | rgba(84,84,84,0.48) | 次要边框 | 全局 |
| --color-border-hover | rgba(60,60,60,0.29) | (自引用 bug) | hover边框 | 全局 |

## 2. 侧边栏 (static/css/main.css)

| 值 | 位置 | 行 | 上下文 |
|----|------|----|--------|
| `#f1f1f1` | #left background | 20 | 侧边栏背景(亮色) |
| `#fefefe` | #right background | 42 | 内容区背景(亮色) |
| `#eee` | .logo>span background | 64 | 图标圆形背景 |
| `#d1d1d1` | .logo:hover background | 76 | 图标hover背景(亮) |
| `#10A37F` | .highlighted .logo border-left | 81 | 选中项左侧边线(绿) |
| `white` | .highlighted .logo background | 82 | 选中项背景(亮) |
| `#111` | #left (dark mode) background | 93 | 侧边栏背景(暗) |
| `#333` | .logo:hover (dark mode) background | 97 | 图标hover(暗) |
| `#232327` | .highlighted .logo (dark) background | 103 | 选中项背景(暗) |
| `rgba(0,0,0,0.3)` | #left box-shadow | 21 | 侧边栏阴影 |

## 3. 新标签页 (static/css/transfer.css)

| 值 | CSS 变量 | 在哪个主题 | 用途 |
|----|----------|-----------|------|
| `#ffffff` | --bg-color | 亮色 | 页面背景 |
| `#000000` | --text-color | 亮色 | 文字色 |
| `#f0f0f0` | --icon-bg | 亮色 | 图标背景 |
| `#e8e8e8` | --icon-item-bg | 亮色 | 图标项hover背景 |
| `#1D1D1D` | --bg-color | 暗色 | 页面背景 |
| `#e0e0e0` | --text-color | 暗色 | 文字色 |
| `#333333` | --icon-bg | 暗色 | 图标背景 |
| `#555` | --icon-item-bg | 暗色 | 图标项hover背景 |

## 4. 加载页 (loading.html)

| 值 | 选择器/属性 | 行 | 用途 |
|----|------------|----|------|
| `#f3f3f3` | .loader border | 14 | 转圈边框 |
| `#3498db` | .loader border-top | 15 | 转圈动效(蓝) |
| `red` | .error color | 27 | 错误文字 |
| `#181818` | .reload color | 31 | 重新加载文字 |
| `#f0f0f0` | .reload-btn background | 38 | 按钮背景 |
| `#333` | .reload-btn color | 39 | 按钮文字 |
| `#ccc` | .reload-btn border | 40 | 按钮边框 |
| `#e5e5e5` | .reload-btn:hover | 47 | 按钮hover |
| `#d9d9d9` | .reload-btn:active | 52 | 按钮active |
| `#1a1a1a` | body (dark) background | 56 | 暗色加载页背景 |

## 5. Vue 组件中硬编码颜色

| 值 | 组件 | 文件:行 | 上下文 |
|----|------|---------|--------|
| `#333` | GroupIcon | GroupIcon.vue:36 | .name 标签文字色 |
| `#666` | AiItem | AiItem.vue:39 | .name 标签文字色 |
| `#888` | GroupDrawer | GroupDrawer.vue:105 | `<p>` 提示文字 |
| `#888` | NewDrawer | NewDrawer.vue:65 | `<p>` 提示文字 |
| `#888` | SetView | SetView.vue:369 | 赞助文字 |
| `#888` | GroupView | GroupView.vue:79 | "没有分组数据" |
| `#888` | PluginMarket | PluginMarketView.vue:156/158 | .plugin-desc |
| `#888` | ClipboardView | ClipboardView.vue:289 | .toolbar-hint |
| `#888` | ClipboardView | ClipboardView.vue:310 | .tab-item 未选中 |
| `#999` | ClipboardView | ClipboardView.vue:374/399 | .card-time, .btn-delete |
| `#ccc` | ImageUpload | ImageUpload.vue:67 | .default-image border |
| `#409eff` | ImageUpload | ImageUpload.vue:73 | .default-image:hover border |
| `#aaa` | PluginMarket | PluginMarketView.vue:152/172 | .plugin-version / .plugin-author |
| `#22c55e` | ClipboardView | ClipboardView.vue:320/387/351/425 | tab激活下划线, pinned边框, highlight文字, 置顶图标 |
| `rgba(34,197,94,0.03)` | ClipboardView | ClipboardView.vue:352 | .text-card.pinned bg |
| `#e88080` | ClipboardView | ClipboardView.vue:401 | .btn-delete:hover color |
| `#f59e0b` | ClipboardView | ClipboardView.vue:421 | 收藏图标 active |
| `rgba(0,0,0,0.09)` | ClipboardView | ClipboardView.vue:349 | .text-card:hover shadow |
| `rgba(0,0,0,0.18)` | ListView | ListView.vue:220 | .sortable-chosen shadow |
| `rgba(32,128,240,0.06)` | ListView | ListView.vue:218 | .sortable-ghost bg |

## 6. Naive UI 按钮色 (直接 prop 传入)

| 值 | 组件 | 文件 | 行 | 上下文 |
|----|------|------|----|--------|
| `#2080f0` | n-button | GroupDrawer.vue:120 | 保存按钮 |
| `#2080f0` | n-button | NewDrawer.vue:83 | 保存按钮 |
| `#2080f0` | n-button | JsEditorDrawer.vue:60 | 保存按钮 |
| `#2080f0` | n-button | GroupView.vue:66 | 添加分组按钮 |
| `#2080f0` | n-button | ListView.vue:141 | 新增站点按钮 |
| `#2080f0` | (sortable-ghost) | ListView.vue:215 | 拖拽幽灵轮廓 |
| `#888` | n-button | GroupDrawer.vue:113 | 取消按钮 |
| `#888` | n-button | NewDrawer.vue:76 | 取消按钮 |
| `#888` | n-button | JsEditorDrawer.vue:53 | 取消按钮 |
| `#fff` | n-icon | (多处) | 图标颜色(白色) |

## 7. SVG Icons 内硬编码颜色

| 值 | 图标 | 文件 | 上下文 |
|----|------|------|--------|
| `#25b39e` | refresh | refresh.vue:15 | 旋转图标主色 |
| `#25B39E` | jseditor | jseditor.vue:2,3 | 编辑器图标主色 |
| `#E9EDED` | jseditor | jseditor.vue:1,4 | 编辑器图标浅色部分 |

## 8. 其他硬编码色

| 值 | 位置 | 上下文 |
|----|------|--------|
| `hsla(160,100%,37%,1)` | main.css:16 | 链接/`.green` 色 |

## 分析摘要

- **3 种"绿色"品牌色冲突**: #10A37F (sidebar), #25b39e (icons), #22c55e (clipboard)
- **3 种灰色层级混淆**: #666 / #888 / #999 在不同组件中混用
- **Naive UI 默认主题色 #2080f0** 被大量硬编码，未通过 CSS 变量管理
- **SVG 图标** 使用了非 currentColor 的固定填充色 (#25b39e, #E9EDED)
