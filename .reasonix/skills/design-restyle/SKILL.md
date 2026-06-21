---
name: design-restyle
description: Systematic UI restyling — apply token-based design changes from audit results
---

---
name: design-restyle
description: "Systematic UI restyling — read a deep design audit, synthesize target design tokens, inject token infrastructure, apply value mapping layer by layer, and verify consistency."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [design-system, refactoring, css, restyling, frontend]
    related_skills: [design-audit, design-sense]
---

# Design Restyle

## Overview

`design-restyle` takes the output of `design-audit` and systematically applies
a unified style to an existing project — **without changing any dependency,
framework, interaction, or data logic**.

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│ design-audit │ ──> │ design-restyle│ ──> │  Unified UI  │
│ (what we     │     │ (how we fix   │     │  (consistent │
│  have)       │     │  it)          │     │   result)    │
└──────────────┘     └───────────────┘     └──────────────┘
```

## When to Use

- An existing project has inconsistent colors, spacing, or fonts
- You want to migrate hardcoded values to a token system
- You need a "style refresh" without rewriting the whole app
- You want to bring a project to a consistent design system standard

**Do NOT use for:**
- New greenfield projects (use `design-sense` instead)
- Projects where you can change dependencies (use a proper design system library)
- Small 1-file fixes (just patch manually)

---

## The 5-Phase Workflow

```
Phase 1: Load Audit Data     ← read .design-audit/ + .design-system/
Phase 2: Synthesize Tokens   ← AI infers intended design + creates mapping
Phase 3: Inject Token Layer  ← add CSS vars / Tailwind config / SCSS vars
Phase 4: Apply Layer by Layer ← mechanical replacement + agent-assisted
Phase 5: Verify              ← scan, build, compare, report
```

---

## Phase 1: Load Audit Data

### Prerequisites

The project must have:
- `.design-audit/` directory (from `design-audit` scan)
- `.design-system/` directory (from `design-sense` scan) — for framework context

### Load Order

```bash
# Ensure data is fresh
python3 skills/design-audit/scripts/audit-hardcoded-values.py <project-path> --update
python3 skills/design-sense/scripts/scan-design-system.py <project-path> --update
```

Then read these files in order:

| # | File | What to Get |
|---|------|-------------|
| 1 | `.design-system/02-css-strategy.md` | CSS approach (Tailwind/CSS Modules/CSS-in-JS) |
| 2 | `.design-system/01-component-libraries.md` | UI library used (Ant Design, Element, etc.) |
| 3 | `.design-audit/05-inconsistencies.md` | Known issues |
| 4 | `.design-audit/01-all-colors.md` | Color palette (sorted by frequency) |
| 5 | `.design-audit/03-all-spacing.md` | Spacing values and grid |
| 6 | `.design-audit/02-all-typography.md` | Font usage |
| 7 | `.design-audit/04-all-borders-shadows.md` | Radii and shadows |

### Key Questions to Answer

After reading, answer these:

| Question | Where to Look |
|----------|---------------|
| What framework? (React/Vue/Next/Nuxt) | `.design-system/01-*.md` |
| What CSS approach? | `.design-system/02-*.md` |
| What UI lib? | `.design-system/01-*.md` |
| What's the dominant color palette? | `.design-audit/01-all-colors.md` (top 20) |
| What spacing grid (4px/8px)? | `.design-audit/03-all-spacing.md` "Grid Compliance" |

---

## Phase 2: Reference → Semantic Mapping

This is the core innovation. Instead of mapping old values to the **most frequent
old value** (which only guarantees consistency, not beauty), we:

1. **Choose an external reference design system** — a curated, professionally
   designed token set that looks good
2. **Classify old values by semantic role** — using CSS property + value
   heuristics to understand what each value *means* (is `#f5f5f5` a page bg
   or a card bg?)
3. **Map each semantic role to the reference token** — old color → role →
   new beautiful value

```
旧: #1890ff (47x, used in background)         旧: #f5f5f5 (32x, used in background)
  → CSS property: background-color               → CSS property: background-color
  → Semantic role: bg-card                        → Semantic role: bg-page
  → Reference token: tailwind/primary             → Reference token: tailwind/bg-page
  → New value: #3b82f6                            → New value: #f9fafb
```

### Step 2a: Choose a Reference Design System

```bash
python3 skills/design-restyle/scripts/semantic-mapper.py <project-path> --list
```

Output:
```
Available reference presets:
  tailwind     Tailwind CSS Default — Universal, reliable, widely adopted
  radix        Radix Colors — Perceptually uniform color scales
  shadcn       shadcn/ui — Minimal, component-style tokens
  antd         Ant Design 5 — Enterprise-grade, Chinese-friendly
  catppuccin   Catppuccin Mocha — Modern warm pastel palette
```

| Preset | When to Use |
|--------|-------------|
| **tailwind** | Generic web apps, need a safe/professional look |
| **radix** | Accessibility-focused, need perceptually uniform colors |
| **shadcn** | Modern minimal aesthetic, CSS-variable-native |
| **antd** | 中文企业级应用，后台/中台系统 |
| **catppuccin** | Creative/niche projects, want a distinctive look |

The preset is just the starting point — you can override individual tokens
after generation.

### Step 2b: Run Semantic Mapper

```bash
python3 skills/design-restyle/scripts/semantic-mapper.py <project-path> --reference tailwind
```

Output:
```
.design-audit/
├── semantic-mapping.json         # Flat old→new mapping for apply-value-mapping.py
├── semantic-mapping-report.md    # Human-readable: role assignments, decisions
└── synthesis-recommendations.yaml（可选，AI review后的最终版）
```

### Step 2c: Agent Review + Adjustments

### Semantic Role Taxonomy

The mapper uses this role system:

| Category | Roles | Example Properties |
|----------|-------|-------------------|
| **color/text** | `text-primary`, `text-secondary`, `text-tertiary`, `text-inverse`, `text-disabled`, `text-link` | `color`, `fill`, `stroke` |
| **color/background** | `bg-page`, `bg-card`, `bg-surface`, `bg-hover`, `bg-active`, `bg-elevated`, `bg-modal-overlay` | `background`, `background-color` |
| **color/border** | `border-default`, `border-hover`, `border-focus`, `border-light` | `border-color`, `outline-color` |
| **color/semantic** | `primary`, `success`, `warning`, `danger`, `info` | Button bg, badge bg, tag bg |
| **color/** | `primary-bg`, `success-bg`, `danger-bg`, `warning-bg`, `info-bg` | Semantic background tints |
| **spacing** | Snapped to reference grid | `margin`, `padding`, `gap` |
| **typography/font-size** | Snapped to reference scale | `font-size` |
| **radius** | Snapped to reference scale | `border-radius` |
| **shadow** | Mapped by similarity | `box-shadow` |

### Value Mapping Output

The final `semantic-mapping.json` is a flat JSON suitable for `apply-value-mapping.py`:

```json
{
  "#1890ff": "#3b82f6",
  "#1a90ff": "#3b82f6",
  "#40a9ff": "#2563eb",
  "#333": "#111827",
  "#999": "#6b7280",
  "#f5f5f5": "#f9fafb",
  "#ffffff": "#ffffff",
  "#e8e8e8": "#e5e7eb",
  "14px": "16px",
  "8px": "8px",
  "6px": "6px",
  "24px": "24px"
}
```

---

## Phase 3: Inject Token Infrastructure

### Strategy-Specific Instructions

#### A) Tailwind CSS

```js
// tailwind.config.js — extend only, no dependency changes
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#1890ff',
        'primary-hover': '#40a9ff',
        'text-primary': '#1a1a1a',
        'text-secondary': '#8c8c8c',
        'bg-page': '#f5f5f5',
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
      fontSize: { xs: '12px', sm: '13px', base: '14px', lg: '16px', xl: '20px' },
      borderRadius: { sm: '4px', md: '6px', lg: '8px' },
    },
  },
};
```

#### B) CSS Custom Properties

```css
/* tokens.css */
:root {
  --color-primary: #1890ff;
  --color-primary-hover: #40a9ff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #8c8c8c;
  --color-bg-page: #f5f5f5;
  --color-bg-card: #ffffff;
  --color-border-default: #e8e8e8;
  --font-size-base: 14px;
  --spacing-md: 16px;
  --border-radius-md: 6px;
}
```

#### C) SCSS Variables / D) CSS-in-JS

Similar patterns for SCSS `_tokens.scss` or JS `tokens.ts`.

### Injection Rules

| Rule | Why |
|------|-----|
| Add new file, never edit existing token files | Safety |
| Use the framework's native config extension | No dependency changes |
| Don't delete old values yet | Will be replaced in Phase 4 |

---

## Phase 4: Apply Layer by Layer

### Execution Order

```
Layer 1: Token files only
Layer 2: Global CSS / App.css
Layer 3: Component CSS files
Layer 4: JSX/TSX inline styles
Layer 5: Styled-components / CSS-in-JS
Layer 6: Tailwind className strings
Layer 7: SVG colors
Layer 8: Third-party theme overrides
```

### Per-Layer Safety Checks

| Check | How |
|-------|-----|
| No build errors | Run `npm run build` or equivalent |
| No old value leaks | Run `verify-restyle.py --check-remaining` |
| No interaction changes | git diff — only style values should differ |
| No new magic values | All new values come from the token set |

### Commit Strategy

```
restyle/phase1: inject token infrastructure
restyle/phase2: migrate global CSS
restyle/phase3: migrate component CSS
restyle/phase4: migrate inline styles
restyle/phase5: migrate Tailwind classes
restyle/phase6: migrate SVG/icon colors
restyle/phase7: final verification
```

---

## Phase 5: Verify

### Automated Verification

```bash
python3 skills/design-restyle/scripts/verify-restyle.py <project-path> --tokens .design-audit/semantic-mapping.json
```

The script checks:

| Check | What It Tests |
|-------|-------|
| ✅ Still compiles | Builds without errors |
| ✅ Zero old colors | No colors from the "replaces" list exist outside token files |
| ✅ On-grid spacing | All px values are multiples of the target grid |
| ✅ Font scale compliance | Font sizes from target scale |
| ✅ Consistent radius | Border-radius uses at most 3 unique values |
| ✅ No magic values | Every visual value is a token reference |

### Manual Verification

1. Visual diff — Navigate key pages and compare
2. Component check — Verify buttons, inputs, cards look right
3. Dark mode (if applicable) — Verify it still works
4. Responsive — Verify no layout shifts

### Report

Write to `.design-audit/restyle-report.md`.

---

## Safety Net: Rollback

```bash
# If committed per layer:
git reset --hard HEAD~1
# If not committed:
git checkout -- <affected-files>
```

**Golden rule**: Commit after each verified layer.

---

## Multi-Style Switching

Once CSS variables replace all hardcoded values, switching styles becomes trivial — just swap the token definitions. Create alternate token files for dark mode, rebranding, or seasonal themes.

---

## Complete Skill Pipeline

```
User: "美化这个项目 → 换风格到 Tailwind 色系"

1. Load `design-sense` skill → scan
2. Load `design-audit` skill → audit
3. Load `design-restyle` skill
   → Phase 1: Read audit output
   → Phase 2: Run semantic mapper
   → Phase 3: Inject token infrastructure
   → Phase 4: Apply layer by layer
   → Phase 5: Verify + report
```

## Common Pitfalls

1. Skipping audit — don't restyle without audit data
2. Over-aggressive replacement — check context before replacing
3. Incomplete token mapping — use --check-remaining after each layer
4. Forgetting UI library theme — Ant Design, Element Plus have their own config
5. Scope creep — start with colors only, add spacing/typography in a second pass
6. Not committing between layers — makes debugging impossible

## Related Skills

- `design-audit` — Run first for restyling data
- `design-sense` — Framework/component context for token decisions
