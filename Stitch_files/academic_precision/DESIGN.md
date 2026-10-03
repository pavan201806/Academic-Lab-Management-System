---
name: Academic Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444650'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757781'
  outline-variant: '#c5c6d2'
  surface-tint: '#445c9c'
  primary: '#001849'
  on-primary: '#ffffff'
  primary-container: '#0f2d6b'
  on-primary-container: '#7f97db'
  inverse-primary: '#b2c5ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#001e32'
  on-tertiary: '#ffffff'
  tertiary-container: '#003452'
  on-tertiary-container: '#3da0e5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#2a4482'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an elevated research-grade aesthetic tailored for collegiate laboratories, clinical research facilities, and higher education STEM operations. The visual posture balances rigorous institutional trust with contemporary, fluid SaaS efficiency. 

### Brand Personality & Emotional Impact
- **Scientific Rigor & Authority:** Instills confidence through structured layouts, high typographic legibility, and uncompromising visual clarity. 
- **Operational Calm:** Reduces cognitive load for lab managers, principal investigators, and student researchers managing hazardous materials, inventory procurement, equipment schedules, and compliance protocols.
- **Modern Academic Prestige:** Replaces antiquated institutional portals with an executive, crisp digital working environment.

### Design Movement
The system operates within an architectural **Modern Corporate & Academic High-Contrast Minimalist** framework:
- **Structural Cleanliness:** Subtle hairline dividers and generous whitespace define information hierarchy over decorative elements.
- **Precision Data Density:** High information density without visual clutter, prioritizing readable data tables, protocol sequences, and telemetry widgets.
- **Subtle Modern Accents:** Deep institutional blue forms the baseline of authority, accented by sharp clinical teal indicators for states, allocations, and live instrumentation reads.

## Colors

The color palette pairs deep scholarly authority with clinical precision accents. All pairings meet or exceed WCAG AA contrast thresholds (minimum 4.5:1 for normal text, 3:1 for graphical elements).

### Core Palette Application
- **Primary (`#0F2D6B`):** Deep Naval Academic Blue. Used for primary navigation architecture, primary action buttons, key brand landmarks, active selection states, and foundational hierarchy accents.
- **Secondary (`#0D9488`):** Deep Clinical Teal. Used for verified status states, active lab equipment sessions, successful test indicators, and secondary actionable controls.
- **Tertiary (`#0284C7`):** Precision Cerulean. Dedicated to informational highlights, data visualizations, active calendar/equipment reservations, and interactive links.
- **Neutral Dark (`#0F172A`):** Deep Ink Charcoal. Serves as the primary typographic color for maximum legibility on light grounds, avoiding harsh pure black.
- **Neutral Surface & Canvas:** 
  - Base canvas: `#F8FAFC` (Slate 50) creates a soft, eye-fatigue-reducing work surface.
  - Layered surface: `#FFFFFF` (White) isolates content cards, datagrids, and side drawers.
  - Subtle borders: `#E2E8F0` (Slate 200) renders crisp, low-contrast structural grids.
  - Muted secondary typography: `#64748B` (Slate 500) for metadata, timestamps, and table headers.

### Semantic States
- **Success (`#059669`):** Inspection passed, inventory verified, autoclave cycle complete.
- **Warning (`#D97706`):** Calibration expiring, chemical threshold approaching re-order point.
- **Critical / Danger (`#DC2626`):** Biosafety breach, expired SDS sheet, conflicting equipment booking, hazardous reagent alert.

## Typography

The typographic pairing balances the geometric authority of **Manrope** for titles and figures with the utilitarian neutrality of **Hanken Grotesk** for prolonged reading and data density.

### Typographic Hierarchy Rules
- **Display & Headings:** Rendered strictly in **Manrope** (`600` and `700` weight). Use display sizes strictly for macro dashboard summaries and facility landing headers. Maintain tighter negative tracking (`-0.02em` to `-0.01em`) to maintain optical density.
- **Body & Data:** Rendered in **Hanken Grotesk** (`400` weight for content; `500` for emphasized data points). The modern grotesque proportions allow high legibility in dense lists, nested tables, chemical formulas, and audit logs.
- **Metadata & Labels:** Form and table column headers use `label-sm` with `0.04em` letter-spacing, often styled in uppercase (`text-transform: uppercase`) with neutral muted slate (`#64748B`) to anchor dense field sets.

## Layout & Spacing

The system leverages a strict **8px base grid** (with a 4px half-unit for dense components such as compact badges and micro-inputs) combined with a 12-column fluid-responsive layout.

### Layout Mechanics
- **Desktop (1200px+):** 12-column fluid grid with `2.5rem` outer canvas margin and `1.5rem` to `2rem` gutters. Content containers can extend up to a maximum constrained width of `1600px` for ultra-wide data views (e.g., instrument schedule timelines and sample plate layouts).
- **Tablet (768px - 1199px):** 8-column layout with `1.5rem` margins and `1rem` gutters. Multi-column forms compress into 2 columns; sidebars collapse into persistent icon-rail navigation.
- **Mobile (< 768px):** 4-column layout with `1rem` margins and `0.75rem` gutters. Tables shift into card-list permutations or pinned horizontal scroll regions.

### Spacing Application Rules
- **Padding (`space-sm` / `0.5rem`, `space-md` / `1rem`):** Standard interior padding for form controls, table cells, and list items to preserve high scanning speed.
- **Card Spacing (`space-lg` / `1.5rem`):** Default separation between independent laboratory telemetry panels, safety summary cards, and protocol steps.
- **Section Breaks (`space-xl` / `2rem`):** Major structural separation between independent views (e.g., equipment calendar view versus reservation request table).

## Elevation & Depth

To preserve an authentic scientific demeanor, this system avoids dramatic lighting and heavy skeuomorphic drop-shadows. Depth is articulated through **tonal surface stacking** combined with **subtle, ultra-diffused atmospheric elevation**.

### Elevation Hierarchy
- **Level 0 (Base Canvas):** `#F8FAFC`. The foundational canvas behind all views. Completely flat.
- **Level 1 (Structural Cards & Datagrids):** `#FFFFFF` surface resting on the canvas, bounded by a 1px border (`#E2E8F0`) with a hair-thin ambient shadow: `box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.04)`.
- **Level 2 (Hover States, Interactive Cards):** Activated on table row hovers or card interactions: `box-shadow: 0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)`.
- **Level 3 (Dropdown Menus, Popovers, Date Pickers):** Elevated interface controls: `box-shadow: 0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.03)`, bordered with `#E2E8F0`.
- **Level 4 (Modal Dialogs, Hazardous Action Confirmation):** `box-shadow: 0 20px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.04)` over a 40% opacity ink backdrop (`rgba(15, 23, 42, 0.40)` with `backdrop-filter: blur(4px)`).

## Shapes

The design system employs **Roundedness Level 2** (`0.5rem` / 8px base border-radius). This provides a modern, approachable visual balance while remaining disciplined and utilitarian.

### Geometry Token Mapping
- **Default Radius (`rounded` = `0.5rem` / 8px):** Standard interactive surfaces, including buttons, input fields, dropdown select triggers, notification toasts, and standard data cards.
- **Large Radius (`rounded-lg` = `1rem` / 16px):** Outer frame containers, modal sheets, and slide-over specimen inspector drawers.
- **Small Radius (`rounded-sm` = `0.25rem` / 4px):** Checkboxes, radio indicators, code snippets (e.g., CAS Registry Numbers, barcode labels), and inline table badges.
- **Full Radius (`rounded-full`):** Status indicator dots, user profile avatars, and contextual count pills.

## Components

### Buttons
- **Primary:** Solid `#0F2D6B` fill, `#FFFFFF` text, `0.5rem` border-radius. Hover shifts to `#163A84` with Level 2 elevation. Focus rings display a 2px offset ring in `#0284C7`.
- **Secondary / Subtle:** Surface `#FFFFFF`, border 1px `#E2E8F0`, text `#0F172A`. Hover shifts background to `#F1F5F9`.
- **Destructive:** Solid `#DC2626` fill for critical waste disposal / booking cancellation actions, with white text.
- **Dimensions:** Default height 36px (`py: 0.5rem`, `px: 1rem`) for standard operational density; compact height 30px for nested data tables.

### Input Fields & Selects
- Height 36px, border 1px `#CBD5E1`, background `#FFFFFF`, border-radius `0.5rem`.
- Focus state: Border transitions to `#0F2D6B` with a 3px ambient shadow ring in `rgba(15, 45, 107, 0.12)`.
- Helper & error text rendered in `body-sm`, with errors highlighted using `#DC2626` text and border styling.

### Chips & Status Badges
- Compact height (22px), `rounded-sm` (4px radius) or `rounded-full`, padding `0.125rem 0.5rem`.
- **Operational Status:**
  - *Active / Operational:* `#CCFBF1` background, `#0D9488` text.
  - *Reserved / In-Use:* `#E0F2FE` background, `#0284C7` text.
  - *Maintenance / Calibration:* `#FEF3C7` background, `#D97706` text.
  - *Out of Service / Safety Lockout:* `#FEE2E2` background, `#DC2626` text.

### Data Tables
- Header row: `#F8FAFC` background, 32px height, 1px bottom border `#E2E8F0`, uppercase `label-sm` typography in `#64748B`.
- Content rows: `#FFFFFF` background, 44px row height (compact 36px), 1px border `#F1F5F9`. Hover state tints to `#F8FAFC`.
- Pinned columns for sample ID / instrument name with subtle right divider shadows.

### Cards
- Container constructed with `#FFFFFF` background, 1px solid border `#E2E8F0`, `0.5rem` border-radius, and Level 1 elevation.
- Header sections feature a distinct 1px separator line (`#F1F5F9`) dividing card title from body parameters.

### Domain-Specific Components
- **Chemical / Hazard Badge:** Monospaced formula and NFPA 704 standard quadrant indicators with strict high-contrast borders.
- **Instrument Schedule Strip:** 24-hour visual block allocator showing time slots partitioned into 15-minute segments using `#0284C7` (booked) and `#0D9488` (current active run).