# Architektura

Ten dokument opisuje *jak* aplikacja jest zbudowana. Opis logiki funkcjonalnej (co gra robi z perspektywy gracza) jest w `LOGIKA_BIZNESOWA.md`.

## Stack

- **Vite + React 19 + TypeScript**, bez żadnego frameworka UI (czysty CSS, `src/index.css`).
- **PWA** przez `vite-plugin-pwa` (`registerType: 'autoUpdate'`), rejestracja service workera ręczna przez hook `virtual:pwa-register/react` (nie auto-inject pluginu), żeby móc pokazać własny overlay aktualizacji zamiast domyślnego zachowania.
- Brak backendu — cały stan trzymany w `localStorage` przeglądarki, per urządzenie.
- Deploy: `.github/workflows/deploy.yml` (build + GitHub Pages przy push na `main`) oraz równolegle Vercel (podłączony przez UI Vercela do tego samego repo GitHub, bez pliku konfiguracyjnego w repo — Vercel autodetekuje projekt Vite).
- `vite.config.ts` używa `base: './'` (ścieżki względne), żeby zbudowana aplikacja działała z dowolnego subpath niezależnie od tego, gdzie jest hostowana.

## Struktura katalogów

```
src/
  sudoku/       — czysta logika domenowa, bez zależności od React ani stanu
    types.ts      typy: Difficulty, Variant, GameState, HistoryEntry, Settings, Stats
    solver.ts      matematyka planszy (rowOf/colOf/boxOf), PEERS/DIAGONAL_PEERS,
                    walidacja, liczenie rozwiązań (backtracking)
    generator.ts    generowanie pełnej planszy + usuwanie cyfr z kontrolą unikalności
    ripple.ts       czyste funkcje liczące animacje fal (patrz niżej)
    daily.ts        klucz dnia (lokalna data), stała trudność wyzwania dnia
    sound.ts        synteza dźwięków przez Web Audio API (bez plików audio)
    haptics.ts      wibracje przez Vibration API
  state/        — stan aplikacji i logika mutacji, bez JSX
    gameLogic.ts    współdzielone czyste funkcje mutujące GameState
    storage.ts      cały dostęp do localStorage (klucze, wersjonowanie, domyślne wartości)
    useGame.ts       hook zwykłej gry — główny "mózg" aplikacji
    useDailyChallenge.ts  równoległy hook wyzwania dnia
  components/    — czyste komponenty prezentacyjne, stan i akcje wchodzą przez propsy
  pwa/          — hooki specyficzne dla PWA (instalacja, aktualizacje)
  App.tsx        — routing (menu/gra) i przełączanie między trybem zwykłym a wyzwaniem dnia
  main.tsx        — punkt wejścia (React.StrictMode + createRoot)
  index.css        — cały CSS, zmienne motywu, animacje
```

## Silnik sudoku (`src/sudoku`)

### `solver.ts` — fundament

`PEERS` i `DIAGONAL_PEERS` to prekalkulowane (raz, przy starcie modułu) tablice: dla każdej z 81 komórek lista indeksów wszystkich komórek, z którymi nie może dzielić wartości (wiersz + kolumna + kwadrat 3×3, a w wariancie diagonalnym też przekątne). Każda funkcja w solverze i generatorze przyjmuje `peers` jako parametr z domyślną wartością `PEERS` — **cały wariant Sudoku X to tylko podanie `DIAGONAL_PEERS` zamiast domyślnego `PEERS`**, żadna inna logika się nie zmienia. To jest kluczowa decyzja architektoniczna: warianty gry nie rozgałęziają kodu, tylko dane wejściowe.

`countSolutions(values, limit, peers)` — backtracking z heurystyką MRV (najpierw rozwija komórkę o najmniejszej liczbie kandydatów), zatrzymuje się wcześnie po znalezieniu `limit` rozwiązań. Używane przez generator do potwierdzenia unikalności po każdym usunięciu cyfry.

### `generator.ts`

`generateFullBoard(peers)` losowym backtrackingiem (tasowanie kandydatów na każdym kroku) tworzy w pełni wypełnioną, poprawną planszę. `removeClues` usuwa cyfry falami (passami), sprawdzając `countSolutions(..., 2, peers) === 1` po każdym usunięciu; cofa usunięcie, jeśli złamałoby unikalność. `generatePuzzle` opakowuje to w pętlę do 15 prób (nowa plansza bazowa za każdym razem), bo pojedyncza próba usuwania potrafi utknąć powyżej celu — trzyma najlepszy wynik ze wszystkich prób.

### `ripple.ts`

Czyste funkcje liczące **tylko** dane do animacji (nie mają efektów ubocznych, nie znają Reacta):

- `computeLineRipple(index, digit, values, stopAtDuplicate, stepMs)` — cele fali wzdłuż wiersza+kolumny w 4 kierunkach, z opóźnieniem proporcjonalnym do odległości. `stopAtDuplicate=true` przerywa dany kierunek na pierwszej komórce z tą samą cyfrą (przypadek błędnej cyfry).
- `computeBoxRipple(index, stepMs)` — pozostałe 8 komórek kwadratu 3×3, tagowane odległością Czebyszewa (8-kierunkową, z przekątnymi) od źródła.
- `computeColumnRipple(index, stepMs)` — pozostałe 8 komórek kolumny, tagowane odległością w wierszach.
- `boxCells(index)` / `columnCells(index)` — lista 9 indeksów komórek danej jednostki, używana też do sprawdzania czy jednostka jest właśnie kompletna (`every(i => values[i] !== 0)`).

Wynik (`RippleCell[]`, czyli `{index, delayMs, kind}`) trafia do stanu Reacta w `useGame`/`useDailyChallenge`, a renderowanie (patrz `Board.tsx`/`CellView.tsx` niżej) jest osobną warstwą.

### `sound.ts` / `haptics.ts`

Zero zasobów zewnętrznych (plików audio) — wszystkie dźwięki syntezowane w locie przez Web Audio API (oscylatory + szum filtrowany biquadem). Pojedynczy, leniwie tworzony `AudioContext` (moduł-level singleton). Ważna pułapka platformowa udokumentowana w kodzie: świeżo utworzony `AudioContext` na iOS Safari potrafi zostać "cicho" nawet po `resume()` — obejście to odtworzenie niesłyszalnego jednopróbkowego bufora od razu przy tworzeniu kontekstu, w trakcie tego samego gestu użytkownika, który go odblokowuje.

`haptics.ts` to cienki wrapper na `navigator.vibrate` — no-op jeśli API nie istnieje (m.in. cały iOS Safari, który nigdy nie zaimplementował Vibration API).

## Warstwa stanu (`src/state`)

### `gameLogic.ts` — współdzielone jądro mutacji

Cztery czyste funkcje operujące na `GameState`, używane identycznie przez `useGame` i `useDailyChallenge` (żeby nie duplikować logiki między dwoma równoległymi hookami):

- `applyCellChange(game, index, updater)` — generyczna zmiana wartości/notatek komórki, dopisuje wpis do historii.
- `applyDigitPlacement(game, index, digit, peers)` — specjalizacja dla wstawienia ostatecznej cyfry: dodatkowo czyści tę cyfrę z notatek sąsiadów (`peers`) i zapisuje w `HistoryEntry.clearedPeerNotes`, co pozwala cofnięciu przywrócić też te notatki.
- `revertHistoryEntry(game, entry)` — odtwarza stan komórki i jej sąsiadów sprzed danego wpisu historii. Używane zarówno przez zwykłe „Cofnij”, jak i przez auto-odrzucenie błędnej cyfry (które technicznie jest cofnięciem jednego konkretnego wpisu historii, nie popem ostatniego — z zabezpieczeniem, że komórka nie zmieniła się w międzyczasie).
- `clearIncorrectValues(game)` — zamiata (zeruje) wszystkie nie-`given` komórki, których wartość nie zgadza się z rozwiązaniem. Używane przy przełączeniu Podpowiedzi na włączone.

### `storage.ts`

Cały dostęp do `localStorage` w jednym miejscu, klucze wersjonowane (`sudoku:v1:*`):

| Klucz | Zawartość |
|---|---|
| `sudoku:v1:game` | stan zwykłej gry |
| `sudoku:v1:settings` | ustawienia (motyw, Podpowiedzi, licznik pozostałych) |
| `sudoku:v1:stats` | statystyki per poziom trudności |
| `sudoku:v1:daily-game` | `{date, game}` — plansza wyzwania dnia + data, dla której została wygenerowana |
| `sudoku:v1:daily-streak` | passa dni z rzędu |

Każdy loader parsuje JSON i **scala z wartościami domyślnymi** (`{...defaults, ...parsed}`), żeby stare zapisy sprzed dodania nowego pola (np. `moveCount`, `bestSeconds`) nie psuły się na `undefined` zamiast dostać sensowną wartość domyślną. Dla `Stats` scalanie jest **per-poziom-trudności** (nie płytkie na całym obiekcie) — płytkie scalanie nadpisałoby całe `stats.easy` starym obiektem bez nowych pól, zamiast uzupełnić brakujące.

### `useGame.ts` — hook zwykłej gry

Przyjmuje `isActive: boolean` (czy ekran gry jest aktualnie widoczny w trybie zwykłym — patrz sekcja o `App.tsx` niżej) i zwraca cały stan + akcje potrzebne UI. Wewnętrzny stan: `game`, `settings`, `stats`, `isGenerating`, `pulseCells` (konflikt/odrzucenie), `rippleCells`, `exhaustedDigit`, `combo`. Każdy z efektów ubocznych (dźwięk/wibracja/animacja/pulse) ma własny `useRef` na timeout, czyszczony przy odmontowaniu i przy każdym nowym wyzwoleniu (żeby dwa szybkie wpisy z rzędu nie zostawiły dwóch nakładających się timerów).

Kluczowa, udokumentowana w kodzie decyzja: `setDigit` czyta `game` **z domknięcia** (closure), a nie przez funkcyjną formę `setGame(g => ...)`, mimo że to drugie jest "bezpieczniejsze" w Reakcie. Powód: React Strict Mode celowo podwójnie wywołuje funkcyjne aktualizatory w trybie deweloperskim, co podwoiłoby efekty uboczne (dźwięk, wibracja, aktualizacja statystyk) przy każdym ruchu. Czytanie z domknięcia gwarantuje, że te efekty odpalają się dokładnie raz na kliknięcie.

`newGame` generuje planszę z 30ms opóźnieniem (żeby UI zdążyło pokazać stan ładowania przed synchronicznym, potencjalnie ~0.5s trwającym generowaniem).

### `useDailyChallenge.ts` — równoległy hook

Struktura lustrzana do `useGame`, ale:
- Własny, osobny stan i klucze `localStorage` (patrz tabela wyżej) — całkowita izolacja od zwykłej gry.
- Trudność i wariant są stałe (`DAILY_DIFFICULTY`, `'classic'`), generowanie wyzwala się automatycznie przy montowaniu (nie na żądanie gracza), ale **tylko jeśli** nic nie zostało wczytane dla dzisiejszej daty — w przeciwnym razie wznawia zapisaną planszę.
- Przyjmuje `colorAssists: boolean` jako parametr (nie ma własnego ustawienia — Podpowiedzi to globalne ustawienie z `useGame`).
- Dodatkowa logika streak przy ukończeniu (porównanie `lastCompletedDate` z wczorajszą datą).

Cała logika mutacji komórek (`applyCellChange`, `applyDigitPlacement`, `revertHistoryEntry`, `clearIncorrectValues`) pochodzi z tego samego `gameLogic.ts` co `useGame` — **nie jest zduplikowana**, tylko owinięta w osobne `useState`/`useCallback` dla tego drugiego slotu zapisu.

### Wzorzec `isActive`

Zarówno `useGame`, jak i `useDailyChallenge` przyjmują flagę `isActive`, którą oblicza `App.tsx` jako `view === 'game' && mode === '<odpowiedni tryb>'`. Ticker czasu (`setInterval` co sekundę) sprawdza tę flagę obok `game.isComplete` — bez tego czas rósłby w tle także wtedy, gdy gracz jest na ekranie menu, mimo że nie patrzy na tę konkretną grę.

## `App.tsx` — routing i przełączanie trybów

Dwa niezależne wymiary stanu nawigacji:
- `view: 'menu' | 'game'` — który ekran jest renderowany.
- `mode: 'normal' | 'daily'` — który z dwóch hooków (`useGame` / `useDailyChallenge`) dostarcza dane do `GameScreen`, gdy `view === 'game'`.

`isDaily = mode === 'daily'`, a `GameScreen` dostaje propsy warunkowo: `isDaily ? daily.X : X` dla każdego kawałka stanu/akcji. To jedyne miejsce, gdzie te dwa równoległe hooki się „stykają” — same komponenty (`Board`, `NumberPad`, `WinDialog`...) nie wiedzą, z którego trybu pochodzą dane.

`view`'s początkowa wartość czyta `loadGame()` **bezpośrednio** ze `storage.ts`, a nie z wyniku `useGame()` — musi być obliczona *przed* wywołaniem `useGame(isActive)`, bo `isActive` zależy od `view`. Gdyby `view` czekał na `game` z hooka, powstałaby zależność cykliczna (hook potrzebuje `isActive`, `isActive` potrzebuje `view`, `view` chciałby czytać `game` z hooka).

Delegowany, pojedynczy `document`-owy listener kliknięć nadaje każdemu przyciskowi w aplikacji dźwięk „stuku” + lekką wibrację, bez wpinania tego osobno w każdy handler. Atrybuty `data-skip-click-sound` (przyciski z własnym, semantycznym dźwiękiem, np. cyfry przy włączonych Podpowiedziach) i `data-sound="transition"` (przyciski zmieniające ekran) sterują, który dźwięk (jeśli w ogóle) się odpala.

`handleToggleColorAssists` w `App.tsx` (nie w samym hooku) jest miejscem, gdzie przy włączeniu Podpowiedzi wywoływane jest zamiatanie błędnych cyfr **w obu** slotach (`clearIncorrectDigits()` i `daily.clearIncorrectDigits()`) oraz reset combo w obu — bo Podpowiedzi to jedno globalne ustawienie, ale efekt uboczny musi dotrzeć do obu niezależnych hooków.

## Komponenty (`src/components`)

Warstwa czysto prezentacyjna — żaden komponent nie zna `localStorage` ani nie ma własnej logiki gry, wszystko wchodzi przez propsy z `App.tsx` (pośrednio z hooków stanu).

- **`Board.tsx`** — renderuje 81 `CellView`, liczy który sąsiad/ta sama wartość/przekątna dotyczy aktualnie zaznaczonej komórki. Buduje `Map<index, RippleCell>` z tablicy `rippleCells` (przekazanej z hooka) dla szybkiego odczytu per komórka.
- **`CellView.tsx`** — pojedyncza komórka. Opóźnienie fali (`--ripple-delay`) przekazywane jako inline custom property CSS (bo jest dynamiczne, obliczone w JS — czystym CSS się tego nie da wyrazić), klasa `cell--ripple-{correct|wrong|box|column}` wybiera kolor/keyframe.
- **`NumberPad.tsx`** — klawiatura + narzędzia (Cofnij/Wyczyść/Notatki/Liczniki/Podpowiedzi). `exhaustedDigit` steruje jednorazową klasą animacji na konkretnym przycisku.
- **`GameScreen.tsx`** — nagłówek (powrót, poziom trudności + badge combo, timer + licznik ruchów, przełącznik motywu), plansza, klawiatura, dialog wygranej. Sam liczy `cellStatus` (poprawna/błędna) i `remaining` (ile cyfr zostało) przez `useMemo`.
- **`MenuScreen.tsx`** — wybór trudności, przycisk „Wyzwanie dnia”, „Kontynuuj grę” (tylko jeśli jest niezakończona zapisana gra), siatka statystyk. Flaga modułowa `SHOW_EXPERIMENTAL_VARIANT = false` ukrywa przełącznik Sudoku X bez usuwania kodu.
- **`WinDialog.tsx`** — treść zależna od `isDaily` (inny nagłówek, brak przycisku „Kolejna łamigłówka” dla wyzwania dnia).
- **`ThemeToggle.tsx`** — dwa warianty stylu (`floating` na menu, inline w nagłówku gry) sterowane jednym propsem, żeby uniknąć nakładania się na inne elementy nagłówka na małych ekranach (to był realny bug naprawiony wcześniej).

## `src/pwa` — integracja z przeglądarką

- **`useAppUpdate.ts`** — owija `useRegisterSW` z `virtual:pwa-register/react`; gdy wykryty nowy service worker, natychmiast wywołuje `updateServiceWorker(true)` (reload), a wywołujący (`App.tsx` przez `UpdateOverlay`) pokazuje nakładkę na czas przeładowania.
- **`useInstallPrompt.ts`** — przechwytuje `beforeinstallprompt` (Android/Chrome) i pokazuje własny modal zamiast natywnego paska. Na iOS nie ma takiego zdarzenia, więc modal pokazuje się z opóźnieniem czasowym i zawiera instrukcje ręczne. Rozróżnia Safari od innych przeglądarek na iOS: przeglądarki inne niż Brave zdradzają się tokenem w User-Agent (`CriOS`, `FxiOS`, `EdgiOS`, `OPiOS`), Brave celowo podszywa się pod Safari w UA, więc wykrywane jest przez obecność wstrzykiwanego `navigator.brave`.

## CSS i motyw

Wszystkie kolory jako zmienne CSS, zdefiniowane w **trzech miejscach**, które trzeba aktualizować razem przy każdej zmianie palety:
1. `:root` — motyw jasny (domyślny).
2. `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { ... } }` — motyw ciemny wg preferencji systemowej.
3. `:root[data-theme='dark']` — motyw ciemny wymuszony ręcznie przez przełącznik w aplikacji.

Skrypt inline w `index.html` ustawia `data-theme` **przed pierwszym renderem** (żeby uniknąć błysku złego motywu przy starcie), efekt w `useGame` synchronizuje ten atrybut przy późniejszych zmianach (np. dotknięciu przełącznika).

Animacje fal (`cell-ripple-correct`, `cell-ripple-wrong`) i combo (`combo-pop`) korzystają z `animation-delay` sterowanego przez inline custom property, żeby dynamicznie obliczone w JS opóźnienie mogło wpływać na czysto deklaratywną animację CSS bez generowania osobnych klas per-opóźnienie.

## Znane pułapki i decyzje warte zapamiętania

- **Domknięcie zamiast funkcyjnego `setState`** w `setDigit` (patrz wyżej) — celowe, nie przeoczenie.
- **Auto-odrzucenie błędnej cyfry** nie zwiększa `moveCount` ponownie i nie tworzy nowego wpisu w historii — technicznie to cofnięcie (pop) tego samego wpisu, który dodało wstawienie, z zabezpieczeniem przez sprawdzenie, czy komórka nie zmieniła się w międzyczasie (`g.values[index] !== digit` → przerwij, nie cofaj).
- **Ukończenie jednostki (kwadrat/kolumna) wyklucza się z normalną falą wiersz/kolumna**, ale może współwystąpić z drugą jednostką naraz (kwadrat + kolumna) — wtedy oba zestawy celów fali są sklejane w jedną tablicę.
- **`loadStats` scala per-poziom, nie płytko** — patrz sekcja `storage.ts` wyżej; to nietrywialna pułapka kompatybilności wstecznej, która realnie występowała.
