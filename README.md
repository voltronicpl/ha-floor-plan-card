# Floor Plan Card (mapa domu) dla Home Assistant

Karta Lovelace z planem domu. Pokój świeci, kiedy jego światło jest włączone,
brama garażowa i drzwi pokazują, czy są otwarte. Kliknięcie ikony przełącza
światło albo bramę, przytrzymanie otwiera szczegóły encji.

![Podgląd](images/podglad_stany_1.png)

## Instalacja przez HACS

1. HACS → menu (trzy kropki) → **Custom repositories**.
2. Repozytorium: `https://github.com/voltronicpl/ha-floor-plan-card`, typ: **Dashboard** (Lovelace).
3. Znajdź „Floor Plan Card (mapa domu)” i kliknij **Download**.
4. Odśwież przeglądarkę (Ctrl+F5).
5. Dodaj kartę do dashboardu (YAML poniżej).

HACS sam pobiera kartę i wszystkie obrazki z `dist/` do
`/hacsfiles/ha-floor-plan-card/` i sam dodaje zasób JS. Niczego nie trzeba
rozpakowywać ani kopiować do `/config/www/`.

Najkrótsza karta (encje są już wpisane w kartę jako domyślne):

```yaml
type: custom:ha-floor-plan-card
```

## Motywy: pora roku i pora dnia

Karta sama dobiera wygląd planu (`theme: auto`, domyślnie):

| Data | Motyw |
|---|---|
| 1 marca – 31 sierpnia | lato |
| 1 września – 14 listopada | jesień |
| 15 listopada – 30 listopada | zima (`winter_from_nov15: false` = jesień do końca listopada) |
| 1 grudnia – 6 stycznia | święta |
| 7 stycznia – koniec lutego | zima |

- **Dzień / noc** według `sun.sun`: po zachodzie słońca (`below_horizon`) wersja nocna, zmienia się na żywo.
- **Orientacja ekranu**: telefon pionowo dostaje plan pionowy (`pion`), a reszta poziomy (`poziom`). Święta w poziomie mają szeroki plan (`szeroki`).
- Zamknięta brama i drzwi to samo tło, otwarte dostają nakładkę `*_otwarte`.

Wymuszenie jednego motywu:

```yaml
type: custom:ha-floor-plan-card
theme: zima_noc_poziom   # albo: classic = stary plan (obrazki PNG z dist/)
```

Dostępne motywy: `lato|jesien|zima` × `dzien|noc` × `poziom|pion` oraz `swieta` × `dzien|noc` × `szeroki|pion`.

**Warianty.** Niektóre motywy mają kilka wersji (`<motyw>_2`, `<motyw>_3`). Jesień ma po dwie
wersje każdego motywu, a jesienna noc w pionie aż trzy (`jesien_noc_pion`, `_2`, `_3`, ta z drzewami).
W trybie `auto` wariant zmienia się **codziennie** (według dnia roku), więc jesień wygląda raz tak, raz inaczej.
Jeden wariant na stałe:

```yaml
type: custom:ha-floor-plan-card
variant: 2              # 1 = pierwotny, 2, 3 ... (jeśli nie ma takiego, brany jest ostatni)
# albo konkretny motyw:
# theme: jesien_noc_pion_3
```
Pliki leżą w `dist/themes/<motyw>/`, a pozycje ikon i nakładek w `dist/themes/themes.json`.

## Edytor wizualny (bez YAML-a)

Edytuj dashboard → kliknij kartę mapy → otworzy się edytor:
- **Motyw** (automatyczny, klasyczny albo konkretny) i **wariant**
- przełączniki: ikonki światła, „–” w pokojach bez czujnika, zima od 15 listopada, pełny ekran
- **każdy z 11 pokoi**: wybór encji światła (`light`/`switch`) i czujnika temperatury
- **Brama, drzwi i kamery** (pod listą pokoi): pola z podpowiedzią **wszystkich encji z HA**.
  Zacznij pisać, np. `brama` albo `switch.`, i wybierz z listy albo wpisz `entity_id` ręcznie.
  Pod polem widać aktualny stan encji, więc od razu wiesz, co wpisać jako stan „otwarta”.
  Na górze tej sekcji jest numer wersji karty, po którym poznasz, czy telefon ma już nową wersję.

Wyczyszczenie pola chowa dany element. Edytor zapisuje tylko to, co różni się od ustawień domyślnych.

## Ikonki i temperatury

- W każdym pokoju jest okrągła ikonka światła w stylu „szkła”: zgaszona jest szara, zapalona świeci
  ciepłym bursztynem z łuną (razem z poświatą pokoju). Klik przełącza, przytrzymanie otwiera szczegóły.
  Wyłączysz je opcją `light_icons: false`.
- Pod ikonką jest pigułka z temperaturą, np. `21,5°`. Termometr jest niebieski poniżej 18°,
  zielony w normie i pomarańczowy powyżej 24°. Pokój bez czujnika nic nie pokazuje,
  a z `show_empty_temp: true` pokazuje `–`. Klik w temperaturę otwiera wykres.

## Kamery

Na planie są trzy podglądy kamer, odświeżane co 10 s. Klik otwiera podgląd na żywo.
Kamery przylegają do domu: przód i wejście dotykają dolnej ściany i są rozciągnięte w dół
(w pionie stoją obok siebie na całą szerokość), a tył dotyka górnej ściany w lewym rogu.

| Miejsce | Domyślna kamera |
|---|---|
| pod bramą (`przod`) | `camera.dwor_przod` |
| pod drzwiami głównymi (`wejscie`) | `camera.zewnatrz_niska_rozdzielczosc` |
| lewy górny róg, tył (`tyl`) | `camera.dwor_tyl_lewy` |

Zmienisz je w edytorze (sekcja „Kamery”) albo w YAML-u: `cameras: { przod: camera.x, tyl: false }`.
Rozmiar ustawia `camera_size` (w % szerokości mapy, domyślnie 15, a w pionie 30).

## Brama suwana na planie

Obok kamery „przód” (na telefonie pod nią) jest rysunek **bramy suwanej** w stylu planu: murowane słupki z lampkami,
antracytowe skrzydło na kółkach i szyna. Zamknięta brama ma skrzydło między słupkami i zieloną kropkę „Brama zamknięta”.
Otwarta ma skrzydło odjechane za słupek (płynnie, w 2 s) i czerwoną kropkę „Brama otwarta”. W ruchu lampki migają,
a napis brzmi „Brama w ruchu”. Stan bierze się z encji bramy z edytora, tak jak niżej. Przytrzymanie rysunku
otwiera bramę z potwierdzeniem, a krótki klik pokazuje szczegóły. Ukryjesz go opcją `slide_gate: false`.
Rysunek jest widoczny zawsze. Dopóki w edytorze nie wybierzesz encji bramy, jest szary z napisem „Brama – brak encji”.

## Furtka

Obok kamery „wejście” (na telefonie pod nią) stoi **furtka** w tym samym stylu: słupki i skrzydło na zawiasach,
które przy otwarciu obraca się na zawiasie. Ma napis „Furtka otwarta/zamknięta” z kropką. Domyślna encja to `binary_sensor.furtka`.
W edytorze, w sekcji „Furtka”, ustawisz stan, stan „otwarta” i encję do otwierania (`wicket_action`).
Przytrzymanie pyta „Na pewno otworzyć furtkę?”. Ukryjesz ją opcją `wicket: false`.

## Brama: stan i otwieranie

Od 1.5.4 są **dwie osobne bramy**, każda z własną encją stanu i otwierania:

- **Brama garażowa** (na planie, w garażu): `covers.brama`, `open_states.brama`, `garage_action`.
- **Brama wjazdowa** (suwana, przy kamerze „przód”): `covers.brama_wjazdowa`, `open_states.brama_wjazdowa`, `gate_action`.

Drzwi (wejściowe 1 i główne) są narysowane w otworze: otwarte = skrzydło uchylone i widać jasny korytarz. Nad drzwiami jest samo kółko: zielone = zamknięte, czerwone = otwarte, szare = brak encji. Klik pokazuje szczegóły czujnika.

Brama garażowa jest narysowana w otworze garażu jako brama segmentowa: otwarta = panele u góry i widać oświetlone wnętrze, zamknięta = panele zakrywają otwór. Nad nią napis z kropką stanu.

Po przytrzymaniu skrzydło bramy lekko rusza, a po „Tak” brama powoli jedzie (ok. 14 s) z napisem „Brama w ruchu”, aż czujnik potwierdzi stan. Gdy czujnik nic nie zmieni w 25 s, rysunek wraca do prawdziwego stanu.

W edytorze każde pole encji ma natywny wybór z listy HA oraz pole do ręcznego wpisania `entity_id` (zapis po Enter, wyjściu z pola albo chwilę po wpisaniu).

- **Stan bramy:** w edytorze wybierz dowolną encję (`binary_sensor`, `cover`, `sensor`, `switch`…)
  i wpisz, jaki stan oznacza „otwarta” (np. `open` albo `on`, kilka po przecinku). Każdy inny stan to zamknięta.
  Otwarta brama jest na planie fizycznie otwarta, a jej przycisk robi się czerwony. To samo pole jest dla drzwi.
- **Otwieranie:** **przytrzymaj** przycisk bramy (domyślnie 1 s, pasek pokazuje postęp, ustawia się w `gate_hold_ms`).
  Tuż nad bramą (albo pod nią, gdy u góry brak miejsca) pojawi się pytanie **„Na pewno otworzyć bramę?”** z przyciskami Tak i Nie. Po „Tak” karta wywołuje encję
  z pola „Otwieranie bramy” (`gate_action`): `cover` otwiera albo zamyka, `button` naciska, `switch` i `script` włącza.
  Krótki klik w przycisk pokazuje szczegóły.

```yaml
covers:
  brama: cover.brama_garazowa          # garażowa
  brama_wjazdowa: binary_sensor.brama  # suwana wjazdowa
open_states:
  brama: open
  brama_wjazdowa: "on"
garage_action: cover.brama_garazowa
gate_action: switch.sterownik_bram_l1
gate_hold_ms: 1000
```

## Światła, brama i drzwi

- **Światło** widać jako realistyczną poświatę: pokój płynnie się rozjaśnia i gaśnie (0,6 s).
  Ciepła plama światła wokół lampy jest przycięta do kształtu pokoju, więc nie wylewa się za ściany.
  Ikon żarówek domyślnie nie ma. **Klik w dowolne miejsce pokoju** włącza i wyłącza światło,
  a przytrzymanie otwiera szczegóły. Ikony wrócą po ustawieniu `light_icons: true`.
- **Brama i drzwi** pokazują prawdziwy stan z czujników: `on` (otwarte) to otwarta brama
  albo uchylone skrzydło drzwi, `off` (zamknięte) to samo tło. Stan nieznany albo niedostępny
  pokazuje zamknięte. Encje `cover.*` działają jak wcześniej (klik otwiera i zamyka).

## Mapa na cały ekran

Karta sama zdejmuje ramkę i skaluje obraz do monitora (`fullscreen: true`, domyślnie). Cała mapa
mieści się w oknie bez przewijania (wysokość ekranu minus górny pasek HA), z zachowanymi proporcjami i wyśrodkowana.
Żeby zajęła **cały ekran**, a nie małe okienko, widok dashboardu musi być typu **Panel**:

Edytuj dashboard → ołówek przy widoku → **Typ widoku: Panel (pojedyncza karta)**.

Albo w edytorze surowej konfiguracji dashboardu:

```yaml
views:
  - title: Mapa
    path: mapa
    type: panel
    cards:
      - type: custom:ha-floor-plan-card
        fullscreen: true
```
W widoku „Sekcje” karta też bierze pełną szerokość. Zwykłą kartę dostaniesz przez `fullscreen: false`.

## Telefon (aplikacja Home Assistant)

Karta sama ustala, skąd ją załadowano, i z tego samego miejsca bierze obrazki. Działa więc lokalnie,
przez Nabu Casa i w aplikacji. Obrazki mają w adresie numer wersji, żeby telefon nie trzymał starych.
Jeśli po aktualizacji telefon dalej pokazuje błąd albo starą wersję, w aplikacji wejdź w
**Ustawienia → Aplikacja towarzysząca → Debugowanie → Wyczyść pamięć podręczną frontendu** i otwórz ją ponownie.
Gdy coś pójdzie nie tak, karta pokaże komunikat błędu zamiast pustego miejsca.

## Instalacja ręczna

1. Skopiuj zawartość `dist/` do `/config/www/mapa/`.
2. Ustawienia → Dashboardy → Zasoby → dodaj `/local/mapa/ha-floor-plan-card.js` jako moduł JavaScript.
3. W karcie ustaw `base_path: /local/mapa`.

## Konfiguracja karty

Domyślne encje (wbudowane w kartę, każdą można nadpisać):

| Pokój | Światło | Temperatura |
|---|---|---|
| garaz | `switch.wylacznik_swiatlo_garaz` | `sensor.garaz_czujnik_temp_temperature` |
| warsztat | `light.pokoj_druk` | – |
| salon | `light.salon_swiatlo_wszystkie_grupa` | `sensor.czujnik_temperatury_salon_temperature` |
| sypialnia | `light.sypialnia_swiatlo_grupa` | – |
| lazienka | `light.lazienka_swiatlo` | – |
| kuchnia | `light.kuchnia_swiatlo_grupa` | – |
| korytarz | `light.swiatlo_korytarz_wjsxie` | – |
| garderoba | `light.garderoba_swiatlo` | – |
| brama | – (wybierz w edytorze) | – |
| drzwi1 | `binary_sensor.czujnik_drzwi_garaz_contact` | – |
| drzwi2 | `binary_sensor.czujnik_drzwi_glowne_contact` | – |

Biuro, siłownia i pralnia/WC nie mają jeszcze encji. Dopisz je w YAML-u, gdy będą.
Pokój schowasz, wpisując `salon: false`. Drzwi i bramę można podać jako `cover.*` (klik otwiera)
albo `binary_sensor.*` (czujnik, klik pokazuje szczegóły).

Przykład nadpisania:

```yaml
type: custom:ha-floor-plan-card
rooms:
  salon:   { light: light.salon,   temperature: sensor.temperatura_salon }
  kuchnia: { light: light.kuchnia }
covers:
  brama:  cover.brama_garazowa
  drzwi1: cover.drzwi_wejsciowe_1
  drzwi2: cover.drzwi_wejsciowe_2
```

Pełny przykład ze wszystkimi pokojami: [`examples/karta_hacs.yaml`](examples/karta_hacs.yaml).

| Opcja | Opis |
|---|---|
| `base_path` | Folder z obrazkami. Domyślnie `/hacsfiles/ha-floor-plan-card`. |
| `theme` | `auto` (domyślnie), `classic` albo nazwa motywu, np. `zima_noc_poziom`. |
| `variant` | `1`, `2`, `3`: wymusza wariant motywu. Bez tego warianty zmieniają się codziennie. |
| `cameras` | `{ przod, wejscie, tyl }`: encje `camera.*`, `false` chowa. |
| `camera_size` | Szerokość podglądu kamery w % mapy. |
| `open_states` | `{ brama: "open", drzwi1: "on" }`: stan oznaczający „otwarte”. |
| `gate_action` | Brama wjazdowa (suwana): encja wywoływana po potwierdzeniu (`cover`/`button`/`switch`/`script`). |
| `corner_card` | (Gdy karta jeszcze się ładuje, w rogu widać „Ładowanie karty…”; gdy jej nie ma – krótki komunikat zamiast błędu.) Dowolna karta HA w prawym górnym rogu nad domem, domyślnie `{ type: custom:ems-card, device: ecobss }`. Skaluje się, żeby zmieścić się nad dachem; na telefonie (pion) jest pod mapą. `false` = brak. |
| `corner_card_width` | Szerokość tej karty w px przed skalowaniem (domyślnie 520). Karta zajmuje miejsce od prawego górnego narożnika do dachu. |
| `garage_action` | Brama garażowa: encja wywoływana po potwierdzeniu. |
| `gate_hold_ms` | Jak długo przytrzymać bramę (ms, domyślnie 1000). |
| `light_icons` | `true` (domyślnie): ikonki światła. `false`: sama poświata. |
| `show_empty_temp` | `true`: pokazuje `–` w pokojach bez czujnika temperatury. |
| `winter_from_nov15` | `true` (domyślnie): zima od 15 listopada. |
| `fullscreen` | `true` (domyślnie): bez ramki, dopasowana do okna bez przewijania, zachowane proporcje. `false`: zwykła karta. |
| `image` | Własne tło (domyślnie `plan_domu_noc.png`). |
| `rooms.<pokój>.light` | Encja światła: włączone = pokój podświetlony. |
| `rooms.<pokój>.temperature` | Sensor temperatury pod ikoną. |
| `rooms.<pokój>.left` / `top` | Przesunięcie ikony w % (opcjonalnie). |
| `rooms.<pokój>.icon` | Inna ikona (domyślnie `mdi:lightbulb`). |
| `covers.brama` / `brama_wjazdowa` / `drzwi1` / `drzwi2` | Encje stanu: brama garażowa, brama wjazdowa (suwana), drzwi. |
| `extra_elements` | Dodatkowe elementy picture-elements. |

Pokoje: `garaz`, `warsztat`, `salon`, `biuro`, `sypialnia`, `silownia`,
`lazienka`, `kuchnia`, `korytarz`, `garderoba`, `pralnia_wc`.

## Bez karty custom (czysty picture-elements)

Gotowy YAML zwykłej karty picture-elements jest w
[`examples/mapa_domu.yaml`](examples/mapa_domu.yaml) (obrazki w `/local/mapa/`).
Starsza wersja: `examples/mapa_domu_v1.yaml`.

## Pliki

- `dist/` – karta JS i obrazki (tło nocne, podświetlenia pokoi, brama, drzwi)
- `examples/` – YAML-e, lista encji do podmiany, `mapa_www.zip`
- `images/` – oryginalny plan i podglądy
- `tools/generuj_nakladki.py` – skrypt, który wygenerował nakładki
