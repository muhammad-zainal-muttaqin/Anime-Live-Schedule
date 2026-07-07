# Design

Visual system for AnimeSeasons. Source of truth: `src/styles.css` (tokens);
this file describes intent so any agent stays on-brand. Register: **product**.

## Theme

Dark-first, cool near-black. The interface is a quiet frame; poster artwork
supplies the color and energy. One accent carries meaning, not decoration:
its hue **is the current season**, so the whole shell shifts identity as you
move winter → spring → summer → fall. Applied via `[data-season]` on the page
wrapper, which recomputes every accent token from three variables (`--accent-h`,
`--accent-strong-l`, `--accent-ink`). The three are registered with `@property`
so a season switch morphs the shell's accent over 0.5s instead of snapping.

## Color

All values OKLCH. Every text/background pair below is verified against WCAG AA
(body/label ≥ 4.5:1, large ≥ 3:1).

### Neutrals (surfaces + ink)

| Token             | Value                    | Role                      |
| ----------------- | ------------------------ | ------------------------- |
| `--bg` / `canvas` | `oklch(0.16 0.012 265)`  | Page background           |
| `--surface`       | `oklch(0.205 0.014 265)` | Cards, modal, inputs      |
| `--surface-2`     | `oklch(0.245 0.015 265)` | Secondary chips, banners  |
| `--elevated`      | `oklch(0.275 0.016 265)` | Hover surfaces, menus     |
| `--border`        | `oklch(1 0 0 / 0.09)`    | Hairline                  |
| `--border-strong` | `oklch(1 0 0 / 0.16)`    | Hover/emphasis border     |
| `--ink`           | `oklch(0.97 0.005 265)`  | Primary text (17.8:1)     |
| `--ink-muted`     | `oklch(0.74 0.012 265)`  | Secondary text (8.4:1)    |
| `--ink-subtle`    | `oklch(0.62 0.014 265)`  | Tertiary / labels (5.3:1) |

### Season accent

Derived tokens: `--accent` (accent text on dark, L 0.74), `--accent-strong`
(filled buttons / active tab), `--accent-ink` (text on the fill), plus soft
(`/0.14`), line (`/0.32`), and ring (`/0.6`) alphas.

| Season | Hue | Character   | Fill L / ink      | Min contrast |
| ------ | --- | ----------- | ----------------- | ------------ |
| Winter | 248 | Ice blue    | 0.54 / white      | 5.0:1        |
| Spring | 352 | Sakura rose | 0.55 / white      | 5.3:1        |
| Summer | 195 | Aqua        | 0.74 / near-black | 8.6:1        |
| Fall   | 62  | Ember amber | 0.78 / near-black | 8.7:1        |

Accent is used only for: primary actions, current selection (active season),
next-episode countdown, hover/focus emphasis, and a low-opacity ambient page
glow. Never for decoration or large flat fills.

### Semantic (non-brand, stable across seasons)

Score = amber-300. Status dots: RELEASING emerald, FINISHED slate, UPCOMING
sky, CANCELLED rose, HIATUS amber. These carry their own meaning and are not
re-tinted by season.

## Typography

- One family: **Inter** (system-ui fallback). No display pairing; product UI.
- Fixed rem scale (not fluid): brand 1.125rem, section title 1.5rem, modal title
  1.25rem, body 0.875rem, labels 0.75rem, micro 0.625-0.6875rem.
- `text-wrap: balance` on h1-h3; `text-pretty` on long description prose.
- `tabular-nums` on all countdowns, scores, and years so digits don't jitter.

## Components

Every interactive element ships default / hover / focus-visible states; focus
ring is `2px var(--accent-ring)` with a 2px offset (global `:focus-visible`
fallback + explicit per-control rings).

- **AnimeCard**: 2:3 poster, ring hairline; hover lifts the poster 6px + zooms
  art 6% + swaps the hairline for an accent line and a season-tinted glow shadow
  (`.card-poster`). Score, non-TV format, and season-accent countdown pill
  overlay the art on a legibility scrim. Redundant "TV" badge suppressed.
- **SeasonYearPicker**: segmented season control (active = accent fill) that
  never scrolls. Below `xs` (27rem) every tab is emoji-only; from `xs` the
  active tab's label expands via an animated 0fr→1fr grid column (300ms,
  ease-out-expo); from `sm` all labels show. Year `<select>` with chevron
  affordance, prev/next season buttons.
- **Detail modal**: bottom sheet on mobile, centered dialog ≥ sm. Banner +
  overlapping poster, meta row, accent-soft countdown callout, genre chips,
  description capped to 68ch, streaming links with brand-color dots. Esc / backdrop
  close, scroll lock, focus restored to opener.
- **States**: skeletons (not spinners) for loading; empty + error states with
  icon, message, and one action.

## Layout

- Container max-width 1440px; fluid padding 1rem → 2rem.
- Grid: 2 cols (mobile) → 6 (xl), `gap-x-4 gap-y-7`. Intentional breakpoints, not
  auto-fit, to control density.
- Sticky season picker under the brand so switching stays reachable while scrolled.
- z-scale: sticky header 30, modal 50.

## Motion

Motion is felt, not watched. It runs on the compositor (opacity + transform
only), stays out of the way of a glanceable scan, and every piece has an off
switch under `prefers-reduced-motion`. Durations 150–500 ms, exponential
ease-out (`--ease-out-quint`, `--ease-out-expo`), no bounce.

- **Grid entrance, two cooperating layers.** The container settles up once on
  mount (`.grid-in`, 0.5s) so a season/filter switch arrives as one unit instead
  of snapping. Then each poster/row greets you *as it scrolls into view*
  (`.reveal-cards` / `.reveal-rows`): a rise + fade + hairline scale on a native
  **scroll-driven timeline** (`animation-timeline: view()`). Timing is **linear**
  on purpose — the scroll gesture supplies the easing, so a CSS curve on top
  would double-ease. The range is short (`entry` only) so an item settles just
  after it appears and then holds still; no transform is bound to continued
  scrolling, so a 100-card grid never smears or wobbles. The reveal is gated
  behind `@supports (animation-timeline: view())` **and**
  `prefers-reduced-motion: no-preference`; where either fails (older Safari,
  reduced motion, headless SSR) cards are simply visible. Motion only ever
  enhances a visible baseline — content is never gated behind a reveal, and no
  JS runs on the scroll path.
- **Hover** (`.card-poster`): the poster lifts 6px and gains a season-tinted
  glow shadow; the art zooms 6% behind it. Fast (~320ms), reads as a response,
  not a performance. Modal opens sheet-up (mobile) / pop-in (≥sm) over a fading,
  blurred backdrop.
- **Season switch** morphs the accent hue (0.5s, registered `@property`
  variables); the ambient glow follows via unregistered `--glow-h` so it snaps
  in one repaint instead of rasterizing a full-viewport gradient per frame.
- **CSS virtualization**: long grids/lists set `content-visibility: auto` on
  children (`.cv-cards` / `.cv-rows`), so offscreen cards skip style, layout, and
  paint; a 100+ card season switch only renders the viewport. The scroll reveal
  is compatible: a view-timeline is a pure function of scroll offset, so a
  still-skipped card resolves to the correct frame the instant it renders.
- `prefers-reduced-motion` collapses transforms to a crossfade and neutralizes
  transitions and animations globally; the scroll reveals are absent entirely
  (gated above), so nothing can stick at `opacity: 0`.
