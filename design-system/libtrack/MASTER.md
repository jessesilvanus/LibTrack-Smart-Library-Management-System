# LibTrack — Master Design System (Single Source of Truth)

> **Hierarchy Notice:** When building or modifying a specific page, first consult `design-system/libtrack/pages/[page-name].md`. If a page override exists, its specific deviations take precedence. Otherwise, strictly adhere to this Master specification.

---

**Application Name:** LibTrack  
**Category:** Higher Education / Academic Library Operations & Analytics  
**Aesthetic Archetype:** Modern Academic / Data-Dense Institutional Dashboard (Restrained Navy, Slate, and Academic Teal)  
**WCAG Target:** WCAG 2.1 AA / AAA Compliance  

---

## 1. Color System

A disciplined, accessible light palette optimized for readability, information hierarchy, and low cognitive fatigue across prolonged librarian and administrative desk shifts.

### 1.1 Core Brand & Neutral Tokens

| Token | Hex | Role & Usage | Contrast vs White (#FFF) |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#1B2A4A` | **Deep Institutional Navy** — Primary brand color, desktop sidebar, key page headers, brand badges | 13.8:1 (AAA) |
| `--color-primary-hover` | `#142038` | Darker Navy for pressed/active interactions | 15.6:1 (AAA) |
| `--color-primary-subtle` | `#EBF0F7` | Tinted navy background for selected navigation tabs & highlights | 1.18:1 (tint) |
| `--color-secondary` | `#334155` | **Slate Navy** — Secondary accents, auxiliary action buttons, subtle headings | 9.6:1 (AAA) |
| `--color-accent` | `#0D9488` | **Academic Teal (Teal 600)** — Primary interactive actions, active toggle indicators, primary CTAs | 4.62:1 (AA Normal) |
| `--color-accent-hover` | `#0F766E` | **Dark Teal (Teal 700)** — Button hover & pressed states | 5.8:1 (AA/AAA) |
| `--color-accent-subtle` | `#F0FDFA` | **Teal 50** — Subtle badge background, active table row highlight | — |
| `--color-bg-canvas` | `#F8FAFC` | **Off-White Canvas (Slate 50)** — Global app viewport background | — |
| `--color-bg-surface` | `#FFFFFF` | **Pure White** — Cards, panels, modal dialogs, data tables | — |
| `--color-bg-muted` | `#F1F5F9` | **Slate 100** — Input background, table headers, alternating row striping | — |
| `--color-border-subtle` | `#E2E8F0` | **Slate 200** — Dividers, table borders, card outlines | — |
| `--color-border-strong` | `#CBD5E1` | **Slate 300** — Form input borders, active component boundaries | — |

### 1.2 Typography & Text Tokens

| Token | Hex | Role | Contrast vs `#FFF` | Contrast vs `#F8FAFC` |
| :--- | :--- | :--- | :--- | :--- |
| `--color-text-main` | `#0F172A` | Slate 900 — Headings, table data, primary labels | 17.8:1 (AAA) | 16.5:1 (AAA) |
| `--color-text-muted` | `#475569` | Slate 600 — Subtitles, secondary table meta, helper text | 7.0:1 (AAA) | 6.5:1 (AA) |
| `--color-text-subtle` | `#64748B` | Slate 500 — Timestamps, disabled labels, breadcrumbs | 4.6:1 (AA) | 4.3:1 (AA Large) |
| `--color-text-inverse` | `#FFFFFF` | Pure White — Sidebar items, high-contrast action text | — | — |

### 1.3 Semantic & Operational Status Tokens

| Status | Text / Icon | Surface / Pill Background | Border | Usage in LibTrack |
| :--- | :--- | :--- | :--- | :--- |
| **Available / Returned** | `#166534` (Green 800) | `#DCFCE7` (Green 100) | `#86EFAC` | Book in stock, return completed, active member |
| **Due Soon / Attention** | `#9A3412` (Orange 800)| `#FFEDD5` (Orange 100) | `#FDBA74` | Due within 48h, reserved copy pending |
| **Overdue / Error** | `#991B1B` (Red 800) | `#FEE2E2` (Red 100) | `#FCA5A5` | Overdue borrowing, DB connection failure |
| **Information / Active**| `#1E40AF` (Blue 800) | `#DBEAFE` (Blue 100) | `#93C5FD` | Active loan in good standing, catalog update |

---

## 2. Typography System

Rooted in research-grade institutional legibility, utilizing **Inter** for crisp tabular data, metadata, and high-density user interface controls, complemented by **Lexend** / clean geometry for titles.

### 2.1 Font Family Hierarchy
- **Primary Interface Font:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Monospace / Numerical Data:** `'JetBrains Mono', 'Fira Code', 'Courier New', monospace` (for ISBN, barcode tags, timestamps)

### 2.2 Scale & Density Matrix

| Step | CSS Class | Size (px / rem) | Line Height | Weight | Tracking | Primary Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `text-2xl` | `24px / 1.5rem` | `32px` | 700 (Bold) | `-0.02em` | Page Titles, Key Dashboard Section Names |
| **Metric Value** | `text-3xl` | `30px / 1.875rem` | `36px` | 700 (Bold) | `-0.025em` | Stat / KPI numeric values |
| **Title Medium**| `text-lg` | `18px / 1.125rem` | `26px` | 600 (Semibold) | `-0.01em` | Card Headings, Modal Dialog Titles |
| **Base / Body** | `text-sm` | `14px / 0.875rem` | `20px` | 400 (Regular) | `0em` | Standard Body, Table cell copy, Form Inputs |
| **Label / Sub** | `text-xs` | `12px / 0.75rem` | `16px` | 500 (Medium) | `+0.01em` | Table Headers, Status Badges, Secondary Meta |
| **Fine Print** | `text-[11px]` | `11px / 0.6875rem`| `14px` | 500 (Medium) | `+0.02em` | ISBN tags, micro-timestamps, system status |

---

## 3. Spacing & Layout Architecture

Built upon a strict **8-pixel grid** with compact 4px increments for high-density desktop interfaces.

### 3.1 Layout Dimensions
- **Desktop Sidebar Width:** Fixed `256px` (`16rem`).
- **Header Height:** Fixed `60px` (`3.75rem`).
- **Maximum Content Container:** `max-w-7xl` (`1280px`) or fluid container with `px-4 sm:px-6 lg:px-8`.
- **Card Padding:** `p-5` (`20px`) for major dashboards, `p-4` (`16px`) for compact widgets.
- **Table Row Height:** `44px` compact desktop, `48px` default touch target.

### 3.2 Responsive Breakpoints
- **Mobile (`< 640px`):** Single column flow, header hamburger toggle, floating modal bottom drawer for nav, simplified table cards.
- **Tablet (`640px - 1023px`):** 2-column KPI grid, collapsible sliding sidebar drawer, horizontally scrollable data tables.
- **Desktop (`>= 1024px`):** Fixed 256px persistent navy sidebar, 3 or 4-column KPI grid, full tabular views.
- **Wide Desktop (`>= 1440px`):** Max container centering with structured spacing to avoid overstretched data tables.

---

## 4. Component Standards

### 4.1 Buttons
- **Primary Action (Teal):** `bg-[#0D9488] hover:bg-[#0F766E] text-white font-medium text-sm px-4 py-2 rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:ring-offset-2 active:bg-[#115E59]`
- **Secondary Action (Slate Outline):** `bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-sm px-4 py-2 rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2`
- **Subtle / Ghost:** `hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-medium text-sm px-3 py-1.5 rounded-md transition-colors duration-150`
- **Destructive:** `bg-red-600 hover:bg-red-700 text-white font-medium text-sm px-4 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-red-500`

### 4.2 Data Tables
- **Container:** Bordered white container `bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden`.
- **Header Row:** `bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 px-4 py-3`.
- **Body Rows:** `border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-sm text-slate-800 px-4 py-3`.
- **Alignment:** Text/categories left-aligned; status badges centered; quantities/currency right-aligned; action buttons right-aligned.

### 4.3 KPI / Metric Cards
- **Structure:** `bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all duration-200`.
- **Elements:**
  1. Header: Icon badge (in 36x36px tinted container) + Label in `text-xs font-medium text-slate-500 uppercase tracking-wide`.
  2. Value: Big number in `text-2xl lg:text-3xl font-bold text-slate-900`.
  3. Context / Trend: Secondary helper or delta indicator in `text-xs text-slate-500`.

### 4.4 Form Controls & Inputs
- **Base Input:** `h-10 w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 transition-colors duration-150 disabled:bg-slate-100 disabled:cursor-not-allowed`.

---

## 5. Accessibility & Motion Rules

- **Strict No-Emoji Rule:** Emojis (e.g. 📚, 🔔, ⚠️) are strictly forbidden as UI glyphs. All visual indicators must use crisp SVG iconography from **Lucide**.
- **Keyboard Navigation:** Every interactive button, link, tab, and input must feature a distinct outline with `focus-visible:ring-2 focus-visible:ring-offset-2`.
- **Reduced Motion:** All transitions must be governed with `motion-reduce:transition-none motion-reduce:transform-none`.
- **Contrast Ratios:** All body text must maintain a minimum contrast ratio of 4.5:1; large headings must achieve 3.0:1 or greater.

---

## 6. Charts & Visualizations (Recharts)

- **Palette Tokens:**
  - Primary metric series: `#0D9488` (Teal)
  - Secondary comparative series: `#1B2A4A` (Navy)
  - Tertiary / Overdue series: `#DC2626` (Red)
  - Gridlines: `#E2E8F0` with `strokeDasharray="3 3"`
  - Tooltips: White card with `border-slate-200 shadow-md rounded-lg text-xs`
- **Data Integrity Rule:** Charts must represent genuine aggregated counts or legitimate empty indicators. No artificial random curve generation.
