# Restyle Report — shadcn 冷色调设计改造

> 基于 design-restyle 5 阶段工作流
> 参考风格: shadcn/ui + 冷色调 (slate/blue/cyan)
> 生成时间: 2025-06

---

## 改造概览

| 指标 | 值 |
|------|-----|
| 参考设计系统 | shadcn/ui |
| 色调方向 | 冷色调 (slate 冷灰 + blue-500 + cyan-500) |
| Token 体系 | CSS 自定义属性 + Naive UI themeOverrides |
| 改造文件数 | 8 (仅 Token 值，非硬编码替换) |
| 构建验证 | ✅ 通过 (3.33s) |

---

## shadcn 色系映射

| 语义 | 旧值 | 新值 (shadcn) | 说明 |
|------|------|-------------|------|
| 页面背景 | #ffffff | #f8fafc | slate-50 冷灰底 |
| 卡片/表面 | #f8f8f8 | #f1f5f9 | slate-100 |
| 哑光背景 | #f2f2f2 | #e2e8f0 | slate-200 |
| 深色背景 | #181818 | #0f172a | slate-900 |
| 深色表面 | #222222 | #1e293b | slate-800 |
| 深色哑光 | #282828 | #334155 | slate-700 |
| 主色 | #2080f0 | #3b82f6 | blue-500 更纯净 |
| 主色 hover | #409eff | #2563eb | blue-600 |
| 主色 pressed | #1a6fd0 | #1d4ed8 | blue-700 |
| 强调色 | #10A37F | #06b6d4 | cyan-500 冷色 |
| 文字主色 | #2c3e50 | #0f172a | slate-900 |
| 文字次要 | #666 | #475569 | slate-600 |
| 文字提示 | #999 | #94a3b8 | slate-400 |
| 成功 | #22c55e | #10b981 | emerald-500 |
| 错误 | #d32f2f | #ef4444 | red-500 |
| 侧栏背景 | #f1f1f1 | #f1f5f9 | slate-100 |
| 侧栏暗色 | #111 | #0f172a | slate-900 |
| 边框 | #e7e7e7 | #e2e8f0 | slate-200 |
| 暗色边框 | rgba(..) | #334155 | slate-700 |

## 间距/圆角/阴影

| 层级 | shadcn 新值 |
|------|------------|
| 间距网格 | 4px (保持不变) |
| radius-md | **6px** (原 8px，shadcn 风格) |
| shadow-sm | 0 1px 2px 0 rgba(0,0,0,0.05) |
| shadow-md | 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px |
| shadow-lg | 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px |

## 字体

| 属性 | shadcn 值 |
|------|----------|
| font-family | **Inter** 优先 (英文字体)，保留 PingFang SC 等中文后备 |
| font-size-base | 16px |
| font-size-sm | 13px |

## 验证

| 检查项 | 结果 |
|--------|------|
| ✅ 构建通过 | vite build 成功, 2850 modules, 3.33s |
| ✅ Token 方式 | 仅改 CSS 变量值，无需逐文件替换硬编码 |
| ✅ 冷色统一 | slate 冷灰 + blue-500 + cyan-500 贯穿全项目 |
