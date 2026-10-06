---
name: Laguna College ITE Academic Advising
description: An operational advising ledger where rules print results, the dean stamps decisions, and the assistant writes in the margin.
colors:
  paper: "#eef0f4"
  surface: "#ffffff"
  surface-2: "#f6f7f9"
  sunken: "#e6e9ef"
  line: "#dde1e8"
  line-strong: "#c5cbd6"
  ink: "#121729"
  ink-2: "#434a60"
  ink-3: "#636a80"
  seal: "#233c94"
  seal-hover: "#1b2f78"
  seal-text: "#233c94"
  seal-tint: "#e9edf9"
  on-seal: "#ffffff"
  focus: "#3a5ad6"
  ok: "#17734a"
  ok-tint: "#e5f3eb"
  teal: "#0b6b6f"
  teal-tint: "#e0f2f1"
  bad: "#b3261e"
  bad-tint: "#fbeae8"
  warn: "#8f5300"
  warn-tint: "#fbf0dc"
  act: "#b2440b"
  act-tint: "#fdece2"
  data: "#6a3cb4"
  data-tint: "#f1ebfa"
  mute: "#5b6276"
  mute-tint: "#eceef2"
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline-sm:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'ss01', 'cv11'"
  body-sm:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 550
    lineHeight: 1
  figure:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, monospace"
    fontWeight: 400
    letterSpacing: "-0.01em"
    fontFeature: "'tnum'"
  code:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, monospace"
    fontSize: "0.8125rem"
    letterSpacing: "-0.01em"
  stamp-word:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "0.14em"
  stamp-meta:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, monospace"
    fontSize: "0.6875rem"
    letterSpacing: "0.04em"
rounded:
  mark: "2px"
  tag: "4px"
  control: "6px"
  notice: "8px"
  panel: "10px"
  sheet-side: "12px"
  sheet-bottom: "16px"
  pill: "9999px"
spacing:
  tag-gap: "5px"
  cell-x: "12px"
  cell-y: "10px"
  panel-x: "16px"
  panel-x-wide: "20px"
  section-gap: "24px"
  section-gap-wide: "32px"
  page-x: "16px"
  page-x-wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.on-seal}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.seal-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
  button-sm:
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  status-tag:
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0 8px 0 6px"
    height: "24px"
  filter-chip:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  filter-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  stamp:
    textColor: "{colors.seal-text}"
    typography: "{typography.stamp-word}"
    rounded: "{rounded.tag}"
    padding: "8px 12px 9px"
---

# Design System: Laguna College ITE Academic Advising

## Overview

**Creative North Star: "The Advising Passbook"**

The system is an academic ledger kept on cool paper. Rule-based results are printed as ledger entries: ruled tables, mono tabular figures, double-ruled totals. Human decisions are the only thing rendered as ink, in the form of the dean's seal-blue stamp. AI explanations live apart, as margin notes set off by a single hairline, never inside the ledger. Every result says where it came from (rule, dean, registrar, assistant), and the visual vocabulary keeps those four voices physically distinct.

Density is operational, not airy: 15px body, 40px controls, tables that fill their panels edge to edge. Containers are one level deep, hairline-edged and flat. The palette is a cool neutral ground with one accent (seal blue, from the Laguna College seal) and a set of status tones that only ever appear inside icon+text tags or map marks. The system explicitly refuses the generic card-and-metric admin dashboard: no KPI tiles, no stacked shadowed cards, no gradient headers.

Light and dark themes are both first-class; dark is a deep blue-black ledger (`#0d1120` paper) with lifted status tones, selected by OS preference or an explicit `data-theme` toggle.

**Key Characteristics:**
- Cool paper ground, white hairline panels, no decorative shadows.
- Ruled ledger tables with mono tabular figures and a double rule above totals.
- One accent, seal blue, used for primary actions, current-term markers, and the dean's stamp.
- Status always carried by icon + text (tags) or shape + fill (map marks), never colour alone.
- Three voices kept apart: printed ledger (rules), stamp (dean), margin note (assistant).

## Colors

A cool blue-grey paper system with a single seal-blue accent and a disciplined set of paired status tones (foreground + tint).

### Primary
- **Laguna Seal Blue** (`seal`): primary buttons, the "This semester" marker, the current-term ring on the curriculum map, the active nav icon, and the dean's stamp ink (via `seal-text`). In dark mode the fill lifts to `#4562d6` and the text/ink form to `#9fb3ff` so the stamp stays legible.
- **Seal Ink Deep** (`seal-hover`): hover state of seal-filled buttons only.
- **Seal Wash** (`seal-tint`): background of seal-toned tags (Enrolled, Requires Dean Review, Confirmed, Approved) and text selection.
- **Focus Blue** (`focus`): focus outlines (2px, 2px offset) and input focus border with a 3px 22% halo. Distinct from seal so focus never reads as a decision.

### Neutral
- **Cool Paper** (`paper`): page ground.
- **Ledger White** (`surface`): panels, inputs, sheets, active nav item.
- **Margin Grey** (`surface-2`): sidebar, ledger row hover, secondary button hover.
- **Sunken Grey** (`sunken`): ghost button hover, skeletons, avatar disc, inactive count badges.
- **Hairline** (`line`): panel edges, row rules, dividers.
- **Strong Rule** (`line-strong`): ledger header rule, totals double rule, input and secondary button borders, margin-note rule, empty-state dashed border.
- **Ledger Ink** (`ink`): primary text; also the fill of selected filter chips, active tab underline, and the 2px top rule of semester sections.
- **Ink Second** (`ink-2`): supporting copy, descriptions, ghost button text.
- **Ink Third** (`ink-3`): column headers, metadata, provenance lines, placeholders.

### Status tones (paired foreground + tint)
- **Ledger Green** (`ok` / `ok-tint`): Passed, Credited, Regular.
- **Eligible Teal** (`teal` / `teal-tint`): Eligible this semester.
- **Retake Red** (`bad` / `bad-tint`): Failed / For retake.
- **Prerequisite Amber** (`warn` / `warn-tint`): Blocked by prerequisite, Irregular.
- **Action Orange** (`act` / `act-tint`): Pending, Needs Action/Attention, open-request badge.
- **Record Violet** (`data` / `data-tint`): Record Update Needed (e.g. year standing not set) and scanned rows the dean must check.
- **Quiet Slate** (`mute` / `mute-tint`): Not yet taken, Not offered, awaiting states.

### Named Rules
**The One Ink Rule.** Seal blue is the only accent. It marks action, the current term, and the dean's decision; it is never used for decoration, data visualisation, or status of a rule result.

**The Paired Tone Rule.** Every status colour exists as a foreground/tint pair and appears only inside a tag (with its icon) or a map mark (with its shape). A status colour on its own, as a bar, dot, or text colour without an icon, is not part of the system.

**The Violet Means Data Rule.** Record violet is reserved for missing or incorrect maintained data. It never signals an academic outcome.

## Typography

**Display Font:** Geist Variable (with ui-sans-serif, system-ui)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable (with ui-monospace, SF Mono)

**Character:** A neutral, engineered grotesk carries all reading; its mono sibling carries every figure and subject code, so numbers line up like a passbook column. Stylistic sets `ss01` and `cv11` are on globally.

### Hierarchy
- **Display** (600, 2rem to 2.75rem at md, 1.1, -0.025em): the sign-in statement only.
- **Headline** (600, 1.75rem to 2rem at md, leading-tight, -0.02em): the person or page a screen is about (student name, record title). PageHeader uses the same step; 1.75rem (headline-sm) below md.
- **Title** (600, 1.125rem): panel and sheet headings ("Prescribed subject load", sheet titles).
- **Body** (400, 15px, 1.5): default reading text; long descriptions cap at 70ch, assistant answers at 68ch.
- **Body small** (400, 0.875rem): ledger cells, nav items, secondary copy; the workhorse size.
- **Label** (550, 0.75rem): status tags, column headers (500, `ink-3`), metadata and provenance lines.
- **Figure / Code** (Geist Mono, tabular-nums, -0.01em; codes at 0.8125rem, nowrap): units, grades, counts, student numbers, subject codes.
- **Stamp** (750, 1.0625rem, 0.14em tracked, uppercase word; mono 0.6875rem uppercase meta): the dean's stamp only.

### Named Rules
**The Mono Figures Rule.** Every number a user might compare (units, grades, counts, student numbers, totals) and every subject code is set in Geist Mono with tabular figures. Prose numbers in sentences stay in Geist.

**The Uppercase Belongs To The Stamp Rule.** Uppercase tracked lettering is the stamp's voice. Headings, labels, and column headers stay in sentence case.

## Layout

Two-column app shell on large screens: a 264px sticky sidebar on `surface-2` (brand, nav, current-term note, prototype notice, user block) beside a fluid content column. Below `lg` the sidebar becomes a 56px sticky top bar; students get a three-item fixed bottom tab bar (64px, safe-area padded), dean and registrar get a left drawer.

Pages are centred at 1120px (1360px for wide pages), padded 16px on phones and 32px from `md`, with 24/32/40px vertical padding stepping up by breakpoint. Content grids pair a fluid main column with a 340px right rail on `lg` (student overview: load ledger left, attention list and curriculum map right), gapped 24px, 32px on `lg`. Inside panels, headers and edge cells pad 16px, 20px from `md`; ledger cells pad 10px by 12px. Groups of ruled sections stack 40px apart.

Tables keep their ledger form on `md` and up and either scroll horizontally or collapse to stacked rows on phones. Tab and chip rows scroll horizontally edge-to-edge on phones (negative page margin) and wrap on `lg`.

## Elevation & Depth

The system is flat. Depth is expressed by tone (paper below, white panels above, `surface-2` chrome) and by hairlines, not shadows. The single shadow token belongs to overlays: sheets and the mobile drawer, over a 38% ink backdrop.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 24px 48px -12px rgb(18 23 41 / 0.22), 0 2px 6px rgb(18 23 41 / 0.06)`; dark: `0 24px 48px -12px rgb(0 0 0 / 0.6), 0 0 0 1px rgb(255 255 255 / 0.04)`): side and bottom sheets, navigation drawer.

### Named Rules
**The Hairline Not Shadow Rule.** Panels are separated by a 1px `line` border on `surface`; they never cast a shadow. The active nav item is lifted with a 1px ring of `line`, not a drop shadow.

**The One Level Rule.** A panel never contains another bordered panel. Inside a panel, structure comes from rules (row borders, header rule, double-ruled totals).

## Shapes

Corners are small and tiered by role: 2px for map marks, 4px for tags, the stamp, and focus outlines, 6px for buttons, inputs, and nav items, 10px for panels and 8px for inline notices and dashed empty states. Pills (fully round) are reserved for filter chips, avatars, and the seal image. Sheets round only their leading edge: 16px top corners as a bottom sheet, 12px left corners as a side sheet.

Lines carry most of the form: 1px hairlines for panels and rows, a 3px double rule above totals, a 2px solid `ink` top rule opening each semester section, dashed borders for empty states and for blocked map marks.

## Components

### Buttons
Compact, firm, quiet until pressed.
- **Shape:** gently squared (6px), 40px tall, 32px for the small size; weight 550, 0.875rem.
- **Primary:** seal fill with white text; hover deepens to `seal-hover`.
- **Secondary:** white with a `line-strong` border; hover shifts to `surface-2` and an `ink-3` border.
- **Ghost:** no chrome, `ink-2` text; hover fills `sunken`. Used for shell utilities and sheet close buttons (square icon buttons at 32 to 40px).
- **Press:** scales to 0.97 over 140ms (`ease-out`); removed under reduced motion. Disabled at 50% opacity.

### Status tags
The system's primary status carrier: icon plus phrase, never colour alone.
- **Style:** 24px tall, 4px corners, tone tint background with tone foreground, 14px bold Phosphor icon, 0.75rem/550 label.
- **Quiet variant:** transparent background, flush left, for use inside dense ledger rows.
- **Mapping:** fixed per status (e.g. Passed: check circle, ok; Blocked: lock, warn; Requires Dean Review: stamp, seal). New statuses get an icon and an existing tone pair.

### Filter chips and tabs
- **Filter chips:** 32px pills, `line-strong` border, `ink-2` text with a mono count; selected chips invert to `ink` fill on `paper` text.
- **Tabs:** 44px text tabs over a `line` baseline; the active tab is `ink` with a 2px `ink` underline and an inverted count badge. Selection is ink, not seal.
- **Segmented view switch:** used only where one dataset has two views of equal standing (Curricula: Curriculum structure / Current offerings). `sunken` track, the active segment is a `surface` lift with a hairline ring, ink text. Full width below md. Keyboard: arrow keys, Home and End move the selection; it controls one `tabpanel`. Page-level list tabs keep the underline style above. Also used for the dean's curriculum-year switch in the load workspace (short labels, an addable count per year when relevant), where the years are peers of one dataset.

### Panels
- **Corner Style:** 10px.
- **Background:** `surface` on `paper`.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px `line`.
- **Internal Padding:** 16px, 20px from `md`; panels holding a ledger have zero padding and a ruled header.

### Inputs / Fields
- **Style:** 40px (36px in toolbars), 6px corners, 1px `line-strong` border on `surface`; labels 0.8125rem/550 `ink-2` above. Selects use a drawn caret; search fields carry a 16px inset magnifier.
- **Focus:** border becomes `focus` with a 3px 22% `focus` halo.

### Navigation
- **Sidebar items:** 40px, 6px corners, 0.875rem/500, 18px Phosphor icon. Default `ink-2`, hover `sunken` fill; active is a white item with a 1px `line` ring and a filled seal icon. Count badges use the act tone in mono.
- **Mobile:** students get a bottom tab bar (22px icons, 0.6875rem labels, active in `seal-text`); other roles get a slide-in drawer on `surface-2` sharing the sheet motion.

### Ledger (signature)
The printed record of rule results.
- Full-width collapsed table, 0.875rem. Headers 0.75rem/500 `ink-3` over a `line-strong` rule; rows ruled in `line`, cells baseline-aligned.
- Codes in mono at 0.8125rem; units and grades right-aligned mono.
- Totals sit in a footer opened by a 3px double `line-strong` rule, weight 550.
- Interactive rows hover to `surface-2` (fine pointers only); rows that are blocked only by sequence are muted to `ink-3`.

### Semester sections (signature)
Curriculum progress is a stack of ruled ledger sections, not cards: a 2px `ink` top rule, a heading row (semester name, optional seal "This semester" marker, mono "n of m units completed") over a `line-strong` rule, then the ledger.

### Dean's stamp (signature)
The only element rendered as ink, and the single statement of a decision.
- 2px `seal-text` border plus a 1px outline offset 2px (double-ring impression), 4px corners, rotated -2.5deg, flat (no texture mask).
- Uppercase word (CONFIRMED / APPROVED) over mono meta lines for office and date.
- Fresh stamps press in over 320ms (scale 1.18 to 1, `ease-out`); reduced motion fades instead.
- Paired with one dated line; the decision is not restated elsewhere on the surface.

### Curriculum map marks (signature)
- 11px squares, 2px corners, 1.5px border in the status colour. Shape and fill carry the state: solid (done), crossed (failed), half-filled (pending), dashed border (blocked), `line-strong` outline (open).
- Always shown with a visible legend; the current-term cell gets a 1px seal ring.

### Margin note
The assistant's voice: no panel, just a 1px `line-strong` left rule and 16px indent, capped near 68ch, entering with a 220ms 6px rise. Always labelled with the "AI explanation, not an academic decision" source line.

### Provenance line
A 0.75rem `ink-3` line with a 13px icon naming the source: list-checks (rule-based evaluation), stamp (dean decision). Attached under any result whose origin matters.

### Switch
On/off for a current-term state (subject offerings). Checked track is `ink` (never seal), unchecked is `sunken` with an `ink-3` inset ring for 3:1 boundary contrast; the knob moves 16px with the strong ease-out. A 44px invisible hit area surrounds it. The label is carried by `aria-label`; no duplicate "Offered" text beside it.

### Modal
Centered dialog for focused edits with consequences (prerequisites). Enters with opacity plus 8px rise and 0.98 scale over 160–200ms ease-out; reduced motion drops the transform. Bottom-anchored on phones. Initial focus goes to the first input.

### Sheet
Subject detail and similar drill-ins open as a dialog: bottom sheet on phones (max 88dvh, grab handle), 480px right sheet from `md`. Slides on 280ms `ease-drawer` over a 38% backdrop; reduced motion cross-fades.

## Do's and Don'ts

### Do:
- **Do** set every comparable number and every subject code in Geist Mono with tabular figures.
- **Do** carry status with an icon + text tag or a shape-encoded map mark, using the tone pairs as defined.
- **Do** attach a provenance line wherever a rule result and a dean decision could be confused.
- **Do** close totals with the 3px double rule and open semester groups with the 2px ink top rule.
- **Do** keep panels flat: 1px `line` border, 10px corners, `surface` on `paper`.
- **Do** use ink (not seal) for selection states in tabs and filter chips.
- **Do** render a dean decision exactly once: the stamp plus one dated line.

### Don't:
- **Don't** build metric tiles, KPI cards, or a card-and-metric dashboard; the record is a ledger.
- **Don't** put a shadow on a panel, row, or card; the overlay shadow is for sheets and the drawer only.
- **Don't** use seal blue for anything that is not an action, the current term, or a dean decision.
- **Don't** render rule results or AI text as a stamp, or put AI explanations inside a ledger or panel; they are margin notes.
- **Don't** nest bordered panels inside panels.
- **Don't** signal status by colour alone (coloured text, dots, or bars without icon or shape).
- **Don't** use uppercase tracked lettering outside the stamp.
