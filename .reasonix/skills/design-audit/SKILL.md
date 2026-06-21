---
name: design-audit
description: Deep design audit — extract all hardcoded visual values and identify inconsistencies
---

---
name: design-audit
description: "Deep design audit — extract ALL hardcoded visual values (colors, spacing, typography, borders, shadows) from a frontend project, identify inconsistencies, and build a machine-readable value map for AI-guided restyling."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [design-system, auditing, refactoring, css, frontend]
    related_skills: [design-sense, design-restyle]
---

# Design Audit

## Overview

`design-audit` does a **deep dive** into a frontend project's existing visual values. Unlike `design-sense scan` (which extracts the high-level design system), design-audit finds **every hardcoded value** in every file, tracks where it appears, and identifies inconsistencies.

The output feeds directly into `design-restyle` for systematic unification.

```
用户说"审计这个项目"
  → 确保 run design-sense scan first (for framework/component context)
  → 跑 audit-hardcoded-values.py
  → 读 .design-audit/ 输出
  → AI 分析不一致处 + 给出改造方案
```

## When to Use

- **Before restyling** an existing project — to know exactly what's in there
- **Onboarding** to a large codebase — see every visual value at a glance
- **Auditing design consistency** — find colors that are "almost but not quite" the same
- **Preparing for token migration** — map old values to a standard token set

**Do NOT use for:**
- New greenfield projects (use `design-sense` instead)
- Pure backend projects
- Quick style checks on a single file

---

## How Audit Works

### Prerequisites

The audit script requires **Python 3.8+** and **no external dependencies** (stdlib only).

### Execution

```bash
python3 skills/design-audit/scripts/audit-hardcoded-values.py <project-path> [--output-dir NAME] [--update] [--verbose]
```

| Flag | Description |
|------|-------------|
| `--update` / `-u` | Incremental: only re-scan if git HEAD changed |
| `--verbose` / `-v` | Print progress per file |
| `--output-dir NAME` | Custom output dir (default: `.design-audit`) |

The script should be run **after** `design-sense scan` is already done, so it can cross-reference `.design-system/` data.

### What It Scans

| File Type | What's Extracted |
|-----------|-----------------|
| `*.css`, `*.scss`, `*.less` | Hardcoded color, size, border, shadow, font values in CSS declarations |
| `*.jsx`, `*.tsx`, `*.js`, `*.ts` | Inline `style={{...}}` objects, styled-components template literals |
| `*.vue` | `<style>` blocks (scoped/global), `:style` bindings in templates |
| `*.svelte`, `*.html` | Inline styles, style tags |
| `tailwind.config.*` | Extended theme tokens for cross-reference |

### What It Does NOT See (Known Gaps)

The script scans **source code only**. Several categories of visual values
are invisible to it because they're produced at build or runtime:

| Gap | Example | Impact |
|-----|---------|--------|
| **Tailwind utility classes** | `className="text-blue-500"` | High — entire class of values invisible |
| **SCSS/Less functions** | `darken(#1890ff, 8%)` | Medium — final value unknown |
| **CSS variable runtime** | `var(--color-primary)` | None — already tokenized |
| **PostCSS transforms** | `postcss-preset-env` | Low — uncommon in hand-written CSS |
| **Dynamic JSX styles** | `color={status ? 'red' : 'blue'}` | Low — values still found in ternary |

For a detailed breakdown and workarounds, see:
`skills/design-audit/references/source-vs-build-gap.md`

### What It Skips

- `node_modules/`, `.git/`, `dist/`, `.next/`, `build/`, `__pycache__/`
- Binary files, images, fonts
- Files > 500KB

---

## Output Structure

```
<project>/.design-audit/
├── README.md                          # Overview: file count, value counts, top issues
├── 01-all-colors.md                   # All hex/rgb/hsl/name values + frequency + context
├── 02-all-typography.md               # Font sizes, weights, families, line-heights
├── 03-all-spacing.md                  # Margins, paddings, gaps (px/rem/em values)
├── 04-all-borders-shadows.md          # Border widths, radii, box-shadows
├── 05-inconsistencies.md              # Semantic same-but-different values (AI reads + appends)
├── 06-value-map.json                  # Machine-readable: value → [{file, line, context, type}]
└── .audit-state.json                  # Git HEAD + timestamp for --update checks
```

### Output Detail

**value-map.json** schema:
```json
{
  "colors": {
    "#1890ff": {
      "count": 12,
      "usage": [
        {"file": "src/components/Button.tsx", "line": 45, "context": "background: #1890ff"},
      ],
      "context_types": ["background", "color", "border"]
    }
  },
  "sizes": { ... },
  "radii": { ... },
  "shadows": { ... }
}
```

### Inconsistency Types (detected by script + AI-annotated)

| Type | Example | Severity |
|------|---------|----------|
| Near-duplicate colors | `#1890ef` vs `#1890ff` | high |
| Same semantic, different value | Two buttons use different blue | high |
| Non-grid spacing | `13px` when grid is 4px | medium |
| Mixed border-radius | Cards use `4px`, `6px`, `8px` | medium |
| Inconsistent font sizing | Headings use different sizes | medium |

---

## Workflow

### Step 1: Check Prerequisites

```bash
# First, ensure design-sense scan is done
ls <project>/.design-system/ 2>/dev/null || echo "Run design-sense scan first"
```

If `.design-system/` exists, load those files for framework/component context.

### Step 2: Run the Audit Script

```bash
python3 skills/design-audit/scripts/audit-hardcoded-values.py <project-path>
```

### Step 3: Read the Output

Read these files in order:

| File | Why Read It |
|------|-------------|
| `README.md` | Top-level summary + issues count |
| `05-inconsistencies.md` | Most actionable — what's broken |
| `01-all-colors.md` | Color palette + frequency |
| `06-value-map.json` | For programmatic usage |

### Step 4: AI Reasoning — Find the "True Design System"

The agent reads the audit output and answers:

1. **What's the actual color palette?** — The most-frequent values are the intended ones
2. **What are the orphans?** — Values that appeared once or twice, probably mistakes
3. **What's the right grid?** — Most common spacing increment (4px? 8px?)
4. **What are the semantic groups?** — Group values by what they're used for (backgrounds, text, borders, etc.)

### Step 5: Generate Synthesis Recommendations

Output recommendations as YAML at `.design-audit/synthesis-recommendations.yaml`:

```yaml
# Generated by agent after reading audit output
target_tokens:
  colors:
    primary: { value: "#1890ff", replaces: ["#1890ff", "#1a90ff", "#188fff"] }
    primary-hover: { value: "#40a9ff" }
    text-primary: { value: "#1a1a1a", replaces: ["#1a1a1a", "#1d1d1f", "#333"] }
    text-secondary: { value: "#8c8c8c", replaces: ["#8c8c8c", "#999", "#969696"] }
    bg-page: { value: "#f5f5f5", replaces: ["#f5f5f5", "#f0f2f5"] }
    bg-card: { value: "#ffffff" }
    border-default: { value: "#e8e8e8", replaces: ["#e8e8e8", "#e0e0e0", "#eee"] }
  spacing:
    grid: 4
  typography:
    font-family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    h1: { size: "24px", weight: 600 }
    h2: { size: "20px", weight: 600 }
    body: { size: "14px", weight: 400 }
    small: { size: "12px", weight: 400 }
  border-radius:
    default: "6px"
    small: "4px"
    large: "8px"
```

This file becomes the **contract** consumed by `design-restyle`.

---

## Incremental Mode

```bash
# After initial scan, subsequent calls with --update check git HEAD
python3 audit-hardcoded-values.py /path/to/project --update
```

| Scenario | Behavior |
|----------|----------|
| Git HEAD unchanged, no uncommitted changes | Exit instantly (2ms) |
| Git HEAD changed | Re-scan only changed files, merge with existing data |
| No git repo | Check file mtime on key files |
| `.design-audit/` missing | Full re-scan |

---

## Common Pitfalls

1. **Not running design-sense first.** Without framework context, the audit misses component library details that help with semantic grouping.
2. **Too many values.** A large project may have 500+ unique colors. Focus on the top-50 by frequency — the long tail is noise.
3. **Generated files.** CSS-in-JS runtime-generated values look like hardcoded values. Cross-check with build output.
4. **Third-party styles.** Node_module CSS leaks into the scan. The script skips node_modules, but imported component lib CSS files in src/ won't be skipped — they should be, mark them.
5. **Tailwind class names are invisible.** `text-blue-500` in a className string contains no hex value. The scanner does not resolve Tailwind utilities. For Tailwind-heavy projects, see `references/source-vs-build-gap.md` for the build-output cross-reference approach.
6. **Dynamic values.** Template expressions like `color={status === 'active' ? '#52c41a' : '#ff4d4f'}` are valid hardcoded values. These are intentional and should be kept as semantic pairs.

---

## Related Skills

- `design-sense` — Run first to get framework/component context
- `design-restyle` — The next step after audit, executes the actual restyling
