# Agni Education Advisor Design System Proposal

## Purpose and scope

This document records the UI audit and approved design foundations for the admin, parent, and student experiences. Phase 1 is authorized and applies shared foundations only; it does not migrate application pages.

The audit describes the working tree as inspected on 2026-10-19. The semantic palette was already established before this Phase 1 update.

## Audit: implementation before Phase 1

### Styling architecture and tokens

- The app uses Tailwind CSS v4 through `@tailwindcss/postcss` in `postcss.config.mjs` and `@import "tailwindcss"` in `src/app/globals.css`. There is no separate `tailwind.config.*` file.
- `src/app/globals.css` currently declares a Tailwind `@theme` palette: `sidebar`, `primary`, `page`, `surface`, `content`, `secondary`, `border`, `success`, `warning`, and `category`. It also declares a derived `sidebar-muted` color.
- Global CSS supplies page defaults, `.shell`, `.card`, `.muted`, `.pill` state classes, form controls, button variants, status classes, and short-viewport sidebar adjustments.
- A few legacy selectors remain, including `.primary-link`, `.secondary-button`, and `.rounded-md.bg-slate-900`. Generic `button` elements still inherit primary styling unless given a recognized variant.
- Many screens also use Tailwind’s default `slate-*`, `cyan-*`, and other color classes directly. The admin landing page is more tokenized than several catalog, consultation, family, and student screens.

### Reusable UI and variants

- Shared React UI is limited to `AuthenticatedShell` and `AppShell` in `src/components/shell`. The shell includes local `Sidebar`, `WorkspaceSwitcher`, `NavGroup`, `SidebarNavItem`, `Topbar`, and `UserMenu` components.
- The admin landing page has local `Metric` and `ActionCard` components. Forms have domain-specific components such as `ImportWorkbench`, `AssociationForm`, and `ProposalForm`.
- There is no general-purpose Button, Card, Badge, or form-field React component, and no component-library dependency. Visual reuse currently comes from CSS class names and repeated Tailwind strings.
- Current CSS button variants include primary, secondary, ghost, sidebar, and avatar treatments, alongside the older `primary-link` and `secondary-button` names. Adoption is partial; unclassified form buttons receive the global primary style.

### Consistency findings

- **Color:** the new semantic palette is in place, but direct default-palette utility colors remain elsewhere. Catalog pages mostly depend on global primitives while dashboard pages use utility-heavy styling.
- **Typography:** `body` sets Arial globally. Tailwind text-size, weight, tracking, and leading classes are used on the dashboard, while older `.shell` pages rely more on browser heading defaults. There is no documented type scale.
- **Spacing:** Tailwind spacing is common on newer pages. Older pages use `.shell` with fixed `40px 24px` padding and inline layout styles; dashboards use responsive utility padding. No spacing or page-container rules are documented.
- **Borders and surfaces:** `.card` now uses a shared surface and border token, but many newer cards repeat border, radius, surface, and sometimes shadow utilities. Radius and elevation are not defined as system rules.
- **Buttons:** global button styling can compete with Tailwind utility classes because it is unlayered CSS. Variant names and usage are not documented, and some older buttons depend on compatibility selectors.
- **Navigation:** the shared shell has a teal active state and muted inactive items; page-level links and action controls vary by route.

### Responsive layout and scrolling

- `AppShell` uses a full-viewport `h-dvh` flex frame with `overflow-hidden`; the sidebar is fixed on small screens and static on desktop. The main area is the vertical scroller.
- The sidebar is a flex column with hidden overflow and a bottom-pushed logout section. At short heights, CSS reduces spacing and hides the advisory copy so navigation remains visible.
- The admin overview uses responsive Tailwind grid breakpoints. The catalog's `.grid` layout uses inline `auto-fit` sizing. Older `.shell` pages use a fixed maximum width and fixed horizontal padding without a documented small-screen rule.
- Several page roots still include `min-h-screen`; these coexist with the shell's internal scroll container and should be reviewed during any layout migration.

### Icons and accessibility / interaction patterns

- `@phosphor-icons/react` is the installed icon library. The shared shell uses Phosphor icons; the admin overview uses the server-renderable Phosphor entry point for its action icon. Older screens still use text arrows and other glyphs.
- Existing accessibility patterns include named navigation landmarks, labels wrapping form controls, `aria-label` for icon-only shell controls, `aria-hidden` for decorative icons, `role="alert"` / `role="status"`, disabled states, and a global `:focus-visible` outline.
- Gaps to address as components are standardized: active links do not currently set `aria-current`; icon treatment and decorative-icon hiding are not uniform; focus styles are global rather than variant-specific; and minimum control target size is not documented.
- Status copy often accompanies color, which is good. Future status treatments should continue to include visible text or another non-color cue.

### Engineering constraints

The existing root `AGENTS.md` is the source of important product and engineering rules. In particular, it requires App Router server components/routes to own database access, server-only secrets and privileged mutations, exact owner checks for family/student records, admin gates for catalog operations, strict handling of sensitive minor and financial data, sourced and freshness-labelled catalog facts, and targeted verification of complete user journeys. UI work must preserve those boundaries and must not add client exposure, logs, exports, or retention changes for private records.

## Proposed design foundations

### 1. Tokens

Keep Tailwind v4 and define system-wide semantic tokens in the existing `@theme` block. Use those tokens instead of adding a theme package or a second configuration layer.

| Token | Value | Use |
| --- | --- | --- |
| `sidebar` | `#0B1224` | Navigation surface |
| `primary` | `#155E6C` | Primary actions, links, active navigation |
| `page` | `#F3F6F8` | App canvas |
| `surface` | `#FFFFFF` | Cards, forms, dialogs |
| `content` | `#182538` | Main text and text on tinted status surfaces |
| `secondary` | `#64748B` | Supporting text on white surfaces |
| `border` | `#DCE4EB` | Neutral borders and dividers |
| `success` | `#168568` | Confirmed / healthy states |
| `warning` | `#B76B16` | Review-needed states; use dark text on warning tints |
| `category` | `#7956C6` | A clearly identified special category, not decoration |

Use small `color-mix()` tints derived from these tokens for status backgrounds. On `page` surfaces, prefer `content` for small text because `secondary` reaches only about 4.38:1 on the page canvas. Use `secondary` for input and secondary-button outlines where a visible control boundary needs at least 3:1; keep `border` for card borders and dividers. On `sidebar`, use a derived light-muted token; the exact secondary token is too dim there. Do not add ad hoc hex values or use status colors for decorative variety.

### 2. Typography and spacing

- Keep the existing Arial/Helvetica system stack; do not add a font dependency. Phase 1 formalizes it as the `font-sans` theme token.
- Use `text-page-title` (30/36), `text-section-title` (20/28), `text-card-title` (16/24), `text-body` (14/20), and `text-supporting` (12/16). Pair each role with a consistent weight; existing pages adopt these utilities during later migrations.
- Use Tailwind's existing 4px spacing rhythm. Prefer 8, 12, 16, 24, 32, and 40px for common UI gaps and page padding.
- Establish one responsive page container rule for content width and gutters. Replace inline spacing/layout styles only as pages are migrated, not in a blanket cleanup.

### 3. Component variants

Build on the existing CSS and Tailwind setup. Do not add a component library or class-composition dependency.

- **Buttons:** use `button-primary` for the main action, `button-secondary` for outlined/surface actions, `button-ghost` for low emphasis, `button-sidebar` for neutral actions on navy, `button-avatar` for the user control, and `button-icon` with a visual variant for icon-only controls. Keep disabled, hover, active, and visible focus states consistent. During this phase, unclassified buttons retain a primary compatibility fallback in the base layer so existing routes do not lose styling. New buttons must name a variant; remove the fallback only after route migration.
- **Cards:** neutral surface, consistent border and radius; an interactive card adds hover/focus feedback without a large shadow or movement. Keep metric cards visually neutral.
- **Status badges:** semantic status variants for success, warning/review, neutral, and category. Include text labels and use color as a supporting cue.
- **Forms:** consistent label, input, help, error, and disabled treatments. Associate help and error messages with their fields where practical.
- **Navigation:** shared sidebar and page navigation rules, clear active state, `aria-current="page"`, visible keyboard focus, and a neutral logout action.

Start with shared CSS variant classes and existing local components. Extract a React primitive only when it removes repeated behavior or improves accessibility; keep native `button` and `Link` semantics intact. Do not introduce a component framework solely to standardize class strings.

#### Approved patterns

Keep native elements and their behavior. Use a semantic variant class, then Tailwind utilities for local layout and sizing:

```tsx
import { ArrowRight, Bell } from "@phosphor-icons/react";

<button type="submit" className="button-primary rounded-lg px-4 py-2 text-sm">
  Save changes
</button>
<button type="button" className="button-secondary rounded-lg px-4 py-2 text-sm">
  Cancel
</button>
<button type="button" className="button-ghost button-icon rounded-lg" aria-label="Notifications">
  <Bell size={18} aria-hidden="true" />
</button>
<button type="button" className="button-sidebar rounded-lg px-3 py-2 text-left">
  Switch workspace
</button>
<Link className="button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2" href="/consultations">
  Open consultations <ArrowRight size={16} aria-hidden="true" />
</Link>
```

Icon-only controls need a stable accessible name; combine `button-icon` with a visual variant when a 40px minimum target is needed. For cards and statuses, retain the existing CSS primitives and visible labels:

```tsx
<article className="card">
  <h2 className="text-card-title font-semibold">Active families</h2>
  <p className="text-supporting text-secondary">Owner-scoped profiles</p>
</article>
<span className="status-warning rounded-md border px-2 py-1 text-sm">Needs review</span>
```

Use `.card-interactive` only on a genuinely interactive card, and provide the enclosing link/button semantics. Status text must remain understandable without its color.

### 4. Layout and scrolling conventions

- Preserve the existing app-shell model: viewport-sized outer frame, fixed-height non-scrolling sidebar, and one main vertical scroll region.
- Use `min-h-0` on flex children that contain the main scroller. Do not add page-level scrolling or absolute-positioned footer controls.
- Keep navigation reachable at short viewport heights through deliberate compaction; do not allow sidebar items to overlap or be clipped.
- Use responsive grid breakpoints for content columns and a shared page container for gutters. Avoid inline styles for routine layout.

### 5. Icon and accessibility rules

- Use Phosphor for new UI icons; use a consistent size/weight within each context. Avoid text glyphs as substitutes for interface icons.
- Mark decorative icons `aria-hidden="true"`. Give icon-only controls a stable accessible name and visible focus state.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text and meaningful control boundaries. Never rely on color alone for status.
- Keep heading order, label associations, keyboard access, disabled state feedback, and live status/error announcements intact when extracting components.

### 6. Engineering rules for UI work

- Put design tokens and small reusable visual primitives in `src/app/globals.css`; use Tailwind utilities for composition and responsive layout.
- Prefer semantic tokens (`bg-page`, `text-content`, `border-border`, etc.) over raw palette classes for product surfaces.
- Keep server components as the default. Add client components only for actual browser interaction; do not move database access or privileged checks into the client.
- Preserve Auth.js gates, family ownership checks, catalog provenance/freshness, and the privacy requirements in the existing root `AGENTS.md`.
- Do not add dependencies, change copy/behavior, or alter data handling as incidental design-system work.

## Approved agent guidance (added in Phase 1)

The repository has a root `AGENTS.md` with security and product requirements. The concise section below has been appended to it; all existing engineering, security, privacy, and product instructions remain intact:

```md
## Design system

- Use the semantic Tailwind v4 tokens and shared variants in `src/app/globals.css`; do not add raw product colors or a UI-library dependency.
- Use Phosphor icons for new interface icons. Mark decorative icons hidden from assistive technology and label icon-only controls.
- Prefer existing shell, card, status, and button patterns. Add a shared component only when it removes repeated behavior or improves accessibility.
- Keep the app-shell sidebar fixed and non-scrolling; keep vertical page scrolling in the main content region.
- Preserve visible keyboard focus, WCAG AA text contrast, semantic status labels, responsive layouts, and native link/button behavior.
- Keep server-first data access, authorization, privacy, and catalog provenance rules from this file intact during UI changes.
```

## Approved decisions and scope

The user approved the existing semantic palette, Tailwind CSS v4, Phosphor icons, system fonts with a formal type scale, the admin interface as the initial pilot, and shared CSS variants before considering React primitives. Unconnected controls remain unchanged and their functionality is a separate task.

Phase 1 requires no further approval. Later page migrations remain gated on review. Changing the palette, adding a UI library/font dependency, changing unconnected controls, or changing product behavior requires a separate decision.

## Phased implementation plan and validation

### Phase 0 — Baseline and decisions (complete)

- The decisions above are confirmed.
- Captured the existing admin dashboard in the running app at its default desktop size, 390×844 (mobile), and 1365×600 (short desktop) before Phase 1 edits. The mobile baseline shows the existing open drawer overlay. Captures are retained in the task record.
- Parent/student pages remain outside this phase.

### Phase 1 — Foundations (complete)

- Formalize the existing semantic palette, system font, typography and radius tokens, focus treatment, and explicit CSS variants in the current Tailwind/CSS architecture.
- Add the design-system guidance to the existing `AGENTS.md` without removing or weakening its engineering/security rules. Document reusable button, card, and status patterns with concrete code examples.
- Preserve compatibility styles during migration: generic buttons remain primary until their route is migrated; retain legacy `.primary-link`, `.secondary-button`, and `.rounded-md.bg-slate-900` mappings and document them.
- Do not edit application route or component files in this phase.
- Validation results are listed below.

#### Phase 1 validation results

- Baseline admin screenshots were captured before edits at the default desktop viewport, 390×844, and 1365×600. Post-change responsive checks covered the same widths/heights. At mobile width, the dashboard fits the viewport with its menu closed; the main content scrolls vertically. At 1365×600, the compact sidebar remains visible and the logout area stays at its bottom.
- Keyboard check: Tab focus is visible on the workspace selector. The app-shell navigation and dashboard remained available; no control behavior was changed.
- Palette contrast calculation: primary on surface is 7.37:1; secondary text on surface is 4.76:1; secondary on page is 4.38:1, so use content text on page for small copy; secondary control outlines on surface are 4.76:1; sidebar-muted against navy exceeds 8:1. Status labels use content text on tinted backgrounds. The pale border token is reserved for cards/dividers because it is only 1.29:1 against white.
- `npm test`: passed, 66 tests passed; 9 database integration tests skipped because `TEST_DATABASE_URL` was unset.
- `npm run typecheck`: passed after the build completed. An initial parallel invocation raced Next.js `.next/types` regeneration and failed on missing generated files; the sequential rerun passed.
- `npm run lint`: passed with two existing warnings in `eslint.config.mjs` and `postcss.config.mjs`.
- `npm run build`: passed. Next emitted existing warnings that `experimental.useWasmBinary` is unsupported on this platform.
- Browser screenshots came from the existing browser session. The browser's stylesheet did not expose the newly compiled theme variables after reload, so rendered verification of the changed CSS is limited to successful production compilation and the browser's layout/keyboard checks.

### Phase 2 — Admin pilot (awaiting approval)

- Migrate the app shell, admin overview, catalog operations, and consultation review to the shared foundations and variants.
- Preserve authorization, route targets, import/review states, provenance labels, and existing data semantics.
- Validation: compare desktop/mobile screenshots; keyboard-test navigation and forms; check short viewport scrolling; confirm ordinary-user denial and admin access; verify empty/loading/error/success states.

### Phase 3 — Parent and student rollout (future phase)

- Migrate family, finance, student, consultation-detail, and shortlist screens using the same tokens and components. Keep sensitive data visibility and owner boundaries unchanged.
- Validation: exercise owner/admin access boundaries and the main create/edit/review journeys; verify source, currency, and confirmation labels remain visible; repeat responsive and keyboard checks.

### Phase 4 — Adoption guardrails

- Optionally add lint checks only after legacy styles have been migrated, so checks do not create noisy exceptions.
- Validation: search for direct palette colors and legacy variants; document intentional exceptions; rerun `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` when practical.

## Acceptance criteria

- Semantic tokens are the normal source for UI colors; intentional status colors are labelled and contrast checked.
- Shared button, card, status, and navigation conventions are used in migrated routes without a new component-library dependency.
- Typography, spacing, border, and page-container rules are documented and applied consistently to migrated screens.
- Sidebar and main-area scrolling remain correct at desktop, mobile, and short viewport heights.
- Keyboard focus, accessible names, heading/label semantics, and status announcements are preserved or improved.
- All role checks, ownership boundaries, catalog evidence, and sensitive-data handling remain unchanged.
- Validation results and any checks blocked by unavailable runtime data are recorded separately from confirmed defects.
