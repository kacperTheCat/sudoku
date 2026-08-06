# Sudoku

Gra w sudoku jako PWA (SPA, zapis stanu w `localStorage`, instalowalna na ekranie głównym).

- Generator plansz z gwarantowanym jednym rozwiązaniem (backtracking + kontrola unikalności), 4 poziomy trudności.
- Ekran generowania gry i ekran gry (notatki/pencil marks, podświetlanie, cofanie, licznik pozostałych cyfr, opcjonalne podpowiedzi kolorystyczne, dźwięki).
- Zapisany stan pozwala wrócić do rozpoczętej gry po zamknięciu przeglądarki/aplikacji.

## Rozwój

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Push na branch `main` uruchamia `.github/workflows/deploy.yml`, który buduje projekt i publikuje go na GitHub Pages (wymaga włączenia w ustawieniach repo: **Settings → Pages → Source: GitHub Actions**).
