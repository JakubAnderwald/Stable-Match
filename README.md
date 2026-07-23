# 🐴 Stable Match — Tinder for Horses

Swipe through a paddock of funny horse dating profiles and "Neigh!" (like) or
"Pass" on each one. A playful, self-contained, **zero-build** single-page demo:
a draggable card stack, keyboard and button controls, a mocked "It's a Match!"
celebration, a live matches counter, and a friendly empty state with reshuffle.
No framework, no bundler, no npm dependencies, no backend — just four plain files
that run straight from your file system, fully offline.

## Features

- 🃏 **Swipeable card stack** — the top horse sits over 2–3 cards peeking behind.
- 🎮 **Three ways to decide** — Pass/Neigh! buttons, ← / → arrow keys, and
  left/right drag with a release threshold.
- ✨ **Tactile animations** — cards tilt as you drag, fling off-screen on a
  decision, and the next card animates up (all `transform`/`opacity`).
- 💚 **Mocked matching** — liking a horse triggers "It's a Match!" ~50% of the
  time, names the horse, and bumps the **Matches: N** counter.
- 🐴 **~10 seed horses** — diverse, punny profiles with emoji "photos" and warm
  CSS gradients.
- 🌾 **Empty state + reshuffle** — swipe the whole stable, then "Start over" to
  shuffle a fresh deck.
- 📱 **Mobile-first & themed** — a warm meadow/stable palette that holds from
  ~360px phones up to desktop.
- ♿ **Respects `prefers-reduced-motion`** — motion is disabled when you ask your
  OS to reduce it; the app stays fully usable.

## How to run

No install, no build step, no server required — it works offline over `file://`.

**Option A — just open it:**

Double-click `index.html` (or open it in any modern browser).

**Option B — serve it locally:**

```bash
npx serve .
```

Then open the printed URL (e.g. `http://localhost:3000`). Behavior is identical
either way.

## Project structure

```
index.html      App shell (loads data/horses.js then app.js as classic scripts)
styles.css      Palette, layout, card stack, animations, reduced-motion
app.js          State, rendering, decisions, pointer drag, match logic
data/horses.js  The global HORSES array (~10 profiles)
```

---

Built end-to-end by [Archon](https://github.com/coleam00/archon) as a demo of its
autonomous AI workflow capabilities.
