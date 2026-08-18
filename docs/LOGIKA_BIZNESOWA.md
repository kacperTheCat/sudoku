# Logika biznesowa

Ten dokument opisuje *co* aplikacja robi z perspektywy gracza i reguł gry — nie jak jest to zaimplementowane (do tego służy `ARCHITEKTURA.md`).

## Przegląd

Sudoku jako PWA (Progressive Web App): SPA z ekranem menu i ekranem gry, zapis stanu w `localStorage`, instalowalna na ekranie głównym telefonu, działa offline. Dwa niezależne tryby rozgrywki:

- **Zwykła gra** — dowolna liczba partii, gracz wybiera poziom trudności przy każdej nowej grze.
- **Wyzwanie dnia** — jedna, ustalona plansza na dany dzień kalendarzowy, ta sama dla wszystkich odwiedzin tego dnia, ze śledzeniem passy (streak) dni z rzędu.

Oba tryby są całkowicie od siebie niezależne: osobny zapisany stan, osobna historia ruchów, osobne liczniki. Rozpoczęcie/kontynuowanie jednego nie wpływa na drugi.

## Generowanie planszy

- Generator tworzy najpierw w pełni wypełnioną, poprawną planszę (losowy backtracking z heurystyką MRV — zawsze rozwija komórkę o najmniejszej liczbie możliwych kandydatów), a następnie usuwa cyfry, sprawdzając po każdym usunięciu, czy plansza nadal ma **dokładnie jedno** rozwiązanie. Jeśli usunięcie złamałoby unikalność, cyfra wraca na miejsce.
- Liczba cyfr startowych (given) zależy od poziomu trudności:

  | Poziom | Cyfry na start |
  |---|---|
  | Łatwy | 38 |
  | Średni | 30 |
  | Trudny | 26 |
  | Ekspert | 22 |

- Generowanie jest wielokrotnie próbowane (do 15 podejść z nowo losowaną planszą bazową), bo pojedyncze losowe usuwanie potrafi utknąć powyżej celu, zwłaszcza przy niskiej liczbie cyfr (Ekspert). Zwracany jest najlepszy wynik ze wszystkich prób, nawet jeśli żadna nie trafiła dokładnie w cel.
- Generowanie odbywa się z opóźnieniem (żeby UI zdążyło pokazać stan „Generowanie planszy…” przed synchronicznym, czasem ~0.5s trwającym przeszukiwaniem).

## Warianty gry

- **Klasyczny** — standardowe zasady sudoku (unikalność w wierszu/kolumnie/kwadracie 3×3).
- **Sudoku X** — dodatkowo obie główne przekątne muszą zawierać unikalne cyfry 1-9. W pełni zaimplementowany i działający, ale **obecnie ukryty** w menu (przełącznik trybu jest wyłączony flagą) — zapisane wcześniej gry w tym wariancie nadal się poprawnie wczytują i są grywalne, po prostu nie da się aktualnie rozpocząć nowej gry w tym wariancie z poziomu UI.

## Wprowadzanie cyfr i notatki

- Dotknięcie cyfry w klawiaturze numerycznej wstawia ją do zaznaczonej komórki; ponowne dotknięcie tej samej cyfry czyści komórkę (toggle).
- Dane (given) komórki nie da się edytować.
- Tryb notatek (pencil marks): zamiast wstawiać ostateczną cyfrę, dotknięcia przełączają małe cyfry-kandydatów widoczne w rogach komórki.
- **Auto-czyszczenie notatek sąsiadów**: wstawienie ostatecznej cyfry (nie notatki) automatycznie usuwa tę cyfrę z notatek wszystkich komórek w tym samym wierszu, kolumnie i kwadracie (oraz przekątnych w Sudoku X). To jest cofane razem z resztą ruchu przy „Cofnij”.
- **Cofanie (Cofnij)**: wielopoziomowa historia ruchów. Cofnięcie przywraca poprzednią wartość i notatki komórki oraz wszystkie notatki sąsiadów, które zostały automatycznie wyczyszczone przy tym ruchu.
- **Wyczyść**: czyści tylko aktualnie zaznaczoną komórkę (nie całą planszę).
- **Licznik pozostałych cyfr** („Liczniki”, opcjonalny) — przy każdej cyfrze na klawiaturze pokazuje, ile jeszcze razy można ją wstawić (9 minus liczba już postawionych). Cyfra z licznikiem 0 jest wyłączona.

## Tryb Podpowiedzi

Przełącznik „Podpowiedzi” (w kodzie: `colorAssists`) to centralna mechanika rozgałęziająca zachowanie wielu elementów gry. To ustawienie **globalne**, wspólne dla zwykłej gry i wyzwania dnia.

### Gdy Podpowiedzi są włączone

- Poprawnie wstawione cyfry kolorują się na zielono, błędne na czerwono (na podstawie porównania z rozwiązaniem, nie tylko z lokalnym konfliktem wiersz/kolumna/kwadrat).
- **Błędna cyfra nie zostaje na planszy**: po wstawieniu błysk (różowy puls) i po ~450ms cyfra sama się usuwa, jakby została odrzucona. Nie liczy się to jako dodatkowy ruch — usunięcie jest efektem systemowym, nie decyzją gracza.
- Dodatkowo, jeśli wstawiona cyfra powiela już istniejącą cyfrę w tym samym wierszu/kolumnie/kwadracie (a nie jest jeszcze uznana za błędną, bo np. sąsiad sam był błędnie wpisany), pulsują na różowo obie skonfliktowane komórki.
- Zestaw efektów wizualnych i dźwiękowych opisanych niżej w sekcji „Wodotryski” — wszystkie działają wyłącznie w tym trybie.

### Gdy Podpowiedzi są wyłączone

- Żadnego kolorowania, żadnego pulsowania, żadnego auto-usuwania błędnych cyfr, żadnych dźwięków/wibracji poza zwykłym „stukiem” interfejsu. Błędna cyfra po prostu zostaje na planszy, dopóki gracz sam jej nie poprawi albo nie usunie — to jest tryb „na własną odpowiedzialność”.

### Przełączenie z wyłączonych na włączone

W momencie włączenia Podpowiedzi (przejście off→on), aplikacja **zamiata** (usuwa) wszystkie aktualnie błędne cyfry z planszy — zarówno w zwykłej grze, jak i w wyzwaniu dnia, niezależnie od tego, który tryb jest aktualnie widoczny na ekranie. To daje graczowi „czystą kartę” po powrocie do trybu z podpowiedziami, bez pozostałości błędów zebranych podczas gry na ślepo. To jedyny moment, w którym błędne cyfry wpisane przy wyłączonych Podpowiedziach w ogóle znikają — same z siebie nie są nigdy usuwane.

## Wodotryski (feedback wizualny/dźwiękowy)

Wszystkie poniższe działają **wyłącznie przy włączonych Podpowiedziach**.

### Fala (ripple) przy poprawnej cyferce

Po wstawieniu poprawnej cyfry, zielona fala rozlewa się od tej komórki wzdłuż całego wiersza i całej kolumny, aż do krawędzi planszy, komórka po komórce (im dalej, tym większe opóźnienie zapłonu).

### Fala przy błędnej cyferce

Analogiczna fala, ale w każdym kierunku (lewo/prawo/góra/dół) zatrzymuje się na pierwszej napotkanej komórce zawierającej tę samą cyfrę — to wizualnie wskazuje konflikt, który sprawił, że wpis jest błędny. Jeśli w danym kierunku nie ma takiej komórki, fala i tak dochodzi do krawędzi.

### Ukończenie kwadratu 3×3

Wypełnienie 9. (ostatniej) pustej komórki kwadratu 3×3 wywołuje inną falę: rozchodzi się we wszystkich 8 kierunkach (łącznie z przekątnymi) od właśnie wstawionej cyfry, ograniczoną do tego kwadratu. **Zastępuje** (nie nakłada się na) zwykłą falę wiersz/kolumna — to osobny, samodzielny moment.

### Ukończenie kolumny

Analogicznie do kwadratu: wypełnienie 9. komórki kolumny wywołuje falę wzdłuż całej kolumny (góra+dół) od wstawionej cyfry, również zastępując zwykłą falę wiersz/kolumna. Jeśli pojedynczy ruch kończy jednocześnie kwadrat **i** kolumnę (rzadki, ale możliwy przypadek), obie fale grają razem.

### Dźwięk i wibracja ukończenia jednostki

Ukończenie kwadratu i/lub kolumny odtwarza specjalny, jaśniejszy dźwięk (`playUnitComplete`) i mocniejszą wibrację zamiast zwykłego dźwięku/wibracji „poprawna cyfra” — to zastąpienie, nie dodatkowa warstwa.

### Wyczerpanie cyfry

Wstawienie 9. i ostatniego wystąpienia danej cyfry na planszy (np. ostatniej „7”) powoduje krótki, zielony „pop” przycisku tej cyfry w klawiaturze numerycznej, dokładnie w momencie, gdy przycisk się wyłącza (bo nie ma już gdzie jej wstawić).

### Combo za serię poprawnych cyfr

Licznik kolejnych poprawnych wstawień z rzędu. Pokazuje się jako pomarańczowy, wyskakujący (pop) badge „🔥Nx” obok poziomu trudności, dopiero od 2 (żeby nie pokazywać się trywialnie przy każdym pojedynczym trafieniu). Reset do zera: przy błędnej cyferce, przy rozpoczęciu nowej gry, oraz przy włączeniu Podpowiedzi (patrz wyżej — czysta karta).

## Dźwięki i wibracje — pełna mapa

| Zdarzenie | Dźwięk | Wibracja | Warunek |
|---|---|---|---|
| Dotknięcie dowolnego przycisku UI | delikatny stuk | bardzo lekka (6ms) | zawsze |
| Zmiana ekranu (menu↔gra, nowa plansza) | „stuk w drewno” | (jw., ta sama lekka) | zawsze |
| Poprawna cyfra | subtelny dźwięk wznoszący | lekka | tylko Podpowiedzi |
| Błędna cyfra | ostrzejszy brzęk | wyraźniejsza | tylko Podpowiedzi |
| Ukończenie kwadratu/kolumny | jaśniejszy, trzynutowy dźwięk | mocniejsza | tylko Podpowiedzi (zastępuje „poprawna cyfra”) |
| Ukończenie całej planszy | fanfara (4 nuty) | najmocniejsza | zawsze (nie jest wyciszana przez wyłączone Podpowiedzi — to jednorazowe świętowanie, nie podpowiedź) |

Przy wyłączonych Podpowiedziach wstawianie cyfr nie generuje żadnego dodatkowego dźwięku/wibracji poza standardowym „stukiem” UI (ten sam co przy dotknięciu dowolnego przycisku).

## Statystyki

Per poziom trudności (Łatwy/Średni/Trudny/Ekspert), niezależnie:

- liczba ukończonych gier,
- średni czas ukończenia,
- najlepszy (najkrótszy) czas ukończenia — rekord,
- średnia liczba ruchów na grę.

Statystyki **nie są** aktualizowane przez ukończenie wyzwania dnia — to celowo osobny system (patrz niżej).

## Licznik ruchów

„Ruch” to każde wstawienie lub usunięcie cyfry (nie licząc auto-usunięcia błędnej cyfry przy Podpowiedziach — patrz wyżej), oraz nie licząc przełączania notatek. Widoczny na żywo w nagłówku ekranu gry, w poprawnej polskiej odmianie (1 ruch / 2-4 ruchy / 5+ ruchów, z wyjątkiem 12-14).

## Licznik błędów

Każde wstawienie cyfry niezgodnej z rozwiązaniem liczy się jako błąd — **niezależnie od tego, czy Podpowiedzi są włączone czy wyłączone** (w obu trybach aplikacja wewnętrznie wie, czy cyfra jest poprawna, nawet gdy nic o tym nie pokazuje na żywo przy wyłączonych Podpowiedziach). Licznik jest trwały: nie cofa się przy auto-usunięciu błędnej cyfry (Podpowiedzi), przy „Wyczyść” ani przy „Cofnij” — to historyczna suma popełnionych błędów w danej grze, a nie liczba aktualnie widocznych błędów na planszy.

W przeciwieństwie do licznika ruchów, **nie jest pokazywany na żywo** podczas gry — dopiero w dialogu po ukończeniu planszy („Poziom: X · Czas: Y · Ruchy: Z · N błędów”), żeby nie kusić do liczenia błędów w trakcie gry. Nie trafia też do statystyk na ekranie głównym — to świadoma decyzja, żeby nie rozbudowywać tam listy liczb per poziom trudności.

Ukończenie planszy z **zerem błędów** (`mistakeCount === 0`) dodatkowo pokazuje w dialogu wygranej odznakę „🧠 Jesteś geniuszem!” — dotyczy to zarówno zwykłej gry, jak i wyzwania dnia, bez dodatkowego dźwięku (tylko wizualnie).

## Timer

Odmierza czas od rozpoczęcia gry, zapisywany w stanie gry. **Pauzuje się**, gdy:
- plansza jest ukończona,
- gracz nawigował z powrotem do menu (ekran gry nie jest aktualnie widoczny) — inaczej czas rósłby w tle mimo braku aktywnej gry.

Dotyczy to niezależnie zwykłej gry i wyzwania dnia — każdy z timerów tyka tylko wtedy, gdy jego własny ekran jest aktualnie oglądany.

## Wyzwanie dnia

- Jedna plansza dziennie, zawsze na poziomie **Średni**, wariant klasyczny (bez wyboru trudności).
- Plansza generowana jest **raz** dla danego dnia kalendarzowego (wg czasu lokalnego gracza, nie UTC) i zapamiętywana — ponowne wejście tego samego dnia wznawia tę samą planszę, nie losuje nowej.
- Streak (passa dni z rzędu): rośnie o 1, jeśli gracz ukończył wyzwanie **wczoraj** i ukończa je dziś. Jeśli dzień został pominięty, streak resetuje się do 1 przy najbliższym ukończeniu. Zapamiętywany jest też rekord najdłuższej passy.
- Ekran menu pokazuje przycisk „Wyzwanie dnia” zawsze (nie znika po ukończeniu — dostaje znacznik ✓), z aktualną (żywą) passą lub zachętą do jej rozpoczęcia, plus odznakę 🏆 z rekordem najdłuższej passy w rogu przycisku (widoczna dopiero po zdobyciu pierwszej passy).
- Po ukończeniu wyzwania dnia dialog wygranej nie oferuje „Kolejna łamigłówka” (bo nie ma kolejnej tego dnia) — tylko powrót do menu, z komunikatem „Wróć jutro po nowe wyzwanie!”.

## PWA — instalacja i aktualizacje

- Przy pierwszym uruchomieniu (i raz na sesję przeglądarki, jeśli aplikacja nie jest już zainstalowana) pojawia się modal z zachętą do dodania do ekranu głównego.
- Na Androidzie/Chrome: natywny mechanizm instalacji przeglądarki, wywoływany z poziomu własnego modala.
- Na iOS: tylko Safari potrafi zainstalować PWA jako pełnoprawną, samodzielną aplikację. Jeśli gra jest otwarta w innej przeglądarce na iOS (Chrome, Firefox, Brave itd. — wszystkie to na iOS opakowania WebKit bez dostępu do prawdziwej instalacji), modal informuje o tym wprost i prosi o otwarcie w Safari, zamiast pokazywać mylące instrukcje.
- Nowa wersja aplikacji wykrywana jest automatycznie w tle; podczas przeładowania pokazuje się półprzezroczysty overlay ze spinnerem.

## Motyw i orientacja

- Jasny/ciemny motyw, przełączany ręcznie, domyślnie wg preferencji systemowej urządzenia.
- Aplikacja zablokowana do orientacji pionowej (na urządzeniach/instalacjach, które to honorują) — w trybie poziomym pokazuje się nakładka z prośbą o obrót do pionu.
