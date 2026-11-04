# Sudoku

A Sudoku game built as a PWA (SPA, game state saved in `localStorage`, installable on the home screen).

- Puzzle generator with a guaranteed unique solution (backtracking + uniqueness check), 4 difficulty levels.
- A new-game screen and a game screen (notes/pencil marks, highlighting, undo, remaining-digit counters, optional color hints, sounds).
- The saved state lets you resume an unfinished game after closing the browser/app.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test        # single run
npm run test:watch  # watch mode
```

Unit tests (Vitest) cover the pure logic: the Sudoku generator/solver, game state mutations, ripple animations and `localStorage` persistence. There are no React component tests.

## Deploy

A push to the `main` branch triggers `.github/workflows/deploy.yml`, which builds the project and publishes it to GitHub Pages (requires enabling it in the repo settings: **Settings → Pages → Source: GitHub Actions**). Vercel is connected in parallel (through the Vercel UI).

## Documentation

The docs are written in Polish.

- [`docs/LOGIKA_BIZNESOWA.md`](docs/LOGIKA_BIZNESOWA.md) — game rules and app behavior from the player's perspective.
- [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md) — code structure, patterns, technical decisions.
