---
name: design-sense
description: Scan frontend projects to extract design system info, then create consistent pages/layouts
---

---
name: design-sense
description: "Design-aware frontend development. Scan a project's source to extract design system info (component libs, CSS, tokens, page patterns, components, conventions), then use that knowledge to create new pages or modify layouts with guaranteed consistency."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [design-system, frontend, scanning, page-creation, layout, code-generation]
    related_skills: [design-audit, design-restyle]
---

# Design Sense

## Overview

Design Sense does two things in one workflow:

1. **Scan** — reads a frontend project's source code and extracts its design system into `.design-system/` reference files
2. **Build** — uses those references to create new pages or modify existing layouts, ensuring visual and structural consistency

```
用户说"扫描项目"  →  加载此 skill  →  跑脚本 →  输出 .design-system/
用户说"建新页面"  →  加载此 skill  →  检查更新 →  读参考 →  出代码
```

**Pipeline context:** design-sense is the *first step* of a three-skill pipeline for frontend style work:

| Step | Skill | Output | Purpose |
|------|-------|--------|---------|
| 1 | `design-sense` | `.design-system/` | Framework/component/token context |
| 2 | `design-audit` | `.design-audit/` | All hardcoded values + inconsistencies |
| 3 | `design-restyle` | Restyled code | Apply systematic token-based changes |

For **new pages** → just design-sense (scan → build).
For **existing project restyling** → design-sense → design-audit → design-restyle (full pipeline).

## When to Use

- Before creating new pages or modifying existing layouts
- Onboarding to a new codebase
- Auditing design consistency
- Regenerating docs after dependency/style updates

**Do NOT use for:**
- Pure backend tasks (API, database, service layer)
- Visual/creative design without code output

---

# Part 1: Scan

## How Scan Works

**Primary mode** — automated script. When the user asks to scan, **immediately run it** via terminal.

**Script path:** `skills/design-sense/scripts/scan-design-system.py` (relative to the skills repo root)

```bash
python3 skills/design-sense/scripts/scan-design-system.py <project-path>
```

### Scan Execution Flow

1. Ask for project path if not known
2. Run: `python3 skills/design-sense/scripts/scan-design-system.py <project-path>`
   - First time: no flags (full scan)
   - Later: always use `--update` (checks git HEAD, exits instantly if unchanged)
3. Read `.design-system/.scan-state.json` to confirm scan recorded
4. Read `.design-system/README.md` to verify output
5. Report summary to user

### Fallback: Manual Scan

Only when the script is unavailable. Use terminal/search_files/read_file:

1. Read `package.json` → UI libs + version
2. Read config files (tailwind.config, postcss, next.config) → CSS strategy
3. Glob CSS vars / SCSS vars / token files
4. Scan routes → page list + patterns
5. Scan components/ → inventory
6. Read tsconfig/eslint/prettier → conventions
7. Write all to `.design-system/*.md`

### Script Output

```
<project-root>/.design-system/
├── README.md                       # Overview
├── 01-component-libraries.md       # UI framework + component library
├── 02-css-strategy.md              # CSS approach + preprocessor + utilities
├── 03-design-tokens.md             # Colors, typography, spacing, shadows, radii
├── 04-page-patterns.md             # Routes → components, layout skeletons
├── 05-component-inventory.md       # Reusable components + props + import paths
├── 06-code-conventions.md          # Style guide
└── .scan-state.json                # Git HEAD for --update checks
```

### Script Flags

| Flag | Description |
|------|-------------|
| `--update` / `-u` | Incremental: only re-scan if git HEAD changed or files modified |
| `--verbose` / `-v` | Print detailed progress per step |
| `--output-dir NAME` | Custom output directory (default: `.design-system`) |

---

# Part 2: Build

## Prerequisites

Project must have `.design-system/` directory (from scan above).

**If it doesn't exist:** load this skill's Scan mode and run it automatically.

## Build Workflow

### Step 1: Check Freshness + Load References

```bash
python3 skills/design-sense/scripts/scan-design-system.py <project-path>
```

This exits instantly if up to date, or re-scans if needed. Then read:

| File | Purpose |
|------|---------|
| `01-component-libraries.md` | Available UI components + import paths |
| `02-css-strategy.md` | CSS approach (Tailwind / CSS Modules / Styled) |
| `03-design-tokens.md` | Colors, spacing, typography, shadows, radii |
| `04-page-patterns.md` | Existing pages + layout patterns + skeletons |
| `05-component-inventory.md` | Custom components + import paths + props |
| `06-code-conventions.md` | Quotes, semicolons, exports, naming |

### Step 2: Classify Request

| User says | Page Type |
|-----------|-----------|
| "列表 / 管理 / CRUD / 数据" | list-page (Header + Search + Table) |
| "详情 / 查看 / 信息" | detail-page (Header + Card + Details) |
| "看板 / 统计 / 仪表盘" | dashboard (StatCards + Charts) |
| "表单 / 创建 / 编辑 / 设置" | form-page (Header + Form) |
| "审批 / 流程 / 步骤" | form-page (StepsForm) |
| "配置 / 标签页" | tab-page (Tabs + Content) |

### Step 3: Find Reference Page

From `04-page-patterns.md`, find the most similar existing page by:
1. Same page type
2. Same entity type (if user mentions "articles", look for pages managing similar entities)
3. Same component usage

```
User: "文章管理列表页"
Reference: /users (list-page: PageHeader + SearchForm + ProTable)
→ Same pattern. Adapt columns, fields, API.
```

### Step 4: Plan Component Tree

```
AppLayout
├── PageHeader(title="{feature}管理", actions=[新增, 导出])
├── SearchForm(fields=[name, status, dateRange])
└── ContentCard
    └── ProTable(columns=[name, status, createdAt, actions])
```

**Component selection rules:**
1. If `05-component-inventory.md` has a custom component → **use it** (StatusTag, UserSelect, etc.)
2. If not → use raw UI library from `01-component-libraries.md`
3. If neither → HTML with project tokens

### Step 5: Apply Design Tokens

Map all visual properties to values from `03-design-tokens.md`:

| Property | Source |
|----------|--------|
| Background | token (e.g., `--bg-color`) |
| Primary color | Brand primary from tokens |
| Text color | Text Primary / Secondary |
| Border | Border token |
| Status colors | Success / Warning / Error |
| Spacing | 4px grid from tokens |
| Border radius | Token values |
| Font size | Typography scale |

**Rule: ZERO magic visual values.** Every color, spacing, and radius must match the tokens file.

### Step 6: Apply Code Conventions

From `06-code-conventions.md`:

- File extension: `.tsx` / `.jsx`
- Quotes: single / double
- Semicolons: yes / no
- Export style: default / named
- CSS approach: Tailwind / CSS Modules / Styled
- Import paths: `@/components/...`

### Step 7: Generate Code

1. Route registration (add to router)
2. Page component (main file with layout)
3. Sub-components (if needed)
4. API calls / data fetching

Pass/fail gates per file:
- [ ] Import paths match conventions
- [ ] Components from inventory or UI lib
- [ ] Colors/spacing from tokens
- [ ] Code style matches conventions

### Step 8: Verify Consistency

| Check | How |
|-------|-----|
| Colors match palette | `grep -E '#[0-9A-Fa-f]{3,8}' new-page.tsx` — every hex must be in tokens |
| Spacing uses 4px grid | `grep -E '\b\d{1,2}px\b' new-page.tsx` — multiples of 4 |
| Prefer custom components | `grep -c 'from.*@/components' new-page.tsx` |
| Import paths correct | Check `from '@/'` against inventory |
| Layout matches pattern | Compare tree to reference page |
| No duplicate components | Check inventory for existing equivalent |
| CSS approach correct | Tailwind uses className, CSS Modules uses .module.css |

## Special Cases

### Modifying an Existing Page
1. Find page in `04-page-patterns.md` by route
2. Read existing source
3. Change relative to existing structure (add section, swap component)
4. Do NOT restructure unless asked

### Adding a Section
1. Read existing page structure
2. Use same tokens/components as adjacent sections
3. ContentCard for new cards, ProTable for new tables

### Token Gaps
- Use closest existing token
- Tell user: "No token for X, used Y (closest match). Consider adding it."

### New Component Needed
1. Try composing existing components first
2. If unavoidable: same CSS approach, same export pattern, same directory
3. Small and focused

---

# Keeping In Sync: Three-Layer Strategy

### Layer 1: Incremental Runs (日常增量)

Every scan or build request runs `--update` first. If nothing changed, the script exits in ~2ms. If changed, it re-scans.

### Layer 2: Scheduled Task (定时巡检)

Schedule the scan script to run periodically (e.g., weekly via cron, systemd timer, or your agent's scheduling system):

```bash
# Weekly scan — adapt to your scheduler
0 9 * * 1 cd /path/to/project && python3 /path/to/mermaid-design-skills/skills/design-sense/scripts/scan-design-system.py --update
```

### Layer 3: Git Hook (团队自动化)

Commit to repo: `.githooks/post-merge`

```bash
#!/bin/bash
SCRIPT="$(git rev-parse --show-toplevel)/skills/design-sense/scripts/scan-design-system.py"
[ -f "$SCRIPT" ] && python3 "$SCRIPT" "$(git rev-parse --show-toplevel)" --update
```

```bash
# One-time install per developer
git config core.hooksPath .githooks
```

### Recommended Stack

| 场景 | Layer 1 | Layer 2 | Layer 3 |
|------|:-:|:-:|:-:|
| 个人项目 | ✅ | — | — |
| 个人 + 机器常开 | ✅ | ✅ 每周 | — |
| 团队项目 | ✅ | ✅ 或 — | ✅ 必选 |

## Common Pitfalls

1. **Monorepos.** Scan the specific app directory, not the root.
2. **External tokens.** If tokens come from a package (`@acme/tokens`), scan that too.
3. **Stale config.** `.prettierrc` may not match actual code — cross-check sampling.
4. **Generated CSS.** Skip Tailwind output files (`dist/output.css`).
5. **Magic values.** Always cross-check colors/spacing against tokens file.
6. **Wrong pattern.** Classify first — don't use dashboard skeleton for a list page.
7. **Not enough for restyling.** design-sense scan alone gives framework/component context but won't find *every* hardcoded value across all files. For systematic restyling of an existing project, chain with `design-audit` (deep value scan) followed by `design-restyle` (apply changes).

## Verification Checklist

### Scan
- [ ] `.design-system/` created with all 7 files
- [ ] Component library detected + version noted
- [ ] Tokens include colors + font system at minimum
- [ ] At least 3 page patterns documented
- [ ] Conventions cross-checked against actual code

### Build
- [ ] 6 reference files loaded
- [ ] Page type classified correctly
- [ ] Closest reference page selected
- [ ] Component tree matches inventory
- [ ] Zero magic visual values
- [ ] Import paths from inventory
- [ ] Route registration added
- [ ] Grep audit passed (colors, spacing, components)

## Related Skills

- `design-audit` — deep hardcoded-value scanner; run after design-sense when restyling existing projects
- `design-restyle` — systematic token-based restyling; final step of the pipeline
