# Product

## Register

product

## Users

Anime watchers deciding what to watch. They arrive to answer a concrete question
("what's airing this season?", "what's coming next season?", "when's the next episode
of the show I follow?") and they scan, they don't read. Sessions are short, often
on a phone, often in downtime (commute, break, before bed). Fluency with the domain
is high (they know seasons, studios, formats); patience for chrome is low.

## Product Purpose

A fast seasonal schedule for anime. Pick a season and year, scan a dense grid of
posters, glance the next-episode countdown, open a title for detail. Data comes from
AniList and is cached at the edge so it stays instant and never trips the rate limit.
Success = a user finds what's airing and when, in seconds, and trusts the data.

## Brand Personality

Sharp, current, quietly enthusiast. Three words: **glanceable, seasonal, considered**.
The poster art is the star; the interface is the frame around it. Energy comes from
the content and one seasonal accent, not from decorated chrome. It should feel like a
well-built broadcast guide, not a fan-site and not a generic SaaS dashboard.

## Anti-references

- **MyAnimeList / classic aggregators**: dense, dated, cluttered with boxes and ads.
- **Generic dark SaaS dashboards**: violet-on-charcoal with no point of view.
- **AI-slop landing pages**: gradient text, glass cards, eyebrow kickers, hero-metric
  templates. This is a tool, not a pitch.

## Design Principles

1. **Poster art is the hero.** Chrome recedes; color and contrast serve the artwork.
2. **Glance over read.** Every card answers "what / how good / when" without a click.
3. **Color carries the season.** The accent hue _is_ the current season: meaning, not
   decoration. State you can feel.
4. **Earned familiarity.** Standard affordances (tabs, selects, modal) done precisely.
   No invented controls; the tool disappears into the task.
5. **Instant, honest, resilient.** Cached and fast; every state (loading, empty, error)
   is designed, not defaulted.

## Accessibility & Inclusion

- Target WCAG 2.1 AA: body/label text ≥ 4.5:1, large text ≥ 3:1, verified per token.
- Full keyboard path: focus-visible rings on every interactive element; modal closes on
  Esc and restores focus; grid is native links.
- `prefers-reduced-motion` honored on every animation (crossfade / instant fallback).
- Season accent is never the _only_ signal: countdown text, status label, and icons
  carry meaning independent of hue (color-blind safe).
