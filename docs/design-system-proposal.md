# Agni Education Advisor Design System Proposal

## Purpose and scope

This document records an audit of the current UI and proposes a practical design system for the admin, parent, and student experiences. It is a proposal only: it does not authorize a page redesign or a broad UI migration.

The audit describes the working tree as inspected on 2026-10-19. The palette and button styles in `src/app/globals.css` are present in the current working tree; they may still be uncommitted changes.

## Audit: current implementation

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

Use small `color-mix()` tints derived from these tokens for status backgrounds. On `page` surfaces, prefer `content` for small text where the exact secondary token falls below AA contrast. On `sidebar`, use a derived light-muted token; the exact secondary token is too dim there. Do not add ad hoc hex values or use status colors for decorative variety.

### 2. Typography and spacing

- Keep the existing system font stack initially; do not add a font dependency as part of tokenization.
- Document a compact scale: page title 30/36, section title 20/28, card title 16/24, body 14/20, supporting text 12/16. Use a consistent weight and line-height for each role.
- Use Tailwind's existing 4px spacing rhythm. Prefer 8, 12, 16, 24, 32, and 40px for common UI gaps and page padding.
- Establish one responsive page container rule for content width and gutters. Replace inline spacing/layout styles only as pages are migrated, not in a blanket cleanup.

### 3. Component variants

Build on the existing CSS and Tailwind setup. Do not add a component library or class-composition dependency.

- **Buttons:** primary (one main action), secondary (outlined/surface action), ghost (low-emphasis action), sidebar (neutral on navy), and icon-only (fixed accessible name and adequate hit area). Keep disabled, hover, active, and visible focus states consistent. Do not style every unclassified button as primary indefinitely; migrate call sites to explicit variants before changing the default.
- **Cards:** neutral surface, consistent border and radius; an interactive card adds hover/focus feedback without a large shadow or movement. Keep metric cards visually neutral.
- **Status badges:** semantic status variants for success, warning/review, neutral, and category. Include text labels and use color as a supporting cue.
- **Forms:** consistent label, input, help, error, and disabled treatments. Associate help and error messages with their fields where practical.
- **Navigation:** shared sidebar and page navigation rules, clear active state, `aria-current="page"`, visible keyboard focus, and a neutral logout action.

Start with shared CSS variant classes and existing local components. Extract a React primitive only when it removes repeated behavior or improves accessibility; keep native `button` and `Link` semantics intact. Do not introduce a component framework solely to standardize class strings.

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

## Proposed lightweight agent guidance

The repository already has a root `AGENTS.md` with extensive security and product requirements. Do not replace it. If this proposal is approved, append a short design-system section like this to that file:

```md
## Design system

- Use the semantic Tailwind v4 tokens and shared variants in `src/app/globals.css`; do not add raw product colors or a UI-library dependency.
- Use Phosphor icons for new interface icons. Mark decorative icons hidden from assistive technology and label icon-only controls.
- Prefer existing shell, card, status, and button patterns. Add a shared component only when it removes repeated behavior or improves accessibility.
- Keep the app-shell sidebar fixed and non-scrolling; keep vertical page scrolling in the main content region.
- Preserve visible keyboard focus, WCAG AA text contrast, semantic status labels, responsive layouts, and native link/button behavior.
- Keep server-first data access, authorization, privacy, and catalog provenance rules from this file intact during UI changes.
```

## Decisions needing product/design approval

The palette values are already user-specified and appear in the current working tree, so they do not need to be re-approved. Approval is only needed before changing those base values or introducing additional base colors.

1. **Rollout gate:** agree that the admin area is the visual pilot and approve review before the changes are extended across parent/student pages. The recommendation is one shared foundation for all roles, not separate color systems.
2. **Typography:** retain Arial/system fonts (recommended for the first pass) or approve a branded typeface and the associated asset/licensing/performance work.
3. **Component extraction threshold:** agree whether CSS variants are enough initially or whether a small internal Button/Card primitive should be created during the first implementation phase. The recommendation is to start with CSS variants and extract only where shared behavior justifies it.
4. **Navigation controls:** decide whether currently visible but unconnected controls such as Search, New, date range, and Notifications are intentionally placeholders or should be removed/connected in a separate product task. This audit does not change their behavior.

## Phased implementation plan and validation

### Phase 0 — Baseline and decisions

- Confirm the palette and scope decisions above.
- Capture representative admin, catalog, parent, and student screens at desktop and mobile widths. Record current behaviors and protected-route boundaries.
- Validation: inventory routes/components and baseline screenshots are available; no UI files changed.

### Phase 1 — Foundations

- Finalize semantic tokens, typography roles, spacing/container rules, focus treatment, and button/status conventions in the current Tailwind/CSS architecture.
- Remove or map legacy aliases deliberately; do not change behavior as part of this cleanup.
- Validation: no new dependency; token inventory is the single source of truth; contrast checked for every text/status pairing; `npm run typecheck`, `npm run lint`, and `npm test` pass.

### Phase 2 — Admin pilot

- Migrate the app shell, admin overview, catalog operations, and consultation review to the shared foundations and variants.
- Preserve authorization, route targets, import/review states, provenance labels, and existing data semantics.
- Validation: compare desktop/mobile screenshots; keyboard-test navigation and forms; check short viewport scrolling; confirm ordinary-user denial and admin access; verify empty/loading/error/success states.

### Phase 3 — Parent and student rollout

- Migrate family, finance, student, consultation-detail, and shortlist screens using the same tokens and components. Keep sensitive data visibility and owner boundaries unchanged.
- Validation: exercise owner/admin access boundaries and the main create/edit/review journeys; verify source, currency, and confirmation labels remain visible; repeat responsive and keyboard checks.

### Phase 4 — Adoption guardrails

- Add the approved concise design-system section to root `AGENTS.md`. Optionally add lint checks only after legacy styles have been migrated, so checks do not create noisy exceptions.
- Validation: search for direct palette colors and legacy variants; document intentional exceptions; rerun `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` when practical.

## Acceptance criteria

- Semantic tokens are the normal source for UI colors; intentional status colors are labelled and contrast checked.
- Shared button, card, status, and navigation conventions are used in migrated routes without a new component-library dependency.
- Typography, spacing, border, and page-container rules are documented and applied consistently to migrated screens.
- Sidebar and main-area scrolling remain correct at desktop, mobile, and short viewport heights.
- Keyboard focus, accessible names, heading/label semantics, and status announcements are preserved or improved.
- All role checks, ownership boundaries, catalog evidence, and sensitive-data handling remain unchanged.
- Validation results and any checks blocked by unavailable runtime data are recorded separately from confirmed defects.
