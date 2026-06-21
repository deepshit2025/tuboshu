# Design Audit: Tuboshu (土拨鼠) v3.0.0

> 自动生成时间: 2025-06 (手动审计)
> 审计路径: `/gui/` — 前端文件（settings UI + sidebar + new tab page）

## 扫描概览

| 指标 | 值 |
|------|-----|
| 扫描文件数 | 35+ |
| 唯一颜色值 | 43 |
| 唯一字体大小 | 7 个 distinct values |
| 唯一间距值 (px/rem) | 25+ |
| 边框/圆角/阴影值 | 15+ |
| CSS 变量系统 | 有（部分） |
| 框架 | Vue 3.4 + Naive UI 2.38 |

## 主要发现问题

| # | 问题 | 严重度 | 影响文件数 |
|---|------|--------|-----------|
| 1 | **颜色系统不统一**: 有两套几乎隔离的颜色体系（base.css CSS vars / static CSS）| high | 10+ |
| 2 | **重复#888/#999色值**: 同时代表次要文本和占位提示 | medium | 6 |
| 3 | **无统一间距系统**: px/rem 混合使用，无网格基础 | medium | 全部 |
| 4 | **Naive UI 覆盖不及时**: 直接使用 `color="#2080f0"` 作为按钮色，而不是用 CSS vars | medium | 4 |
| 5 | **品牌色冲突**: #10A37F (sidebar) vs #25B39E (icons) vs #22c55e (剪贴板) 三种不同的"绿色" | high | 6 |
| 6 | **硬编码色**: 多个 Vue 组件直接写 `color:#888` / `color:#666` / `color:#333` | medium | 8 |
| 7 | **无主题token映射**: 暗色模式靠 CSS `@media` 手写覆盖 | low | 3 |

## 推荐下一步

1. 建立统一 Token 系统（见 `06-value-map.json` + `synthesis-recommendations.yaml`）
2. 用 CSS 自定义属性替换所有硬编码色值
3. 统一间距为 4px 网格
4. 统一品牌色为单一主色
