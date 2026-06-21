# 02 - 所有字体/排版值

> 包括 font-family, font-size, font-weight, line-height

---

## Font Family

| 值 | 文件 | 上下文 |
|----|------|--------|
| `PingFang SC, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Helvetica, Arial, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Source Han Sans CN, sans-serif` | base.css body / main.css body / transfer.css body | **所有页面共用** 同一字体栈 |
| `Arial, sans-serif` | loading.html .reload-btn | 加载页按钮 |

**一致性问题**: 字体栈完全统一，无问题。

## Font Size

| 值 | 出现位置 | 用途 | 频率 |
|----|---------|------|------|
| 15px | base.css body | 基础正文 | 1 |
| 18px | loading.html .reload | 加载提示 | 1 |
| 14px | loading.html .reload-btn / transfer.css .icon-label / LinkItem / ShortcutView / GroupItem / ClipboardView | 按钮/标签/列表 | 多处 |
| 12px | GroupIcon / AiItem / SetView (switch) / ClipboardView (time) / PluginMarket (version) | 小号文字 | 多处 |
| 13px | ClipboardView(.tab-item) / PluginMarket(.plugin-desc) | 标签/描述 | 2 |
| 10px | GroupItem (switch inline style) | 开关文字 | 1 |
| 20px | (via Naive UI n-icon size prop) | SVG 图标 | 多处 |
| 22px | (via Naive UI n-icon size prop) | SVG 图标 | 1 |
| 30px | (via Naive UI n-icon size prop) | SVG 图标 | 多处 |

**不一致**: 
- 基础正文 15px 但组件中大量使用 14px 作为列表文本，缺少明确的比例关系
- 12px/13px 混用（在 ClipboardView 和 PluginMarketView 中）

## Font Weight

| 值 | 出现位置 | 用途 | 
|----|---------|------|
| normal (400) | body | 基础 |
| bold (700) | GroupItem .tag_name / .name / ClipboardView .tab-item.active / ListView().plugin-name | 标题/标签 |
| 600 | PluginMarketView .plugin-name | 插件名称 |

## Line Height

| 值 | 文件 | 上下文 |
|----|------|--------|
| 1.6 | base.css body | 基础行高 |
| 1.5 | main.css #left / ClipboardView .card-body | 侧栏/卡片 |
| 1 | ShortItem / drag-handle | 图标行高 |
