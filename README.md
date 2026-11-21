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
| 1 września – 30 listopada | jesień |
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
Pliki leżą w `dist/themes/<motyw>/`, a pozycje ikon i nakładek w `dist/themes/themes.json`.

## Mapa na cały ekran

Karta sama zdejmuje ramkę i rozciąga się na całą szerokość (`fullscreen: true`, domyślnie).
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
| drzwi2 | `binary_sensor.czujnik_drzwi_glowne_contact` | – |

Biuro, siłownia, pralnia/WC, brama i drzwi 1 nie mają jeszcze encji. Dopisz je w YAML-u, gdy będą.
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
| `fullscreen` | `true` (domyślnie): bez ramki i odstępów, pełna szerokość, zachowane proporcje. `false`: zwykła karta. |
| `image` | Własne tło (domyślnie `plan_domu_noc.png`). |
| `rooms.<pokój>.light` | Encja światła: włączone = pokój podświetlony. |
| `rooms.<pokój>.temperature` | Sensor temperatury pod ikoną. |
| `rooms.<pokój>.left` / `top` | Przesunięcie ikony w % (opcjonalnie). |
| `rooms.<pokój>.icon` | Inna ikona (domyślnie `mdi:lightbulb`). |
| `covers.brama` / `drzwi1` / `drzwi2` | Encje `cover.*` bramy i drzwi. |
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
