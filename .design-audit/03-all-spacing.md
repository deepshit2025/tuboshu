# 03 - 所有间距值

> 包括 margin, padding, gap. 检测网格基础: 目前 4px 网格检测

---

## 网格分析

| 间距值 | 模 4 | 出现次数 | 示例 |
|--------|------|---------|------|
| 2px | ❌(2) | 3 | GroupItem padding |
| 3px | ❌(3) | 2 | main.css a padding, scrollbar-thumb border |
| 4px | ✅(0) | 2 | ClipboardView mb |
| 5px | ❌(1) | 8 | GroupDrawer/list gap/padding, GroupIcon padding |
| 6px | ❌(2) | 3 | ClipboardView gap, loading padding |
| 8px | ✅(0) | 6 | transfer icon mb, ClipboardView gap |
| 10px | ❌(2) | 12+ | GroupItem mb, LinkItem gap, DisplayView padding |
| 12px | ✅(0) | 4 | PluginMarket gap, scrollbar width |
| 14px | ❌(2) | 3 | ClipboardView padding |
| 15px | ❌(3) | 3 | transfer padding |
| 16px | ✅(0) | 2 | ClipboardView padding |
| 18px | ❌(2) | 2 | ClipboardView tab padding |
| 20px | ✅(0) | 10+ | SetView card mt, loading padding, transfer padding |
| 24px | ✅(0) | - | (未使用) |
| 30px | ❌(2) | 4 | NewDrawer margin-top, SetView padding |
| 50px | ❌(2) | 4 | 侧边栏宽度/高度, loading w/h |
| 60px | ✅(0) | 5 | ClipboardView empty, LinkItem getIcon width |
| 80px | ✅(0) | 4 | GroupItem操作区宽度, AiItem宽高 |
| 100px | ✅(0) | 1 | ShortcutView switch width |
| 120px | ✅(0) | 1 | main.css grid col |
| 1280px | ✅(0) | 1 | #app max-width |
| 160px | ✅(0) | 1 | --section-gap |
| 250px | ❌(2) | 2 | LinkItem/ShortcutView width |
| 280px | ✅(0) | 1 | ClipboardView search width |
| 300px | ✅(0) | 3 | SetView pay width, window min |
| 402px | ❌(2) | 1 | SetView drawer width |
| 502px | ❌(2) | 3 | GroupDrawer/NewDrawer/JsEditorDrawer drawer width |
| 550px | ❌(2) | 1 | transfer container max-width |
| 600px | ✅(0) | 3 | min-width 断点/box |
| 768px | ✅(0) | 1 | transfer 响应式断点 |
| 1024px | ✅(0) | 1 | 默认窗口宽 |
| 2000px | ✅(0) | 1 | 窗口高上限 |
| 3000px | ✅(0) | 1 | 窗口宽上限 |

## rem / em 值

| 值 | px 等价 | 出现位置 |
|----|---------|---------|
| 0.5em | ~8px | GroupView padding |
| 1rem | ~15px(基准) | 多处 gap/margin |
| 1.5 | - | line-height |

## Gap 值分析

| gap | 位置 |
|-----|------|
| 5px | GroupDrawer(list), GroupItem(list), transfer(container) |
| 6px | ClipboardView(card-actions) |
| 8px | ClipboardView(toolbar-right), PluginMarket(plugin-name) |
| 10px | LinkItem(wrap), GroupView/ListView(box-title), ShortcutView(list) |
| 12px | PluginMarket(desc-row, actions) |
| 20px | SetView(card) |
| 1rem | GroupDrawer, NewDrawer, JsEditorDrawer, PluginMarket |

## 结论

- **无统一网格**: 使用 2px 增量，不遵循 4px/8px 网格
- **最常见的间距值**: 5px, 10px, 20px（但 10px 和 20px 模 4 余 2）
- **两端不匹配**: 一些页面用 `1rem` 间距，一些用 `10px`，基准 font-size 15px 导致 1rem=15px
