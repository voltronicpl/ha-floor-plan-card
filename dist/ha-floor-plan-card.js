/*
 * ha-floor-plan-card
 * Karta Lovelace: plan domu z podświetlanymi pokojami, bramą i drzwiami.
 * Pod spodem buduje zwykłą kartę picture-elements, więc działa wszędzie tam, gdzie ona.
 *
 * type: custom:ha-floor-plan-card
 * base_path: /hacsfiles/ha-floor-plan-card   (domyślnie; albo /local/mapa przy ręcznej instalacji)
 * rooms:
 *   salon: { light: light.salon, temperature: sensor.temp_salon }
 * covers:
 *   brama: cover.brama_garazowa
 *   drzwi1: cover.drzwi_1
 *   drzwi2: cover.drzwi_2
 * theme: auto            (domyślnie) | classic | np. zima_noc_poziom
 * variant: 1|2|3        (opcjonalnie; bez tego warianty zmieniają się codziennie)
 * light_icons: true      (domyślnie; false = sama poświata bez ikon)
 * open_states: { brama: "open", drzwi1: "on" }  (stan oznaczający otwarte)
 * gate_action: switch.sterownik_bramy  (co wywołać po „Tak”), gate_hold_ms: 1000
 * cameras: { przod, wejscie, tyl }   (encje camera.*, false = ukryj)
 * show_empty_temp: false (true = „–” w pokojach bez czujnika temperatury)
 * winter_from_nov15: true (domyślnie; zima od 15 listopada, święta od 1 grudnia)
 */

const CARD_VERSION = "1.5.0";

// Folder, z którego załadowano kartę (jak w EMS: new URL(..., import.meta.url)).
// Dzięki temu obrazki działają pod każdym adresem HA (lokalnie, przez Nabu Casa, w aplikacji na telefonie).
let SCRIPT_BASE = "/hacsfiles/ha-floor-plan-card";
try { SCRIPT_BASE = new URL(".", import.meta.url).href.replace(/\/$/, ""); } catch (e) { /* zostaje domyślny */ }
// ?v=wersja przy obrazkach: aplikacja na telefonie nie trzyma starych plików w pamięci podręcznej
const ASSET_Q = `?v=${CARD_VERSION}`;

// Encje z HA Miśka. Używane, gdy w konfiguracji karty nie podasz rooms/covers.
// Każdą można nadpisać w YAML-u karty.
const DEFAULT_ROOMS = {
  garaz:     { light: "switch.wylacznik_swiatlo_garaz", temperature: "sensor.garaz_czujnik_temp_temperature" },
  warsztat:  { light: "light.pokoj_druk" },
  salon:     { light: "light.salon_swiatlo_wszystkie_grupa", temperature: "sensor.czujnik_temperatury_salon_temperature" },
  sypialnia: { light: "light.sypialnia_swiatlo_grupa" },
  lazienka:  { light: "light.lazienka_swiatlo" },
  kuchnia:   { light: "light.kuchnia_swiatlo_grupa" },
  korytarz:  { light: "light.swiatlo_korytarz_wjsxie" },
  garderoba: { light: "light.garderoba_swiatlo" },
};
// Brama nie ma domyślnej encji (binary_sensor.brama nie pokazywał stanu) – wybierz ją w edytorze.
const DEFAULT_COVERS = {
  drzwi1: "binary_sensor.czujnik_drzwi_garaz_contact",
  drzwi2: "binary_sensor.czujnik_drzwi_glowne_contact",
};

// Kamery na planie: przód pod bramą, wejście pod drzwiami głównymi, tył w lewym górnym rogu.
const CAMERAS = {
  przod:   { name: "Kamera przód (brama)", anchor: "brama" },
  wejscie: { name: "Kamera wejście (drzwi główne)", anchor: "drzwi2" },
  tyl:     { name: "Kamera tył (lewy róg)", anchor: "corner" },
};
const DEFAULT_CAMERAS = {
  przod:   "camera.dwor_przod",
  wejscie: "camera.zewnatrz_niska_rozdzielczosc",
  tyl:     "camera.dwor_tyl_lewy",
};

// Realistyczna poświata: światło widać jako rozjaśniony pokój z ciepłą łuną.
// Ikony żarówek są domyślnie niewidoczne, ale dalej da się w nie kliknąć
// (klik w środek pokoju = włącz/wyłącz). light_icons: true pokazuje je.
const GLOW_FILTER = "saturate(1.08)"; // bez drop-shadow: poświata nie wylewa się za ściany
function lightIconStyle(config, base) {
  if (config.light_icons !== false) return base;
  return { ...base, opacity: "0", "--mdc-icon-size": "56px", background: "transparent" };
}

// Domyślne pozycje ikon (w % obrazka 1933x814) i nazwy pokoi.
const ROOMS = {
  garaz:      { name: "Garaż",        left: 12,  top: 32 },
  warsztat:   { name: "Warsztat",     left: 30,  top: 15 },
  salon:      { name: "Salon",        left: 50,  top: 24 },
  biuro:      { name: "Biuro",        left: 63,  top: 17 },
  sypialnia:  { name: "Sypialnia",    left: 80,  top: 15 },
  silownia:   { name: "Siłownia",     left: 27,  top: 58 },
  lazienka:   { name: "Łazienka",     left: 37,  top: 52 },
  kuchnia:    { name: "Kuchnia",      left: 50,  top: 64 },
  korytarz:   { name: "Korytarz",     left: 64,  top: 57 },
  garderoba:  { name: "Garderoba",    left: 72,  top: 52 },
  pralnia_wc: { name: "Pralnia / WC", left: 85,  top: 57 },
};

const COVERS = {
  brama:  { name: "Brama garażowa",    open: "brama_otwarta",  closed: "brama_zamknieta",  left: 12,   top: 88 },
  drzwi1: { name: "Drzwi wejściowe 1", open: "drzwi1_otwarte", closed: "drzwi1_zamkniete", left: 21.5, top: 88 },
  drzwi2: { name: "Drzwi wejściowe 2", open: "drzwi2_otwarte", closed: "drzwi2_zamkniete", left: 63.5, top: 88 },
};

const OVERLAY_STYLE = { left: "50%", top: "50%", width: "100%", "pointer-events": "none" };
const NO_ACTION = { action: "none" };

function buildPictureElements(config) {
  const base = (config.base_path || SCRIPT_BASE).replace(/\/$/, "");
  const img = (n) => `${base}/${n}.png${ASSET_Q}`;
  const rooms = { ...DEFAULT_ROOMS, ...(config.rooms || {}) };
  const covers = { ...DEFAULT_COVERS, ...(config.covers || {}) };
  const overlays = [];
  const controls = [];

  for (const [key, def] of Object.entries(ROOMS)) {
    const room = rooms[key];
    if (!room) continue; // rooms.<pokój>: false chowa pokój
    const left = room.left ?? def.left;
    const top = room.top ?? def.top;
    if (room.light) {
      overlays.push({
        type: "image",
        entity: room.light,
        image: img("pusty"),
        state_image: { on: img(`swiatlo_${key}`), off: img("pusty") },
        tap_action: NO_ACTION,
        hold_action: NO_ACTION,
        style: { ...OVERLAY_STYLE, filter: GLOW_FILTER },
      });
      controls.push({
        type: "state-icon",
        entity: room.light,
        title: `${room.name || def.name} - światło`,
        icon: room.icon || "mdi:lightbulb",
        state_color: true,
        tap_action: { action: "toggle" },
        hold_action: { action: "more-info" },
        style: lightIconStyle(config, {
          left: `${left}%`, top: `${top}%`,
          background: "rgba(0,0,0,0.45)", "border-radius": "50%", padding: "6px",
          "--mdc-icon-size": "28px",
        }),
      });
    }
    if (room.temperature) {
      controls.push({
        type: "state-label",
        entity: room.temperature,
        style: {
          left: `${left}%`, top: `${top + 7}%`,
          color: "white", "font-size": "14px", "font-weight": "bold",
          background: "rgba(0,0,0,0.55)", "border-radius": "8px", padding: "2px 6px",
        },
      });
    }
  }

  for (const [key, def] of Object.entries(COVERS)) {
    const entity = covers[key];
    if (!entity) continue;
    // binary_sensor (czujnik drzwi): on = otwarte, kliknięcie pokazuje tylko szczegóły
    const isSensor = entity.startsWith("binary_sensor.");
    overlays.push({
      type: "image",
      entity,
      image: img(def.closed),
      state_image: {
        open: img(def.open), opening: img(def.open),
        closing: img(def.closed), closed: img(def.closed),
        on: img(def.open), off: img(def.closed),
      },
      tap_action: NO_ACTION,
      hold_action: NO_ACTION,
      style: OVERLAY_STYLE,
    });
    controls.push({
      type: "state-icon",
      entity,
      title: def.name,
      state_color: true,
      tap_action: isSensor ? { action: "more-info" } : { action: "toggle" },
      hold_action: { action: "more-info" },
      style: {
        left: `${def.left}%`, top: `${def.top}%`,
        background: "rgba(0,0,0,0.55)", "border-radius": "12px", padding: "6px",
        "--mdc-icon-size": "32px",
      },
    });
  }

  return {
    type: "picture-elements",
    image: config.image || img("plan_domu_noc"),
    elements: [...overlays, ...controls, ...(config.extra_elements || [])],
  };
}


// ==== MOTYWY (pora roku + dzień/noc + orientacja) ====
// Dane z dist/themes/themes.json, wbudowane, żeby nie trzeba było nic pobierać.
const THEMES = {"jesien_dzien_pion":{"season":"jesien","time":"dzien","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.1,45.04],"temp":[12.12,46.7],"light":{"file":"swiatlo_garaz.webp","box":[2.657,38.696,19.554,18.421]}},"warsztat":{"icon":[30.07,41.0],"temp":[30.1,42.67],"light":{"file":"swiatlo_warsztat.webp","box":[20.404,38.577,20.616,8.373]}},"salon":{"icon":[50.18,43.15],"temp":[50.22,44.82],"light":{"file":"swiatlo_salon.webp","box":[20.51,38.577,40.17,13.218]}},"biuro":{"icon":[63.2,41.49],"temp":[63.25,43.15],"light":{"file":"swiatlo_biuro.webp","box":[58.13,38.577,9.458,10.287]}},"sypialnia":{"icon":[80.29,41.02],"temp":[80.35,42.68],"light":{"file":"swiatlo_sypialnia.webp","box":[62.38,38.577,27.311,10.227]}},"silownia":{"icon":[27.23,51.24],"temp":[27.26,52.92],"light":{"file":"swiatlo_silownia.webp","box":[20.51,48.864,14.134,8.313]}},"lazienka":{"icon":[37.26,49.82],"temp":[37.29,51.49],"light":{"file":"swiatlo_lazienka.webp","box":[32.519,48.864,9.458,8.313]}},"kuchnia":{"icon":[50.42,52.7],"temp":[50.46,54.38],"light":{"file":"swiatlo_kuchnia.webp","box":[39.32,50.658,21.785,6.519]}},"korytarz":{"icon":[64.49,51.03],"temp":[64.54,52.71],"light":{"file":"swiatlo_korytarz.webp","box":[58.555,47.727,12.965,9.45]}},"garderoba":{"icon":[72.53,49.84],"temp":[72.58,51.52],"light":{"file":"swiatlo_garderoba.webp","box":[68.863,47.727,9.139,9.51]}},"pralnia_wc":{"icon":[85.7,51.05],"temp":[85.77,52.73],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.476,47.787,25.505,9.45]}}},"covers":{"brama":{"icon":[12.24,58.42],"open":{"file":"brama_otwarte.webp","box":[5.42,56.758,13.177,2.811]}},"drzwi1":{"icon":[21.81,58.43],"open":{"file":"drzwi1_otwarte.webp","box":[20.404,57.057,4.357,2.871]}},"drzwi2":{"icon":[64.21,58.48],"open":{"file":"drzwi2_otwarte.webp","box":[62.699,56.758,5.42,3.289]}}}},"jesien_dzien_poziom":{"season":"jesien","time":"dzien","orient":"poziom","w":1536,"h":1024,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.02,36.96],"temp":[12.03,41.38],"light":{"file":"swiatlo_garaz.webp","box":[2.539,20.02,19.596,49.121]}},"warsztat":{"icon":[29.96,26.25],"temp":[29.97,30.66],"light":{"file":"swiatlo_warsztat.webp","box":[20.182,19.629,20.768,22.559]}},"salon":{"icon":[50.0,31.93],"temp":[50.02,36.35],"light":{"file":"swiatlo_salon.webp","box":[20.247,19.629,40.169,35.449]}},"biuro":{"icon":[63.01,27.51],"temp":[63.03,31.93],"light":{"file":"swiatlo_biuro.webp","box":[57.812,19.629,9.57,27.539]}},"sypialnia":{"icon":[80.07,26.24],"temp":[80.1,30.67],"light":{"file":"swiatlo_sypialnia.webp","box":[62.044,19.629,27.279,27.344]}},"silownia":{"icon":[27.06,53.38],"temp":[27.07,57.81],"light":{"file":"swiatlo_silownia.webp","box":[20.312,46.875,14.193,22.266]}},"lazienka":{"icon":[37.05,49.61],"temp":[37.07,54.03],"light":{"file":"swiatlo_lazienka.webp","box":[32.227,46.973,9.57,22.168]}},"kuchnia":{"icon":[50.11,57.21],"temp":[50.13,61.64],"light":{"file":"swiatlo_kuchnia.webp","box":[38.932,51.66,21.875,17.48]}},"korytarz":{"icon":[64.14,52.8],"temp":[64.16,57.24],"light":{"file":"swiatlo_korytarz.webp","box":[58.203,43.848,13.086,25.391]}},"garderoba":{"icon":[72.16,49.65],"temp":[72.18,54.08],"light":{"file":"swiatlo_garderoba.webp","box":[68.229,43.848,9.245,25.391]}},"pralnia_wc":{"icon":[85.25,52.83],"temp":[85.28,57.27],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.07,44.141,25.326,25.098]}}},"covers":{"brama":{"icon":[12.13,72.31],"open":{"file":"brama_otwarte.webp","box":[5.339,68.066,13.021,7.324]}},"drzwi1":{"icon":[21.62,72.33],"open":{"file":"drzwi1_otwarte.webp","box":[20.247,68.75,4.232,7.52]}},"drzwi2":{"icon":[63.73,72.44],"open":{"file":"drzwi2_otwarte.webp","box":[62.24,67.969,5.339,8.594]}}}},"jesien_noc_pion":{"season":"jesien","time":"noc","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.06,46.56],"temp":[12.08,48.24],"light":{"file":"swiatlo_garaz.webp","box":[2.444,40.191,19.872,18.541]}},"warsztat":{"icon":[30.43,42.47],"temp":[30.45,44.15],"light":{"file":"swiatlo_warsztat.webp","box":[20.616,40.012,20.935,8.493]}},"salon":{"icon":[50.96,44.62],"temp":[50.98,46.3],"light":{"file":"swiatlo_salon.webp","box":[20.616,40.012,40.914,13.337]}},"biuro":{"icon":[64.29,42.93],"temp":[64.32,44.61],"light":{"file":"swiatlo_biuro.webp","box":[59.086,40.012,9.564,10.347]}},"sypialnia":{"icon":[81.79,42.43],"temp":[81.82,44.12],"light":{"file":"swiatlo_sypialnia.webp","box":[63.443,40.012,27.843,10.287]}},"silownia":{"icon":[27.46,52.8],"temp":[27.48,54.48],"light":{"file":"swiatlo_silownia.webp","box":[20.616,50.419,14.346,8.313]}},"lazienka":{"icon":[37.7,51.35],"temp":[37.72,53.04],"light":{"file":"swiatlo_lazienka.webp","box":[32.837,50.419,9.564,8.313]}},"kuchnia":{"icon":[51.09,54.24],"temp":[51.11,55.93],"light":{"file":"swiatlo_kuchnia.webp","box":[39.745,52.153,22.21,6.579]}},"korytarz":{"icon":[65.47,52.55],"temp":[65.5,54.24],"light":{"file":"swiatlo_korytarz.webp","box":[59.511,49.222,13.177,9.51]}},"garderoba":{"icon":[73.7,51.35],"temp":[73.73,53.04],"light":{"file":"swiatlo_garderoba.webp","box":[69.819,49.222,9.245,9.51]}},"pralnia_wc":{"icon":[87.14,52.55],"temp":[87.17,54.24],"light":{"file":"swiatlo_pralnia_wc.webp","box":[73.751,49.282,25.824,9.45]}}},"covers":{"brama":{"icon":[12.17,60.01],"open":{"file":"brama_otwarte.webp","box":[5.207,58.373,13.39,2.811]}},"drzwi1":{"icon":[21.9,60.01],"open":{"file":"drzwi1_otwarte.webp","box":[20.51,58.672,4.357,2.871]}},"drzwi2":{"icon":[65.07,60.04],"open":{"file":"drzwi2_otwarte.webp","box":[63.549,58.313,5.526,3.289]}}}},"jesien_noc_poziom":{"season":"jesien","time":"noc","orient":"poziom","w":1536,"h":1024,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.03,36.77],"temp":[12.04,41.18],"light":{"file":"swiatlo_garaz.webp","box":[2.539,19.824,19.531,49.121]}},"warsztat":{"icon":[29.97,26.03],"temp":[29.98,30.45],"light":{"file":"swiatlo_warsztat.webp","box":[20.247,19.434,20.703,22.559]}},"salon":{"icon":[50.01,31.71],"temp":[50.03,36.14],"light":{"file":"swiatlo_salon.webp","box":[20.312,19.434,40.104,35.449]}},"biuro":{"icon":[63.04,27.27],"temp":[63.06,31.7],"light":{"file":"swiatlo_biuro.webp","box":[57.878,19.336,9.505,27.637]}},"sypialnia":{"icon":[80.13,25.99],"temp":[80.15,30.43],"light":{"file":"swiatlo_sypialnia.webp","box":[62.109,19.336,27.344,27.441]}},"silownia":{"icon":[27.05,53.21],"temp":[27.07,57.64],"light":{"file":"swiatlo_silownia.webp","box":[20.312,46.777,14.193,22.168]}},"lazienka":{"icon":[37.05,49.42],"temp":[37.07,53.85],"light":{"file":"swiatlo_lazienka.webp","box":[32.227,46.777,9.57,22.266]}},"kuchnia":{"icon":[50.12,57.04],"temp":[50.13,61.48],"light":{"file":"swiatlo_kuchnia.webp","box":[38.932,51.465,21.875,17.578]}},"korytarz":{"icon":[64.16,52.62],"temp":[64.19,57.06],"light":{"file":"swiatlo_korytarz.webp","box":[58.203,43.652,13.086,25.391]}},"garderoba":{"icon":[72.2,49.46],"temp":[72.22,53.9],"light":{"file":"swiatlo_garderoba.webp","box":[68.294,43.652,9.245,25.488]}},"pralnia_wc":{"icon":[85.32,52.65],"temp":[85.35,57.1],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.07,43.945,25.456,25.195]}}},"covers":{"brama":{"icon":[12.11,72.17],"open":{"file":"brama_otwarte.webp","box":[5.339,67.871,13.021,7.324]}},"drzwi1":{"icon":[21.61,72.19],"open":{"file":"drzwi1_otwarte.webp","box":[20.247,68.652,4.232,7.422]}},"drzwi2":{"icon":[63.76,72.31],"open":{"file":"drzwi2_otwarte.webp","box":[62.305,67.871,5.273,8.496]}}}},"lato_dzien_pion":{"season":"lato","time":"dzien","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.28,46.93],"temp":[12.28,48.6],"light":{"file":"swiatlo_garaz.webp","box":[2.763,40.55,19.554,18.481]}},"warsztat":{"icon":[30.39,42.88],"temp":[30.4,44.54],"light":{"file":"swiatlo_warsztat.webp","box":[20.616,40.431,20.723,8.433]}},"salon":{"icon":[50.56,45.02],"temp":[50.58,46.69],"light":{"file":"swiatlo_salon.webp","box":[20.723,40.431,40.17,13.278]}},"biuro":{"icon":[63.63,43.35],"temp":[63.66,45.02],"light":{"file":"swiatlo_biuro.webp","box":[58.555,40.431,9.352,10.287]}},"sypialnia":{"icon":[80.75,42.88],"temp":[80.78,44.54],"light":{"file":"swiatlo_sypialnia.webp","box":[62.806,40.431,27.205,10.227]}},"silownia":{"icon":[27.44,53.14],"temp":[27.46,54.81],"light":{"file":"swiatlo_silownia.webp","box":[20.723,50.718,14.134,8.313]}},"lazienka":{"icon":[37.52,51.7],"temp":[37.54,53.38],"light":{"file":"swiatlo_lazienka.webp","box":[32.731,50.718,9.458,8.313]}},"kuchnia":{"icon":[50.68,54.57],"temp":[50.7,56.25],"light":{"file":"swiatlo_kuchnia.webp","box":[39.532,52.512,21.785,6.519]}},"korytarz":{"icon":[64.79,52.9],"temp":[64.81,54.57],"light":{"file":"swiatlo_korytarz.webp","box":[58.98,49.581,12.859,9.45]}},"garderoba":{"icon":[72.84,51.7],"temp":[72.87,53.38],"light":{"file":"swiatlo_garderoba.webp","box":[69.075,49.581,9.139,9.45]}},"pralnia_wc":{"icon":[85.99,52.9],"temp":[86.02,54.57],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.901,49.641,25.186,9.39]}}},"covers":{"brama":{"icon":[12.33,60.32],"open":{"file":"brama_otwarte.webp","box":[5.526,58.672,13.177,2.811]}},"drzwi1":{"icon":[21.94,60.32],"open":{"file":"drzwi1_otwarte.webp","box":[20.51,58.971,4.357,2.871]}},"drzwi2":{"icon":[64.4,60.32],"open":{"file":"drzwi2_otwarte.webp","box":[62.912,58.612,5.42,3.289]}}}},"lato_dzien_poziom":{"season":"lato","time":"dzien","orient":"poziom","w":1536,"h":1024,"bg":"tlo.webp","rooms":{"garaz":{"icon":[11.99,36.12],"temp":[12.0,40.51],"light":{"file":"swiatlo_garaz.webp","box":[2.474,19.238,19.596,48.926]}},"warsztat":{"icon":[29.92,25.45],"temp":[29.93,29.84],"light":{"file":"swiatlo_warsztat.webp","box":[20.182,18.848,20.703,22.461]}},"salon":{"icon":[49.94,31.08],"temp":[49.96,35.48],"light":{"file":"swiatlo_salon.webp","box":[20.247,18.848,40.104,35.254]}},"biuro":{"icon":[62.94,26.68],"temp":[62.96,31.08],"light":{"file":"swiatlo_biuro.webp","box":[57.747,18.848,9.57,27.344]}},"sypialnia":{"icon":[79.99,25.4],"temp":[80.02,29.81],"light":{"file":"swiatlo_sypialnia.webp","box":[61.979,18.848,27.344,27.246]}},"silownia":{"icon":[27.01,52.45],"temp":[27.02,56.86],"light":{"file":"swiatlo_silownia.webp","box":[20.247,45.996,14.258,22.168]}},"lazienka":{"icon":[37.0,48.68],"temp":[37.02,53.09],"light":{"file":"swiatlo_lazienka.webp","box":[32.161,45.996,9.57,22.168]}},"kuchnia":{"icon":[50.06,56.25],"temp":[50.08,60.67],"light":{"file":"swiatlo_kuchnia.webp","box":[38.932,50.684,21.81,17.48]}},"korytarz":{"icon":[64.09,51.85],"temp":[64.12,56.27],"light":{"file":"swiatlo_korytarz.webp","box":[58.138,42.969,13.086,25.293]}},"garderoba":{"icon":[72.11,48.7],"temp":[72.14,53.12],"light":{"file":"swiatlo_garderoba.webp","box":[68.229,42.969,9.245,25.293]}},"pralnia_wc":{"icon":[85.22,51.87],"temp":[85.26,56.29],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.005,43.164,25.391,25.098]}}},"covers":{"brama":{"icon":[12.06,71.32],"open":{"file":"brama_otwarte.webp","box":[5.339,67.09,12.956,7.324]}},"drzwi1":{"icon":[21.56,71.34],"open":{"file":"drzwi1_otwarte.webp","box":[20.182,67.773,4.232,7.52]}},"drzwi2":{"icon":[63.71,71.43],"open":{"file":"drzwi2_otwarte.webp","box":[62.24,66.992,5.339,8.496]}}}},"lato_noc_pion":{"season":"lato","time":"noc","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[11.93,46.15],"temp":[11.97,47.83],"light":{"file":"swiatlo_garaz.webp","box":[2.55,39.773,19.66,18.6]}},"warsztat":{"icon":[30.03,42.06],"temp":[30.08,43.74],"light":{"file":"swiatlo_warsztat.webp","box":[20.298,39.593,20.829,8.493]}},"salon":{"icon":[50.37,44.21],"temp":[50.43,45.9],"light":{"file":"swiatlo_salon.webp","box":[20.404,39.593,40.595,13.397]}},"biuro":{"icon":[63.52,42.52],"temp":[63.59,44.21],"light":{"file":"swiatlo_biuro.webp","box":[58.342,39.593,9.671,10.347]}},"sypialnia":{"icon":[80.81,42.03],"temp":[80.88,43.72],"light":{"file":"swiatlo_sypialnia.webp","box":[62.593,39.593,27.736,10.287]}},"silownia":{"icon":[27.27,52.41],"temp":[27.32,54.1],"light":{"file":"swiatlo_silownia.webp","box":[20.51,50.0,14.346,8.373]}},"lazienka":{"icon":[37.39,50.96],"temp":[37.44,52.65],"light":{"file":"swiatlo_lazienka.webp","box":[32.519,50.0,9.671,8.373]}},"kuchnia":{"icon":[50.71,53.87],"temp":[50.77,55.56],"light":{"file":"swiatlo_kuchnia.webp","box":[39.426,51.794,22.104,6.579]}},"korytarz":{"icon":[64.92,52.17],"temp":[64.99,53.87],"light":{"file":"swiatlo_korytarz.webp","box":[58.98,48.804,12.965,9.629]}},"garderoba":{"icon":[73.04,50.96],"temp":[73.11,52.66],"light":{"file":"swiatlo_garderoba.webp","box":[69.394,48.804,9.139,9.629]}},"pralnia_wc":{"icon":[86.38,52.18],"temp":[86.46,53.88],"light":{"file":"swiatlo_pralnia_wc.webp","box":[73.007,48.923,25.824,9.51]}}},"covers":{"brama":{"icon":[12.21,59.66],"open":{"file":"brama_otwarte.webp","box":[5.313,58.014,13.284,2.811]}},"drzwi1":{"icon":[21.87,59.67],"open":{"file":"drzwi1_otwarte.webp","box":[20.404,58.313,4.463,2.871]}},"drzwi2":{"icon":[64.7,59.7],"open":{"file":"drzwi2_otwarte.webp","box":[63.124,58.014,5.632,3.289]}}}},"lato_noc_poziom":{"season":"lato","time":"noc","orient":"poziom","w":1536,"h":1024,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.02,38.07],"temp":[12.04,42.46],"light":{"file":"swiatlo_garaz.webp","box":[2.539,21.191,19.596,48.926]}},"warsztat":{"icon":[29.97,27.41],"temp":[29.99,31.8],"light":{"file":"swiatlo_warsztat.webp","box":[20.247,20.801,20.703,22.559]}},"salon":{"icon":[50.0,33.07],"temp":[50.03,37.46],"light":{"file":"swiatlo_salon.webp","box":[20.312,20.801,40.104,35.254]}},"biuro":{"icon":[62.99,28.68],"temp":[63.02,33.08],"light":{"file":"swiatlo_biuro.webp","box":[57.812,20.801,9.57,27.441]}},"sypialnia":{"icon":[80.01,27.44],"temp":[80.04,31.83],"light":{"file":"swiatlo_sypialnia.webp","box":[62.044,20.801,27.279,27.246]}},"silownia":{"icon":[27.09,54.41],"temp":[27.11,58.81],"light":{"file":"swiatlo_silownia.webp","box":[20.312,47.949,14.258,22.168]}},"lazienka":{"icon":[37.08,50.64],"temp":[37.11,55.04],"light":{"file":"swiatlo_lazienka.webp","box":[32.227,47.949,9.635,22.168]}},"kuchnia":{"icon":[50.14,58.2],"temp":[50.17,62.61],"light":{"file":"swiatlo_kuchnia.webp","box":[38.997,52.637,21.81,17.48]}},"korytarz":{"icon":[64.15,53.81],"temp":[64.18,58.22],"light":{"file":"swiatlo_korytarz.webp","box":[58.203,44.922,13.086,25.195]}},"garderoba":{"icon":[72.15,50.68],"temp":[72.18,55.08],"light":{"file":"swiatlo_garderoba.webp","box":[68.294,44.922,9.18,25.195]}},"pralnia_wc":{"icon":[85.21,53.83],"temp":[85.24,58.24],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.005,45.117,25.326,25.098]}}},"covers":{"brama":{"icon":[12.15,73.26],"open":{"file":"brama_otwarte.webp","box":[5.404,69.043,13.021,7.227]}},"drzwi1":{"icon":[21.67,73.27],"open":{"file":"drzwi1_otwarte.webp","box":[20.312,69.727,4.232,7.422]}},"drzwi2":{"icon":[63.77,73.33],"open":{"file":"drzwi2_otwarte.webp","box":[62.305,68.945,5.339,8.398]}}}},"swieta_dzien_pion":{"season":"swieta","time":"dzien","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[11.74,46.31],"temp":[11.82,48.25],"light":{"file":"swiatlo_garaz.webp","box":[2.444,38.995,20.085,21.232]}},"warsztat":{"icon":[30.41,41.58],"temp":[30.48,43.53],"light":{"file":"swiatlo_warsztat.webp","box":[20.298,38.816,21.679,9.629]}},"salon":{"icon":[51.47,44.07],"temp":[51.53,46.01],"light":{"file":"swiatlo_salon.webp","box":[20.616,38.816,41.764,15.251]}},"biuro":{"icon":[65.08,42.11],"temp":[65.13,44.06],"light":{"file":"swiatlo_biuro.webp","box":[59.724,38.816,9.883,11.782]}},"sypialnia":{"icon":[82.97,41.54],"temp":[83.01,43.49],"light":{"file":"swiatlo_sypialnia.webp","box":[64.187,38.816,28.48,11.663]}},"silownia":{"icon":[27.69,53.5],"temp":[27.76,55.43],"light":{"file":"swiatlo_silownia.webp","box":[20.723,50.837,14.772,9.39]}},"lazienka":{"icon":[38.09,51.84],"temp":[38.15,53.77],"light":{"file":"swiatlo_lazienka.webp","box":[33.156,50.837,9.883,9.39]}},"kuchnia":{"icon":[51.8,55.15],"temp":[51.85,57.08],"light":{"file":"swiatlo_kuchnia.webp","box":[40.276,52.871,22.635,7.356]}},"korytarz":{"icon":[66.41,53.21],"temp":[66.46,55.15],"light":{"file":"swiatlo_korytarz.webp","box":[60.255,49.462,13.39,10.766]}},"garderoba":{"icon":[74.78,51.83],"temp":[74.82,53.77],"light":{"file":"swiatlo_garderoba.webp","box":[70.882,49.462,9.458,10.766]}},"pralnia_wc":{"icon":[88.46,53.21],"temp":[88.5,55.15],"light":{"file":"swiatlo_pralnia_wc.webp","box":[74.814,49.581,25.186,10.646]}}},"covers":{"brama":{"icon":[12.37,61.76],"open":{"file":"brama_otwarte.webp","box":[5.207,59.868,13.709,3.23]}},"drzwi1":{"icon":[22.26,61.76],"open":{"file":"drzwi1_otwarte.webp","box":[20.723,60.227,4.57,3.23]}},"drzwi2":{"icon":[66.11,61.77],"open":{"file":"drzwi2_otwarte.webp","box":[64.506,59.809,5.632,3.768]}}}},"swieta_dzien_szeroki":{"season":"swieta","time":"dzien","orient":"szeroki","w":1933,"h":813,"bg":"tlo.webp","rooms":{"garaz":{"icon":[11.99,35.68],"temp":[12.02,42.19],"light":{"file":"swiatlo_garaz.webp","box":[2.535,10.209,19.762,73.432]}},"warsztat":{"icon":[29.91,19.87],"temp":[29.94,26.39],"light":{"file":"swiatlo_warsztat.webp","box":[20.021,9.594,21.055,34.317]}},"salon":{"icon":[49.99,28.29],"temp":[50.02,34.82],"light":{"file":"swiatlo_salon.webp","box":[20.176,9.594,40.404,53.26]}},"biuro":{"icon":[63.0,21.78],"temp":[63.04,28.31],"light":{"file":"swiatlo_biuro.webp","box":[57.682,9.594,9.829,41.697]}},"sypialnia":{"icon":[80.08,19.93],"temp":[80.12,26.47],"light":{"file":"swiatlo_sypialnia.webp","box":[61.976,9.717,27.574,41.328]}},"silownia":{"icon":[27.09,59.95],"temp":[27.12,66.49],"light":{"file":"swiatlo_silownia.webp","box":[20.228,49.938,14.485,33.702]}},"lazienka":{"icon":[37.08,54.39],"temp":[37.11,60.92],"light":{"file":"swiatlo_lazienka.webp","box":[32.126,49.938,9.881,33.825]}},"kuchnia":{"icon":[50.17,65.64],"temp":[50.21,72.19],"light":{"file":"swiatlo_kuchnia.webp","box":[38.903,56.95,22.09,26.814]}},"korytarz":{"icon":[64.21,59.15],"temp":[64.24,65.7],"light":{"file":"swiatlo_korytarz.webp","box":[58.148,45.51,13.295,38.376]}},"garderoba":{"icon":[72.23,54.5],"temp":[72.26,61.05],"light":{"file":"swiatlo_garderoba.webp","box":[68.236,45.51,9.467,38.376]}},"pralnia_wc":{"icon":[85.35,59.23],"temp":[85.39,65.78],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.012,45.879,25.66,38.13]}}},"covers":{"brama":{"icon":[12.21,87.88],"open":{"file":"brama_otwarte.webp","box":[5.432,81.55,13.037,10.824]}},"drzwi1":{"icon":[21.71,87.93],"open":{"file":"drzwi1_otwarte.webp","box":[20.331,82.657,4.242,11.07]}},"drzwi2":{"icon":[63.86,88.16],"open":{"file":"drzwi2_otwarte.webp","box":[62.39,81.673,5.329,12.546]}}}},"swieta_noc_pion":{"season":"swieta","time":"noc","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[11.69,46.88],"temp":[11.7,48.72],"light":{"file":"swiatlo_garaz.webp","box":[1.807,39.952,20.298,20.156]}},"warsztat":{"icon":[30.67,42.38],"temp":[30.67,44.23],"light":{"file":"swiatlo_warsztat.webp","box":[20.51,39.773,21.573,9.151]}},"salon":{"icon":[52.01,44.72],"temp":[52.0,46.58],"light":{"file":"swiatlo_salon.webp","box":[20.51,39.713,42.402,14.593]}},"biuro":{"icon":[66.02,42.84],"temp":[66.02,44.7],"light":{"file":"swiatlo_biuro.webp","box":[60.68,39.653,9.671,11.364]}},"sypialnia":{"icon":[84.52,42.26],"temp":[84.51,44.14],"light":{"file":"swiatlo_sypialnia.webp","box":[65.25,39.653,29.118,11.244]}},"silownia":{"icon":[27.49,53.73],"temp":[27.5,55.57],"light":{"file":"swiatlo_silownia.webp","box":[20.51,51.136,14.665,9.031]}},"lazienka":{"icon":[38.11,52.15],"temp":[38.11,54.0],"light":{"file":"swiatlo_lazienka.webp","box":[33.156,51.136,9.777,9.031]}},"kuchnia":{"icon":[52.0,55.35],"temp":[52.0,57.2],"light":{"file":"swiatlo_kuchnia.webp","box":[40.276,53.11,22.954,7.117]}},"korytarz":{"icon":[67.09,53.5],"temp":[67.09,55.37],"light":{"file":"swiatlo_korytarz.webp","box":[60.786,49.88,13.921,10.407]}},"garderoba":{"icon":[75.77,52.18],"temp":[75.77,54.05],"light":{"file":"swiatlo_garderoba.webp","box":[71.626,49.88,9.671,10.407]}},"pralnia_wc":{"icon":[89.97,53.53],"temp":[89.97,55.41],"light":{"file":"swiatlo_pralnia_wc.webp","box":[75.877,49.94,24.123,10.407]}}},"covers":{"brama":{"icon":[11.71,61.58],"open":{"file":"brama_otwarte.webp","box":[4.57,59.749,13.709,3.11]}},"drzwi1":{"icon":[21.69,61.61],"open":{"file":"drzwi1_otwarte.webp","box":[20.191,60.108,4.463,3.17]}},"drzwi2":{"icon":[66.54,61.77],"open":{"file":"drzwi2_otwarte.webp","box":[64.931,59.868,5.739,3.648]}}}},"swieta_noc_szeroki":{"season":"swieta","time":"noc","orient":"szeroki","w":1933,"h":814,"bg":"tlo.webp","rooms":{"garaz":{"icon":[18.57,35.79],"temp":[18.47,41.35],"light":{"file":"swiatlo_garaz.webp","box":[9.364,14.128,17.951,64.496]}},"warsztat":{"icon":[33.36,22.7],"temp":[33.35,28.07],"light":{"file":"swiatlo_warsztat.webp","box":[24.987,13.882,17.641,29.361]}},"salon":{"icon":[49.52,29.73],"temp":[49.62,35.17],"light":{"file":"swiatlo_salon.webp","box":[24.935,14.005,33.833,45.7]}},"biuro":{"icon":[59.8,24.43],"temp":[59.96,29.79],"light":{"file":"swiatlo_biuro.webp","box":[55.199,14.005,9.002,35.627]}},"sypialnia":{"icon":[73.22,23.03],"temp":[73.46,28.35],"light":{"file":"swiatlo_sypialnia.webp","box":[58.562,14.128,23.383,35.258]}},"silownia":{"icon":[30.81,56.81],"temp":[30.79,62.62],"light":{"file":"swiatlo_silownia.webp","box":[24.832,47.666,12.519,30.835]}},"lazienka":{"icon":[39.15,51.89],"temp":[39.18,57.63],"light":{"file":"swiatlo_lazienka.webp","box":[34.816,47.666,8.743,30.835]}},"kuchnia":{"icon":[50.09,61.76],"temp":[50.19,67.6],"light":{"file":"swiatlo_kuchnia.webp","box":[40.455,53.686,19.089,24.693]}},"korytarz":{"icon":[61.56,55.98],"temp":[61.74,61.74],"light":{"file":"swiatlo_korytarz.webp","box":[56.182,43.735,11.692,34.644]}},"garderoba":{"icon":[68.0,51.92],"temp":[68.21,57.61],"light":{"file":"swiatlo_garderoba.webp","box":[64.822,43.735,8.691,34.644]}},"pralnia_wc":{"icon":[78.8,55.98],"temp":[79.09,61.71],"light":{"file":"swiatlo_pralnia_wc.webp","box":[67.46,44.103,22.504,34.152]}}},"covers":{"brama":{"icon":[17.75,82.35],"open":{"file":"brama_otwarte.webp","box":[11.795,76.413,11.433,10.197]}},"drzwi1":{"icon":[25.97,82.29],"open":{"file":"drzwi1_otwarte.webp","box":[24.78,77.396,3.725,10.319]}},"drzwi2":{"icon":[61.94,82.05],"open":{"file":"drzwi2_otwarte.webp","box":[60.528,76.044,4.915,11.548]}}}},"zima_dzien_pion":{"season":"zima","time":"dzien","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.24,45.31],"temp":[12.25,46.99],"light":{"file":"swiatlo_garaz.webp","box":[2.763,38.935,19.66,18.541]}},"warsztat":{"icon":[30.46,41.21],"temp":[30.48,42.9],"light":{"file":"swiatlo_warsztat.webp","box":[20.616,38.756,20.935,8.493]}},"salon":{"icon":[50.84,43.38],"temp":[50.86,45.06],"light":{"file":"swiatlo_salon.webp","box":[20.723,38.756,40.595,13.397]}},"biuro":{"icon":[64.07,41.68],"temp":[64.09,43.37],"light":{"file":"swiatlo_biuro.webp","box":[58.98,38.756,9.352,10.347]}},"sypialnia":{"icon":[81.44,41.2],"temp":[81.46,42.89],"light":{"file":"swiatlo_sypialnia.webp","box":[63.231,38.756,27.524,10.287]}},"silownia":{"icon":[27.53,51.56],"temp":[27.54,53.25],"light":{"file":"swiatlo_silownia.webp","box":[20.723,49.163,14.24,8.373]}},"lazienka":{"icon":[37.68,50.12],"temp":[37.7,51.81],"light":{"file":"swiatlo_lazienka.webp","box":[32.837,49.163,9.564,8.373]}},"kuchnia":{"icon":[50.95,53.02],"temp":[50.97,54.71],"light":{"file":"swiatlo_kuchnia.webp","box":[39.745,50.957,21.892,6.579]}},"korytarz":{"icon":[65.21,51.34],"temp":[65.23,53.02],"light":{"file":"swiatlo_korytarz.webp","box":[59.192,47.967,13.177,9.569]}},"garderoba":{"icon":[73.37,50.13],"temp":[73.39,51.82],"light":{"file":"swiatlo_garderoba.webp","box":[69.501,47.967,9.245,9.569]}},"pralnia_wc":{"icon":[86.68,51.34],"temp":[86.71,53.03],"light":{"file":"swiatlo_pralnia_wc.webp","box":[73.433,48.086,25.505,9.45]}}},"covers":{"brama":{"icon":[12.37,58.78],"open":{"file":"brama_otwarte.webp","box":[5.526,57.117,13.177,2.811]}},"drzwi1":{"icon":[22.01,58.78],"open":{"file":"drzwi1_otwarte.webp","box":[20.616,57.416,4.357,2.871]}},"drzwi2":{"icon":[64.79,58.82],"open":{"file":"drzwi2_otwarte.webp","box":[63.231,57.117,5.526,3.289]}}}},"zima_dzien_poziom":{"season":"zima","time":"dzien","orient":"poziom","w":1536,"h":1024,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.02,39.5],"temp":[12.03,43.88],"light":{"file":"swiatlo_garaz.webp","box":[2.539,22.656,19.596,48.828]}},"warsztat":{"icon":[29.98,28.84],"temp":[29.99,33.22],"light":{"file":"swiatlo_warsztat.webp","box":[20.247,22.266,20.768,22.461]}},"salon":{"icon":[50.03,34.47],"temp":[50.05,38.86],"light":{"file":"swiatlo_salon.webp","box":[20.312,22.266,40.169,35.156]}},"biuro":{"icon":[63.04,30.07],"temp":[63.07,34.47],"light":{"file":"swiatlo_biuro.webp","box":[57.878,22.266,9.505,27.344]}},"sypialnia":{"icon":[80.1,28.81],"temp":[80.13,33.2],"light":{"file":"swiatlo_sypialnia.webp","box":[62.109,22.266,27.279,27.148]}},"silownia":{"icon":[27.08,55.81],"temp":[27.1,60.2],"light":{"file":"swiatlo_silownia.webp","box":[20.312,49.414,14.258,22.07]}},"lazienka":{"icon":[37.08,52.05],"temp":[37.1,56.44],"light":{"file":"swiatlo_lazienka.webp","box":[32.227,49.414,9.635,22.07]}},"kuchnia":{"icon":[50.16,59.59],"temp":[50.18,63.99],"light":{"file":"swiatlo_kuchnia.webp","box":[38.997,54.004,21.81,17.48]}},"korytarz":{"icon":[64.19,55.2],"temp":[64.21,59.6],"light":{"file":"swiatlo_korytarz.webp","box":[58.203,46.289,13.086,25.293]}},"garderoba":{"icon":[72.2,52.06],"temp":[72.23,56.46],"light":{"file":"swiatlo_garderoba.webp","box":[68.294,46.289,9.245,25.293]}},"pralnia_wc":{"icon":[85.29,55.21],"temp":[85.32,59.61],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.07,46.484,25.391,25.098]}}},"covers":{"brama":{"icon":[12.14,74.64],"open":{"file":"brama_otwarte.webp","box":[5.339,70.41,13.086,7.227]}},"drzwi1":{"icon":[21.65,74.65],"open":{"file":"drzwi1_otwarte.webp","box":[20.247,71.094,4.297,7.422]}},"drzwi2":{"icon":[63.79,74.7],"open":{"file":"drzwi2_otwarte.webp","box":[62.305,70.312,5.339,8.398]}}}},"zima_noc_pion":{"season":"zima","time":"noc","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.0,44.43],"temp":[12.01,46.14],"light":{"file":"swiatlo_garaz.webp","box":[2.232,37.919,20.085,18.9]}},"warsztat":{"icon":[30.76,40.27],"temp":[30.77,41.98],"light":{"file":"swiatlo_warsztat.webp","box":[20.723,37.799,21.36,8.612]}},"salon":{"icon":[51.68,42.46],"temp":[51.68,44.18],"light":{"file":"swiatlo_salon.webp","box":[20.723,37.739,41.552,13.577]}},"biuro":{"icon":[65.29,40.74],"temp":[65.29,42.46],"light":{"file":"swiatlo_biuro.webp","box":[60.043,37.739,9.564,10.526]}},"sypialnia":{"icon":[83.12,40.25],"temp":[83.12,41.96],"light":{"file":"swiatlo_sypialnia.webp","box":[64.506,37.739,28.055,10.467]}},"silownia":{"icon":[27.67,50.78],"temp":[27.67,52.49],"light":{"file":"swiatlo_silownia.webp","box":[20.829,48.325,14.453,8.493]}},"lazienka":{"icon":[38.1,49.31],"temp":[38.1,51.02],"light":{"file":"swiatlo_lazienka.webp","box":[33.156,48.325,9.671,8.493]}},"kuchnia":{"icon":[51.68,52.25],"temp":[51.68,53.96],"light":{"file":"swiatlo_kuchnia.webp","box":[40.17,50.179,22.423,6.639]}},"korytarz":{"icon":[66.33,50.54],"temp":[66.32,52.25],"light":{"file":"swiatlo_korytarz.webp","box":[60.255,47.129,13.39,9.689]}},"garderoba":{"icon":[74.71,49.31],"temp":[74.7,51.03],"light":{"file":"swiatlo_garderoba.webp","box":[70.67,47.129,9.352,9.689]}},"pralnia_wc":{"icon":[88.33,50.54],"temp":[88.33,52.25],"light":{"file":"swiatlo_pralnia_wc.webp","box":[74.814,47.249,25.186,9.569]}}},"covers":{"brama":{"icon":[12.07,58.09],"open":{"file":"brama_otwarte.webp","box":[4.995,56.459,13.603,2.811]}},"drzwi1":{"icon":[21.96,58.09],"open":{"file":"drzwi1_otwarte.webp","box":[20.51,56.699,4.463,2.931]}},"drzwi2":{"icon":[65.79,58.11],"open":{"file":"drzwi2_otwarte.webp","box":[64.293,56.4,5.526,3.289]}}}},"zima_noc_poziom":{"season":"zima","time":"noc","orient":"poziom","w":1535,"h":1025,"bg":"tlo.webp","rooms":{"garaz":{"icon":[11.98,37.32],"temp":[12.0,41.72],"light":{"file":"swiatlo_garaz.webp","box":[2.476,20.39,19.609,48.976]}},"warsztat":{"icon":[29.95,26.63],"temp":[29.96,31.03],"light":{"file":"swiatlo_warsztat.webp","box":[20.195,20.0,20.782,22.537]}},"salon":{"icon":[50.0,32.29],"temp":[50.02,36.69],"light":{"file":"swiatlo_salon.webp","box":[20.261,20.0,40.195,35.317]}},"biuro":{"icon":[63.01,27.88],"temp":[63.03,32.29],"light":{"file":"swiatlo_biuro.webp","box":[57.85,20.0,9.511,27.415]}},"sypialnia":{"icon":[80.05,26.62],"temp":[80.08,31.03],"light":{"file":"swiatlo_sypialnia.webp","box":[62.02,20.0,27.296,27.317]}},"silownia":{"icon":[27.06,53.69],"temp":[27.07,58.1],"light":{"file":"swiatlo_silownia.webp","box":[20.326,47.22,14.202,22.244]}},"lazienka":{"icon":[37.06,49.91],"temp":[37.08,54.32],"light":{"file":"swiatlo_lazienka.webp","box":[32.182,47.22,9.642,22.244]}},"kuchnia":{"icon":[50.13,57.49],"temp":[50.15,61.9],"light":{"file":"swiatlo_kuchnia.webp","box":[38.958,51.902,21.889,17.561]}},"korytarz":{"icon":[64.16,53.08],"temp":[64.18,57.5],"light":{"file":"swiatlo_korytarz.webp","box":[58.176,44.195,13.094,25.268]}},"garderoba":{"icon":[72.17,49.93],"temp":[72.2,54.35],"light":{"file":"swiatlo_garderoba.webp","box":[68.274,44.195,9.186,25.268]}},"pralnia_wc":{"icon":[85.25,53.09],"temp":[85.28,57.51],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.052,44.39,25.342,25.073]}}},"covers":{"brama":{"icon":[12.1,72.58],"open":{"file":"brama_otwarte.webp","box":[5.342,68.293,13.029,7.317]}},"drzwi1":{"icon":[21.62,72.6],"open":{"file":"drzwi1_otwarte.webp","box":[20.261,69.073,4.235,7.415]}},"drzwi2":{"icon":[63.77,72.65],"open":{"file":"drzwi2_otwarte.webp","box":[62.28,68.195,5.342,8.488]}}}},"jesien_dzien_poziom_2":{"season":"jesien","time":"dzien","orient":"poziom","w":1536,"h":1024,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.0,33.28],"temp":[12.02,37.68],"light":{"file":"swiatlo_garaz.webp","box":[2.539,16.406,19.596,48.926]}},"warsztat":{"icon":[29.92,22.57],"temp":[29.94,26.97],"light":{"file":"swiatlo_warsztat.webp","box":[20.182,16.016,20.768,22.461]}},"salon":{"icon":[49.96,28.2],"temp":[49.99,32.61],"light":{"file":"swiatlo_salon.webp","box":[20.247,15.918,40.169,35.352]}},"biuro":{"icon":[62.97,23.78],"temp":[63.0,28.19],"light":{"file":"swiatlo_biuro.webp","box":[57.812,15.918,9.505,27.441]}},"sypialnia":{"icon":[80.03,22.49],"temp":[80.06,26.9],"light":{"file":"swiatlo_sypialnia.webp","box":[61.979,15.918,27.344,27.246]}},"silownia":{"icon":[27.05,49.63],"temp":[27.07,54.04],"light":{"file":"swiatlo_silownia.webp","box":[20.312,43.164,14.258,22.168]}},"lazienka":{"icon":[37.04,45.85],"temp":[37.06,50.26],"light":{"file":"swiatlo_lazienka.webp","box":[32.227,43.164,9.57,22.168]}},"kuchnia":{"icon":[50.11,53.41],"temp":[50.13,57.83],"light":{"file":"swiatlo_kuchnia.webp","box":[38.932,47.852,21.875,17.48]}},"korytarz":{"icon":[64.13,49.0],"temp":[64.16,53.42],"light":{"file":"swiatlo_korytarz.webp","box":[58.138,40.039,13.151,25.391]}},"garderoba":{"icon":[72.15,45.84],"temp":[72.18,50.26],"light":{"file":"swiatlo_garderoba.webp","box":[68.294,40.039,9.18,25.391]}},"pralnia_wc":{"icon":[85.25,48.99],"temp":[85.28,53.42],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.07,40.332,25.326,25.098]}}},"covers":{"brama":{"icon":[12.14,68.52],"open":{"file":"brama_otwarte.webp","box":[5.404,64.258,12.956,7.324]}},"drzwi1":{"icon":[21.64,68.54],"open":{"file":"drzwi1_otwarte.webp","box":[20.247,64.941,4.232,7.52]}},"drzwi2":{"icon":[63.75,68.58],"open":{"file":"drzwi2_otwarte.webp","box":[62.24,64.16,5.339,8.496]}}}},"jesien_noc_poziom_2":{"season":"jesien","time":"noc","orient":"poziom","w":1672,"h":941,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.04,37.58],"temp":[12.06,42.81],"light":{"file":"swiatlo_garaz.webp","box":[2.691,17.535,19.498,58.13]}},"warsztat":{"icon":[29.98,24.87],"temp":[30.0,30.1],"light":{"file":"swiatlo_warsztat.webp","box":[20.215,17.003,20.813,26.886]}},"salon":{"icon":[50.05,31.58],"temp":[50.07,36.82],"light":{"file":"swiatlo_salon.webp","box":[20.275,17.003,40.191,41.977]}},"biuro":{"icon":[63.08,26.33],"temp":[63.1,31.57],"light":{"file":"swiatlo_biuro.webp","box":[57.895,16.897,9.569,32.731]}},"sypialnia":{"icon":[80.18,24.81],"temp":[80.2,30.06],"light":{"file":"swiatlo_sypialnia.webp","box":[62.081,16.897,27.392,32.519]}},"silownia":{"icon":[27.11,56.99],"temp":[27.13,62.22],"light":{"file":"swiatlo_silownia.webp","box":[20.335,49.309,14.294,26.355]}},"lazienka":{"icon":[37.1,52.52],"temp":[37.12,57.75],"light":{"file":"swiatlo_lazienka.webp","box":[32.237,49.309,9.629,26.355]}},"kuchnia":{"icon":[50.16,61.49],"temp":[50.17,66.73],"light":{"file":"swiatlo_kuchnia.webp","box":[38.995,54.835,21.83,20.829]}},"korytarz":{"icon":[64.19,56.27],"temp":[64.21,61.51],"light":{"file":"swiatlo_korytarz.webp","box":[58.194,45.59,13.158,30.181]}},"garderoba":{"icon":[72.22,52.54],"temp":[72.24,57.78],"light":{"file":"swiatlo_garderoba.webp","box":[68.242,45.59,9.27,30.181]}},"pralnia_wc":{"icon":[85.32,56.29],"temp":[85.33,61.53],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.069,45.909,25.359,29.862]}}},"covers":{"brama":{"icon":[12.22,79.34],"open":{"file":"brama_otwarte.webp","box":[5.443,74.283,13.038,8.714]}},"drzwi1":{"icon":[21.7,79.36],"open":{"file":"drzwi1_otwarte.webp","box":[20.335,75.133,4.246,8.82]}},"drzwi2":{"icon":[63.77,79.46],"open":{"file":"drzwi2_otwarte.webp","box":[62.321,74.176,5.263,10.096]}}}},"jesien_dzien_pion_2":{"season":"jesien","time":"dzien","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[11.72,46.64],"temp":[11.78,48.37],"light":{"file":"swiatlo_garaz.webp","box":[2.444,40.072,19.766,19.019]}},"warsztat":{"icon":[30.14,42.4],"temp":[30.18,44.14],"light":{"file":"swiatlo_warsztat.webp","box":[20.191,39.892,21.254,8.732]}},"salon":{"icon":[50.88,44.62],"temp":[50.91,46.36],"light":{"file":"swiatlo_salon.webp","box":[20.404,39.833,41.126,13.756]}},"biuro":{"icon":[64.36,42.86],"temp":[64.38,44.6],"light":{"file":"swiatlo_biuro.webp","box":[59.086,39.833,9.564,10.646]}},"sypialnia":{"icon":[82.08,42.34],"temp":[82.09,44.09],"light":{"file":"swiatlo_sypialnia.webp","box":[63.549,39.833,27.949,10.586]}},"silownia":{"icon":[27.31,53.05],"temp":[27.36,54.78],"light":{"file":"swiatlo_silownia.webp","box":[20.51,50.598,14.453,8.493]}},"lazienka":{"icon":[37.57,51.57],"temp":[37.61,53.3],"light":{"file":"swiatlo_lazienka.webp","box":[32.731,50.598,9.671,8.553]}},"kuchnia":{"icon":[51.05,54.54],"temp":[51.08,56.26],"light":{"file":"swiatlo_kuchnia.webp","box":[39.639,52.392,22.317,6.758]}},"korytarz":{"icon":[65.52,52.8],"temp":[65.54,54.54],"light":{"file":"swiatlo_korytarz.webp","box":[59.511,49.402,13.284,9.749]}},"garderoba":{"icon":[73.81,51.56],"temp":[73.83,53.3],"light":{"file":"swiatlo_garderoba.webp","box":[69.926,49.342,9.245,9.809]}},"pralnia_wc":{"icon":[87.35,52.8],"temp":[87.36,54.54],"light":{"file":"swiatlo_pralnia_wc.webp","box":[73.858,49.462,25.93,9.689]}}},"covers":{"brama":{"icon":[12.15,60.42],"open":{"file":"brama_otwarte.webp","box":[5.207,58.732,13.39,2.871]}},"drzwi1":{"icon":[21.86,60.43],"open":{"file":"drzwi1_otwarte.webp","box":[20.404,59.031,4.463,2.931]}},"drzwi2":{"icon":[65.09,60.47],"open":{"file":"drzwi2_otwarte.webp","box":[63.549,58.732,5.526,3.349]}}}},"jesien_noc_pion_2":{"season":"jesien","time":"noc","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.02,47.07],"temp":[12.04,48.76],"light":{"file":"swiatlo_garaz.webp","box":[2.55,40.67,19.66,18.6]}},"warsztat":{"icon":[30.17,42.99],"temp":[30.2,44.67],"light":{"file":"swiatlo_warsztat.webp","box":[20.404,40.55,20.829,8.493]}},"salon":{"icon":[50.46,45.15],"temp":[50.49,46.84],"light":{"file":"swiatlo_salon.webp","box":[20.51,40.55,40.489,13.337]}},"biuro":{"icon":[63.59,43.47],"temp":[63.63,45.15],"light":{"file":"swiatlo_biuro.webp","box":[58.448,40.55,9.458,10.347]}},"sypialnia":{"icon":[80.82,42.99],"temp":[80.86,44.67],"light":{"file":"swiatlo_sypialnia.webp","box":[62.806,40.55,27.418,10.287]}},"silownia":{"icon":[27.31,53.33],"temp":[27.33,55.02],"light":{"file":"swiatlo_silownia.webp","box":[20.51,50.957,14.346,8.313]}},"lazienka":{"icon":[37.42,51.89],"temp":[37.45,53.58],"light":{"file":"swiatlo_lazienka.webp","box":[32.625,50.957,9.564,8.313]}},"kuchnia":{"icon":[50.66,54.79],"temp":[50.69,56.48],"light":{"file":"swiatlo_kuchnia.webp","box":[39.426,52.691,21.998,6.579]}},"korytarz":{"icon":[64.83,53.1],"temp":[64.87,54.79],"light":{"file":"swiatlo_korytarz.webp","box":[58.874,49.761,13.071,9.569]}},"garderoba":{"icon":[72.93,51.9],"temp":[72.97,53.59],"light":{"file":"swiatlo_garderoba.webp","box":[69.182,49.761,9.139,9.569]}},"pralnia_wc":{"icon":[86.16,53.11],"temp":[86.21,54.8],"light":{"file":"swiatlo_pralnia_wc.webp","box":[72.901,49.821,25.505,9.51]}}},"covers":{"brama":{"icon":[12.21,60.57],"open":{"file":"brama_otwarte.webp","box":[5.313,58.911,13.284,2.811]}},"drzwi1":{"icon":[21.85,60.57],"open":{"file":"drzwi1_otwarte.webp","box":[20.404,59.211,4.357,2.871]}},"drzwi2":{"icon":[64.5,60.59],"open":{"file":"drzwi2_otwarte.webp","box":[62.912,58.911,5.526,3.23]}}}},"jesien_noc_pion_3":{"season":"jesien","time":"noc","orient":"pion","w":941,"h":1672,"bg":"tlo.webp","rooms":{"garaz":{"icon":[12.39,46.68],"temp":[12.39,48.36],"light":{"file":"swiatlo_garaz.webp","box":[2.763,40.311,19.766,18.6]}},"warsztat":{"icon":[30.61,42.59],"temp":[30.63,44.27],"light":{"file":"swiatlo_warsztat.webp","box":[20.829,40.132,20.829,8.493]}},"salon":{"icon":[50.97,44.74],"temp":[50.99,46.42],"light":{"file":"swiatlo_salon.webp","box":[20.829,40.132,40.701,13.337]}},"biuro":{"icon":[64.18,43.05],"temp":[64.22,44.73],"light":{"file":"swiatlo_biuro.webp","box":[58.98,40.132,9.564,10.347]}},"sypialnia":{"icon":[81.52,42.56],"temp":[81.57,44.24],"light":{"file":"swiatlo_sypialnia.webp","box":[63.337,40.132,27.63,10.287]}},"silownia":{"icon":[27.65,52.93],"temp":[27.66,54.62],"light":{"file":"swiatlo_silownia.webp","box":[20.935,50.538,14.24,8.373]}},"lazienka":{"icon":[37.82,51.48],"temp":[37.83,53.17],"light":{"file":"swiatlo_lazienka.webp","box":[33.05,50.538,9.458,8.373]}},"kuchnia":{"icon":[51.12,54.38],"temp":[51.15,56.08],"light":{"file":"swiatlo_kuchnia.webp","box":[39.851,52.333,22.104,6.579]}},"korytarz":{"icon":[65.4,52.69],"temp":[65.44,54.39],"light":{"file":"swiatlo_korytarz.webp","box":[59.511,49.342,13.071,9.569]}},"garderoba":{"icon":[73.57,51.48],"temp":[73.61,53.18],"light":{"file":"swiatlo_garderoba.webp","box":[69.713,49.342,9.245,9.569]}},"pralnia_wc":{"icon":[86.93,52.7],"temp":[86.98,54.39],"light":{"file":"swiatlo_pralnia_wc.webp","box":[73.645,49.402,25.717,9.51]}}},"covers":{"brama":{"icon":[12.41,60.18],"open":{"file":"brama_otwarte.webp","box":[5.526,58.553,13.284,2.811]}},"drzwi1":{"icon":[22.09,60.18],"open":{"file":"drzwi1_otwarte.webp","box":[20.723,58.792,4.251,2.931]}},"drzwi2":{"icon":[65.05,60.21],"open":{"file":"drzwi2_otwarte.webp","box":[63.549,58.493,5.42,3.289]}}}}};

const SEASON_NAMES = { lato: "Lato", jesien: "Jesień", zima: "Zima", swieta: "Święta" };

// marzec–sierpień lato, wrzesień–listopad jesień, grudzień–luty zima,
// 1 grudnia – 6 stycznia święta (zamiast zimy). Domyślnie zima już od 15 listopada.
function seasonFor(date, winterFromNov15 = true) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 || (m === 1 && d <= 6)) return "swieta";
  if (winterFromNov15 && m === 11 && d >= 15) return "zima";
  if (m >= 3 && m <= 8) return "lato";
  if (m >= 9 && m <= 11) return "jesien";
  return "zima";
}

function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

function autoThemeKey(hass, variant, winterFromNov15 = true) {
  const season = seasonFor(new Date(), winterFromNov15);
  const sun = hass && hass.states && hass.states["sun.sun"];
  const time = sun && sun.state === "below_horizon" ? "noc" : "dzien";
  let orient = isPortrait() ? "pion" : "poziom";
  if (season === "swieta" && orient === "poziom") orient = "szeroki";
  let key = `${season}_${time}_${orient}`;
  if (!THEMES[key]) key = `${season}_${time}_${orient === "pion" ? "poziom" : "pion"}`;
  if (!THEMES[key]) return null;
  return pickVariant(key, variant);
}

// Warianty motywu: <klucz>, <klucz>_2, <klucz>_3 ...
function variantsOf(key) {
  const list = [key];
  for (let i = 2; THEMES[`${key}_${i}`]; i++) list.push(`${key}_${i}`);
  return list;
}

function dayOfYear(date) {
  return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
}

// variant: 1|2|3 wymusza wariant, bez tego zmienia się codziennie (wg dnia roku).
function pickVariant(key, variant) {
  const list = variantsOf(key);
  const v = parseInt(variant, 10);
  if (v >= 1) return list[Math.min(v, list.length) - 1];
  return list[dayOfYear(new Date()) % list.length];
}

// Przezroczysty obrazek o proporcjach nakładki (stan „wyłączone/zamknięte” = samo tło).
function emptyImg(w, h) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.round(w))}" height="${Math.max(1, Math.round(h))}"/>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function boxStyle(box) {
  const [l, t, w] = box;
  return {
    left: `${l + w / 2}%`,
    top: `${t + box[3] / 2}%`,
    width: `${w}%`,
    "pointer-events": "none",
  };
}

// Zwraca { cfg, layers }: cfg = karta picture-elements (tło, strefy kliknięć, ikony, temperatury),
// layers = nakładki rysowane przez kartę nad obrazem (poświata świateł, otwarta brama/drzwi),
// żeby mogły płynnie się rozjaśniać i gasnąć.
function buildThemed(config, key) {
  const th = THEMES[key];
  const base = (config.base_path || SCRIPT_BASE).replace(/\/$/, "");
  const dir = `${base}/themes/${key}`;
  const rooms = { ...DEFAULT_ROOMS, ...(config.rooms || {}) };
  const covers = { ...DEFAULT_COVERS, ...(config.covers || {}) };
  const portrait = th.orient === "pion";
  const iconSize = portrait ? "22px" : "28px";
  const taps = [];
  const controls = [];
  const layers = [];
  const badges = [];

  for (const [rk, def] of Object.entries(ROOMS)) {
    if (rooms[rk] === false) continue; // pokój schowany
    const room = rooms[rk] || {};
    const tr = th.rooms && th.rooms[rk];
    if (!tr) continue;
    const [il, it] = tr.icon;
    const [tl, tt] = tr.temp || [il, it + 4];
    if (room.light && tr.light) {
      const b = tr.light.box;
      layers.push({ kind: "light", entity: room.light, src: `${dir}/${tr.light.file}${ASSET_Q}`, box: b,
        center: [((il - b[0]) / b[2]) * 100, ((it - b[1]) / b[3]) * 100] });
      // niewidoczna strefa na cały pokój: klik = włącz/wyłącz, przytrzymanie = szczegóły
      taps.push({
        area: b[2] * b[3],
        el: {
          type: "image",
          entity: room.light,
          title: `${room.name || def.name} - światło`,
          image: emptyImg(b[2] * th.w, b[3] * th.h),
          tap_action: { action: "toggle" },
          hold_action: { action: "more-info" },
          style: { ...boxStyle(b), "pointer-events": "auto", cursor: "pointer" },
        },
      });
      if (config.light_icons !== false) {
        badges.push({ kind: "light", entity: room.light, name: room.name || def.name, icon: room.icon, pos: [il, it] });
      }
    }
    // temperatura pod ikoną pokoju (albo w jej miejscu, gdy pokój nie ma ikony)
    const withIcon = !!(room.light && tr.light && config.light_icons !== false);
    if (room.temperature || config.show_empty_temp) {
      badges.push({ kind: "temp", entity: room.temperature || null, name: room.name || def.name, pos: [il, it], below: withIcon });
    }
  }

  for (const [ck, def] of Object.entries(COVERS)) {
    const entity = covers[ck];
    const tc = th.covers && th.covers[ck];
    if (!tc) continue;
    if (!entity) {
      if (ck === "brama" && config.gate_action) badges.push({ kind: "gate", entity: null, name: def.name, pos: tc.icon, openStates: [] });
      continue;
    }
    const isSensor = !entity.startsWith("cover.");
    const openStates = openStatesFor(config, ck);
    if (tc.open) layers.push({ kind: "cover", entity, src: `${dir}/${tc.open.file}${ASSET_Q}`, box: tc.open.box, openStates });
    if (ck === "brama") {
      // brama: własny przycisk (klik = szczegóły, przytrzymanie = potwierdzenie i otwarcie)
      badges.push({ kind: "gate", entity, name: def.name, pos: tc.icon, openStates });
      continue;
    }
    controls.push({
      type: "state-icon",
      entity,
      title: def.name,
      state_color: true,
      tap_action: isSensor ? { action: "more-info" } : { action: "toggle" },
      hold_action: { action: "more-info" },
      style: {
        left: `${tc.icon[0]}%`, top: `${tc.icon[1]}%`,
        background: "rgba(0,0,0,0.55)", "border-radius": "12px", padding: "6px",
        "--mdc-icon-size": portrait ? "26px" : "32px",
      },
    });
  }

  // kamery: miniatury pod bramą / pod drzwiami głównymi / w lewym górnym rogu
  const cams = { ...DEFAULT_CAMERAS, ...(config.cameras || {}) };
  for (const [camKey, def] of Object.entries(CAMERAS)) {
    const entity = cams[camKey];
    if (!entity) continue;
    let pos;
    let corner = false;
    if (def.anchor === "corner") {
      pos = [1.5, 2.5];
      corner = true;
    } else {
      const tc = th.covers && th.covers[def.anchor];
      if (!tc) continue;
      pos = [tc.icon[0], tc.icon[1] + (portrait ? 2.2 : 4.5)];
    }
    badges.push({ kind: "camera", entity, name: def.name, pos, corner });
  }

  // większe strefy pod spodem, mniejsze na wierzchu (np. warsztat wewnątrz prostokąta salonu)
  taps.sort((a, b) => b.area - a.area);

  return {
    cfg: {
      type: "picture-elements",
      image: `${dir}/${th.bg}${ASSET_Q}`,
      elements: [...taps.map((t) => t.el), ...controls, ...(config.extra_elements || [])],
    },
    layers,
    badges,
  };
}

// Czy nakładka ma być widoczna. Nieznany / niedostępny stan = zgaszone / zamknięte.
function layerOn(layer, hass) {
  const st = hass && hass.states && hass.states[layer.entity];
  if (!st) return false;
  if (layer.kind === "light") return st.state === "on";
  return (layer.openStates || DEFAULT_OPEN).includes(String(st.state).toLowerCase());
}

// Stan „otwarta” dla bramy/drzwi: open_states: { brama: "open" } (kilka po przecinku). Inne stany = zamknięta.
const DEFAULT_OPEN = ["on", "open", "opening"];
function openStatesFor(config, key) {
  const v = config.open_states && config.open_states[key];
  if (!v) return DEFAULT_OPEN;
  return String(v).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}

// Który motyw: wymuszony z config.theme, automatyczny albo null = klasyczny plan (stare obrazki).
function resolveTheme(config, hass) {
  const t = config.theme || "auto";
  if (t === "classic" || t === "klasyczny") return null;
  if (t !== "auto") return THEMES[t] ? (config.variant ? pickVariant(t, config.variant) : t) : null;
  return autoThemeKey(hass, config.variant, config.winter_from_nov15 !== false);
}

const BADGE_CSS = `
.fp-badges { position: absolute; inset: 0; pointer-events: none; }
.fp-light, .fp-temp { position: absolute; pointer-events: auto; cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent; }
.fp-light { width: var(--fp-s); height: var(--fp-s); transform: translate(-50%, -50%); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(18, 20, 26, 0.55); border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.72); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  --mdc-icon-size: calc(var(--fp-s) * 0.58);
  transition: background 0.6s ease, color 0.6s ease, box-shadow 0.6s ease, border-color 0.6s ease; }
.fp-light.on { color: #fff7df; border-color: rgba(255, 214, 150, 0.9);
  background: radial-gradient(circle at 50% 40%, #ffd78a 0%, #f6a83c 55%, #c9761e 100%);
  box-shadow: 0 0 calc(var(--fp-s) * 0.18) rgba(255, 176, 72, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4); }
.fp-light.na { opacity: 0.45; }
.fp-light:hover { transform: translate(-50%, -50%) scale(1.08); }
.fp-temp { transform: translate(-50%, -50%); display: flex; align-items: center; gap: 2px; white-space: nowrap;
  padding: calc(var(--fp-s) * 0.06) calc(var(--fp-s) * 0.22) calc(var(--fp-s) * 0.06) calc(var(--fp-s) * 0.1);
  border-radius: 999px; background: rgba(18, 20, 26, 0.62); border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  color: #fff; font: 600 calc(var(--fp-s) * 0.36) / 1.2 var(--paper-font-body1_-_font-family, system-ui, sans-serif);
  --mdc-icon-size: calc(var(--fp-s) * 0.4); }
.fp-temp ha-icon { color: #9be59b; }
.fp-temp.cold ha-icon { color: #7fc3ff; }
.fp-temp.warm ha-icon { color: #ffab5e; }
.fp-gate { position: absolute; pointer-events: auto; cursor: pointer; user-select: none; -webkit-user-select: none;
  touch-action: none; -webkit-touch-callout: none; transform: translate(-50%, -50%); overflow: hidden;
  width: calc(var(--fp-s) * 1.15); height: calc(var(--fp-s) * 1.15); border-radius: calc(var(--fp-s) * 0.28);
  display: flex; align-items: center; justify-content: center; color: #e6edf5;
  background: rgba(18, 20, 26, 0.6); border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  --mdc-icon-size: calc(var(--fp-s) * 0.7); transition: background 0.4s ease, color 0.4s ease; }
.fp-gate.open { background: rgba(196, 64, 48, 0.85); border-color: rgba(255, 160, 140, 0.9); color: #fff; }
.fp-gate.na { opacity: 0.5; }
.fp-hold { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: #ffb347;
  transform: scaleX(0); transform-origin: left; }
.fp-confirm { position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.45); pointer-events: auto; }
.fp-confirm-box { min-width: 220px; max-width: 80%; padding: 18px 20px; border-radius: 16px; text-align: center;
  background: var(--card-background-color, #1c1f26); color: var(--primary-text-color, #fff);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6); --mdc-icon-size: 40px;
  font: 500 16px/1.4 var(--paper-font-body1_-_font-family, system-ui, sans-serif); }
.fp-confirm-box ha-icon { color: #ffb347; }
.fp-confirm-q { margin: 8px 0 14px; }
.fp-confirm-btns { display: flex; gap: 10px; justify-content: center; }
.fp-confirm-btns button { min-width: 84px; padding: 9px 16px; border-radius: 10px; border: 0; cursor: pointer;
  font: 600 15px/1 inherit; }
.fp-no { background: rgba(127, 127, 127, 0.25); color: inherit; }
.fp-yes { background: #e0533f; color: #fff; }
.fp-cam { position: absolute; pointer-events: auto; cursor: pointer; transform: translate(-50%, 0);
  width: var(--fp-cam-w); aspect-ratio: 16 / 9; border-radius: calc(var(--fp-s) * 0.22); overflow: hidden;
  background: #0b0f15; border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55); }
.fp-cam.fp-corner { transform: none; }
.fp-cam img { display: block; width: 100%; height: 100%; object-fit: cover; }
.fp-cam.na img { visibility: hidden; }
.fp-cam-label { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 3px;
  padding: 2px 6px; background: linear-gradient(transparent, rgba(0, 0, 0, 0.75)); color: #fff;
  font: 600 calc(var(--fp-s) * 0.3) / 1.2 var(--paper-font-body1_-_font-family, system-ui, sans-serif);
  --mdc-icon-size: calc(var(--fp-s) * 0.34); white-space: nowrap; overflow: hidden; }
.fp-cam-label ha-icon { color: #ff5d6c; }
.fp-cam:hover { box-shadow: 0 0 0 2px rgba(255, 200, 120, 0.8), 0 4px 14px rgba(0, 0, 0, 0.55); }
.fp-temp.fp-below { transform: translate(-50%, calc(var(--fp-s) * 0.62)); }
`;

// ==== EDYTOR WIZUALNY ====
const EDITOR_ROOMS = Object.keys(ROOMS);
const EDITOR_COVERS = Object.keys(COVERS);
const THEME_BASES = Object.keys(THEMES).filter((k) => !/_\d+$/.test(k));

class HaFloorPlanCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _data() {
    const c = this._config || {};
    const rooms = { ...DEFAULT_ROOMS, ...(c.rooms || {}) };
    const covers = { ...DEFAULT_COVERS, ...(c.covers || {}) };
    const d = {
      theme: c.theme || "auto",
      variant: c.variant ? String(c.variant) : "auto",
      light_icons: c.light_icons !== false,
      show_empty_temp: !!c.show_empty_temp,
      winter_from_nov15: c.winter_from_nov15 !== false,
      fullscreen: c.fullscreen !== false,
    };
    for (const k of EDITOR_ROOMS) {
      const r = rooms[k] || {};
      d[`${k}__light`] = r.light || "";
      d[`${k}__temperature`] = r.temperature || "";
    }
    for (const k of EDITOR_COVERS) d[`cover__${k}`] = covers[k] || "";
    for (const k of EDITOR_COVERS) d[`open__${k}`] = (c.open_states && c.open_states[k]) || "";
    d.gate_action = c.gate_action || "";
    d.gate_hold_ms = Number(c.gate_hold_ms) || 1000;
    const cams = { ...DEFAULT_CAMERAS, ...(c.cameras || {}) };
    for (const k of Object.keys(CAMERAS)) d[`camera__${k}`] = cams[k] || "";
    return d;
  }

  _schema() {
    const lightSel = { entity: { domain: ["light", "switch"] } };
    const tempSel = { entity: { domain: "sensor" } };
    const coverSel = { entity: { domain: ["binary_sensor", "cover", "sensor", "switch", "input_boolean", "lock"] } };
    return [
      {
        type: "grid", name: "", schema: [
          { name: "theme", selector: { select: { mode: "dropdown", options: [
            { value: "auto", label: "Automatyczny (pora roku, dzień/noc)" },
            { value: "classic", label: "Klasyczny plan" },
            ...THEME_BASES.map((k) => ({ value: k, label: k })),
          ] } } },
          { name: "variant", selector: { select: { mode: "dropdown", options: [
            { value: "auto", label: "Codziennie inny" }, { value: "1", label: "1" },
            { value: "2", label: "2" }, { value: "3", label: "3" },
          ] } } },
        ],
      },
      { name: "light_icons", selector: { boolean: {} } },
      { name: "show_empty_temp", selector: { boolean: {} } },
      { name: "winter_from_nov15", selector: { boolean: {} } },
      { name: "fullscreen", selector: { boolean: {} } },
      ...EDITOR_ROOMS.map((k) => ({
        type: "expandable", flatten: true, title: ROOMS[k].name, icon: "mdi:floor-plan",
        schema: [
          { name: `${k}__light`, selector: lightSel },
          { name: `${k}__temperature`, selector: tempSel },
        ],
      })),
      {
        type: "expandable", flatten: true, title: "Brama i drzwi", icon: "mdi:garage",
        schema: [
          ...EDITOR_COVERS.flatMap((k) => [
            { name: `cover__${k}`, selector: coverSel },
            { name: `open__${k}`, selector: { text: {} } },
          ]),
          { name: "gate_action", selector: { entity: { domain: ["cover", "button", "input_button", "switch", "script", "input_boolean"] } } },
          { name: "gate_hold_ms", selector: { number: { min: 300, max: 5000, step: 100, mode: "box", unit_of_measurement: "ms" } } },
        ],
      },
      {
        type: "expandable", flatten: true, title: "Kamery", icon: "mdi:cctv",
        schema: Object.keys(CAMERAS).map((k) => ({ name: `camera__${k}`, selector: { entity: { domain: "camera" } } })),
      },
    ];
  }

  _label(s) {
    const n = s.name || "";
    const labels = {
      theme: "Motyw", variant: "Wariant motywu", light_icons: "Ikonki światła",
      show_empty_temp: "Pokaż „–” w pokojach bez czujnika temperatury",
      winter_from_nov15: "Zima od 15 listopada", fullscreen: "Pełny ekran",
    };
    if (labels[n]) return labels[n];
    if (n.endsWith("__light")) return "Światło";
    if (n.endsWith("__temperature")) return "Czujnik temperatury";
    if (n.startsWith("cover__")) return `${COVERS[n.slice(7)].name} – stan`;
    if (n.startsWith("open__")) return `${COVERS[n.slice(6)].name}: stan „otwarta” (np. on, open; puste = on/open/opening)`;
    if (n === "gate_action") return "Otwieranie bramy (encja do wywołania)";
    if (n === "gate_hold_ms") return "Przytrzymanie bramy przed pytaniem";
    if (n.startsWith("camera__")) return CAMERAS[n.slice(8)].name;
    return n;
  }

  _changed(ev) {
    ev.stopPropagation();
    const d = ev.detail.value;
    const c = { ...this._config };
    c.theme = d.theme && d.theme !== "auto" ? d.theme : undefined;
    c.variant = d.variant && d.variant !== "auto" ? parseInt(d.variant, 10) : undefined;
    c.light_icons = d.light_icons === false ? false : undefined;
    c.show_empty_temp = d.show_empty_temp ? true : undefined;
    c.winter_from_nov15 = d.winter_from_nov15 === false ? false : undefined;
    c.fullscreen = d.fullscreen === false ? false : undefined;
    const rooms = {};
    for (const k of EDITOR_ROOMS) {
      const light = d[`${k}__light`] || undefined;
      const temperature = d[`${k}__temperature`] || undefined;
      const def = DEFAULT_ROOMS[k] || {};
      if (light === def.light && temperature === def.temperature) continue; // jak domyślnie
      if (!light && !temperature) { if (DEFAULT_ROOMS[k]) rooms[k] = false; continue; }
      rooms[k] = { ...(light ? { light } : {}), ...(temperature ? { temperature } : {}) };
    }
    const covers = {};
    for (const k of EDITOR_COVERS) {
      const e = d[`cover__${k}`] || undefined;
      if (e === DEFAULT_COVERS[k]) continue;
      if (!e) { if (DEFAULT_COVERS[k]) covers[k] = false; continue; }
      covers[k] = e;
    }
    c.rooms = Object.keys(rooms).length ? rooms : undefined;
    c.covers = Object.keys(covers).length ? covers : undefined;
    const open = {};
    for (const k of EDITOR_COVERS) if (d[`open__${k}`]) open[k] = d[`open__${k}`];
    c.open_states = Object.keys(open).length ? open : undefined;
    c.gate_action = d.gate_action || undefined;
    c.gate_hold_ms = d.gate_hold_ms && Number(d.gate_hold_ms) !== 1000 ? Number(d.gate_hold_ms) : undefined;
    const cameras = {};
    for (const k of Object.keys(CAMERAS)) {
      const e = d[`camera__${k}`] || undefined;
      if (e === DEFAULT_CAMERAS[k]) continue;
      if (!e) { if (DEFAULT_CAMERAS[k]) cameras[k] = false; continue; }
      cameras[k] = e;
    }
    c.cameras = Object.keys(cameras).length ? cameras : undefined;
    for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
    this._config = c;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
  }

  async _render() {
    if (!this._form) {
      // ha-form ładuje się leniwie; wymuszamy załadowanie przez edytor wbudowanej karty
      if (!customElements.get("ha-form")) {
        try {
          const helpers = await window.loadCardHelpers();
          const c = await helpers.createCardElement({ type: "entities", entities: [] });
          if (c.constructor.getConfigElement) await c.constructor.getConfigElement();
        } catch (e) { /* nic */ }
        await customElements.whenDefined("ha-form");
      }
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => this._label(s);
      this._form.addEventListener("value-changed", (ev) => this._changed(ev));
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = this._data();
  }
}

if (!customElements.get("ha-floor-plan-card-editor")) customElements.define("ha-floor-plan-card-editor", HaFloorPlanCardEditor);

class HaFloorPlanCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("ha-floor-plan-card-editor");
  }

  setConfig(config) {
    if (!config) throw new Error("Brak konfiguracji");
    this._config = config;
    this._card = null;
    this._themeKey = undefined;
    this._refresh();
  }

  connectedCallback() {
    // po powrocie do widoku (np. aplikacja z tła) zbuduj kartę od nowa, jeśli zniknęła
    if (this._config && !this.firstChild) { this._card = null; this._themeKey = undefined; this._refresh(); }
    if (!this._onResize) this._onResize = () => this._refresh();
    window.addEventListener("resize", this._onResize);
    // co minutę sprawdza datę (zmiana pory roku o północy)
    if (!this._timer) this._timer = setInterval(() => this._refresh(), 60000);
    // kamery odświeżają się także, gdy w HA nic się nie zmienia
    if (!this._camTimer) this._camTimer = setInterval(() => this._updateLayers(), 10000);
  }

  disconnectedCallback() {
    if (this._onResize) window.removeEventListener("resize", this._onResize);
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._camTimer) { clearInterval(this._camTimer); this._camTimer = null; }
  }

  // Przebudowuje kartę tylko, gdy zmienił się motyw.
  _refresh() {
    if (!this._config) return;
    const key = resolveTheme(this._config, this._hass);
    if (key === this._themeKey && (this._card || this._building)) return;
    this._themeKey = key;
    this._build(key);
  }

  async _build(key) {
    try {
      await this._buildInner(key);
    } catch (e) {
      // zamiast pustego miejsca pokaż, co poszło nie tak (łatwiej znaleźć problem na telefonie)
      this._building = false;
      console.error("ha-floor-plan-card:", e);
      this.innerHTML = `<ha-card style="padding:12px;color:var(--error-color,#db4437)">Mapa domu: błąd ładowania – ${String((e && e.message) || e).replace(/</g, "&lt;")}</ha-card>`;
    }
  }

  async _buildInner(key) {
    this._building = true;
    // w aplikacji na telefonie loadCardHelpers bywa dostępne chwilę później
    for (let i = 0; i < 50 && !window.loadCardHelpers; i++) await new Promise((res) => setTimeout(res, 100));
    const helpers = await window.loadCardHelpers();
    this._building = false;
    if (key !== this._themeKey) return; // w międzyczasie zmienił się motyw
    let cfg;
    let layers = [];
    let badges = [];
    if (key) ({ cfg, layers, badges } = buildThemed(this._config, key));
    else cfg = buildPictureElements(this._config);
    const card = helpers.createCardElement(cfg);
    if (this._hass) card.hass = this._hass;
    this.innerHTML = "";

    // opakowanie: karta + warstwa nakładek dokładnie nad obrazem
    const wrap = document.createElement("div");
    wrap.className = "fp-wrap";
    wrap.style.position = "relative";
    wrap.style.display = "block";
    const full = this._config.fullscreen !== false;
    if (full) {
      this.style.display = "block";
      this.style.width = "100%";
      card.style.setProperty("--ha-card-border-width", "0");
      card.style.setProperty("--ha-card-border-radius", "0");
      card.style.setProperty("--ha-card-box-shadow", "none");
      // Dopasowanie do ekranu: cały obraz mieści się w oknie bez przewijania
      // (wysokość okna minus górny pasek HA), proporcje zachowane, wyśrodkowany.
      const th = key ? THEMES[key] : null;
      const aspect = th ? th.w / th.h : 1933 / 814;
      wrap.style.maxWidth = `calc((100dvh - var(--header-height, 56px) - env(safe-area-inset-top, 0px)) * ${aspect.toFixed(4)})`;
      wrap.style.margin = "0 auto";
    }
    card.style.display = "block";
    card.style.width = "100%";
    wrap.appendChild(card);

    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden" });
    this._layers = layers.map((l) => {
      // kontener w miejscu nakładki; całość płynnie się rozjaśnia/gaśnie
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "absolute",
        left: `${l.box[0]}%`,
        top: `${l.box[1]}%`,
        width: `${l.box[2]}%`,
        height: `${l.box[3]}%`,
        opacity: "0",
        transition: "opacity 0.6s ease",
      });
      const img = document.createElement("img");
      img.src = l.src;
      img.alt = "";
      img.draggable = false;
      Object.assign(img.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
      box.appendChild(img);
      if (l.kind === "light") {
        // ciepła plama światła wokół lampy, przycięta maską do kształtu pokoju (nie wylewa się za ściany)
        const pool = document.createElement("div");
        const mask = `url("${l.src}")`;
        const [cx, cy] = l.center || [50, 50];
        Object.assign(pool.style, {
          position: "absolute", inset: "0",
          background: `radial-gradient(ellipse 70% 80% at ${cx}% ${cy}%, rgba(255,214,140,0.55) 0%, rgba(255,170,80,0.22) 45%, rgba(255,150,60,0) 80%)`,
          mixBlendMode: "screen",
          webkitMaskImage: mask, maskImage: mask,
          webkitMaskSize: "100% 100%", maskSize: "100% 100%",
          webkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        });
        box.appendChild(pool);
      }
      layer.appendChild(box);
      return { ...l, img: box };
    });
    wrap.appendChild(layer);

    // ikonki światła i temperatury (własna warstwa, skalowana z szerokością mapy)
    const th2 = key ? THEMES[key] : null;
    wrap.style.containerType = "inline-size";
    const pion = th2 && th2.orient === "pion";
    wrap.style.setProperty("--fp-s", pion ? "clamp(24px, 5.6cqw, 44px)" : "clamp(26px, 2.8cqw, 52px)");
    const camW = this._config.camera_size || (pion ? 30 : 15); // % szerokości mapy
    wrap.style.setProperty("--fp-cam-w", `clamp(90px, ${camW}cqw, 420px)`);
    const style = document.createElement("style");
    style.textContent = BADGE_CSS;
    wrap.appendChild(style);
    const blayer = document.createElement("div");
    blayer.className = "fp-badges";
    this._badges = badges.map((b) => {
      const el = document.createElement("div");
      el.style.left = `${b.pos[0]}%`;
      el.style.top = `${b.pos[1]}%`;
      if (b.kind === "gate") {
        el.className = "fp-gate";
        el.title = `${b.name} – przytrzymaj, żeby otworzyć`;
        el.innerHTML = `<ha-icon icon="mdi:garage"></ha-icon><div class="fp-hold"></div>`;
        this._bindGate(el, b);
      } else if (b.kind === "camera") {
        el.className = b.corner ? "fp-cam fp-corner" : "fp-cam";
        el.title = b.name;
        el.innerHTML = `<img alt=""><div class="fp-cam-label"><ha-icon icon="mdi:cctv"></ha-icon><span></span></div>`;
        el.querySelector("span").textContent = b.name.replace(/^Kamera /, "");
        this._bindPress(el, b.entity, true); // klik = podgląd na żywo (okno encji)
      } else if (b.kind === "light") {
        el.className = "fp-light";
        el.title = `${b.name} - światło`;
        el.innerHTML = `<ha-icon icon="${b.icon || "mdi:lightbulb-outline"}"></ha-icon>`;
        this._bindPress(el, b.entity);
      } else {
        el.className = b.below ? "fp-temp fp-below" : "fp-temp";
        el.title = `${b.name} - temperatura`;
        el.innerHTML = `<ha-icon icon="mdi:thermometer"></ha-icon><span></span>`;
        if (b.entity) this._bindPress(el, b.entity, true);
      }
      blayer.appendChild(el);
      return { ...b, el };
    });
    wrap.appendChild(blayer);

    this.appendChild(wrap);
    this._card = card;
    this._updateLayers();
  }

  _updateLayers() {
    if (this._layers) {
      for (const l of this._layers) {
        const op = layerOn(l, this._hass) ? "1" : "0";
        if (l.img.style.opacity !== op) l.img.style.opacity = op;
      }
    }
    if (!this._badges) return;
    const states = (this._hass && this._hass.states) || {};
    const now = Date.now();
    for (const b of this._badges) {
      const st = b.entity ? states[b.entity] : null;
      if (b.kind === "gate") {
        const open = !!st && (b.openStates || DEFAULT_OPEN).includes(String(st.state).toLowerCase());
        b.el.classList.toggle("open", open);
        b.el.classList.toggle("na", !!b.entity && (!st || st.state === "unavailable"));
        const ic = b.el.firstChild;
        const want = open ? "mdi:garage-open" : "mdi:garage";
        if (ic.getAttribute("icon") !== want) ic.setAttribute("icon", want);
        b._open = open;
        continue;
      }
      if (b.kind === "camera") {
        // obrazek z kamery odświeżany co 10 s (adres z tokenem bierzemy z encji)
        const pic = st && st.attributes && st.attributes.entity_picture;
        const img = b.el.firstChild;
        b.el.classList.toggle("na", !pic || st.state === "unavailable");
        if (pic && (!b._t || now - b._t > 10000 || b._pic !== pic)) {
          b._t = now;
          b._pic = pic;
          const url = this._hass.hassUrl ? this._hass.hassUrl(pic) : pic;
          img.src = `${url}${url.includes("?") ? "&" : "?"}_t=${now}`;
        }
        continue;
      }
      if (b.kind === "light") {
        const on = !!st && st.state === "on";
        b.el.classList.toggle("on", on);
        b.el.classList.toggle("na", !st || st.state === "unavailable");
        const icon = b.el.firstChild;
        const want = b.icon || (on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline");
        if (icon && icon.getAttribute("icon") !== want) icon.setAttribute("icon", want);
      } else {
        const span = b.el.lastChild;
        const v = st ? parseFloat(st.state) : NaN;
        let txt = "–";
        if (!isNaN(v)) txt = `${v.toLocaleString("pl-PL", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}°`;
        if (span.textContent !== txt) span.textContent = txt;
        b.el.classList.toggle("cold", !isNaN(v) && v < 18);
        b.el.classList.toggle("warm", !isNaN(v) && v > 24);
      }
    }
  }

  // Brama: klik = szczegóły, przytrzymanie (gate_hold_ms, domyślnie 1 s) = okno „Na pewno…?”
  _bindGate(el, b) {
    const holdMs = Number(this._config.gate_hold_ms) || 1000;
    let timer = null;
    let held = false;
    const bar = el.querySelector(".fp-hold");
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      bar.style.transition = "none";
      bar.style.transform = "scaleX(0)";
    };
    el.addEventListener("contextmenu", (ev) => ev.preventDefault());
    el.addEventListener("pointerdown", () => {
      held = false;
      bar.style.transition = `transform ${holdMs}ms linear`;
      bar.style.transform = "scaleX(1)";
      timer = setTimeout(() => { held = true; cancel(); this._confirmGate(b); }, holdMs);
    });
    el.addEventListener("pointerup", () => { if (!held) cancel(); });
    el.addEventListener("pointerleave", cancel);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (held) return;
      cancel();
      const id = b.entity || this._config.gate_action;
      if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }));
    });
  }

  _confirmGate(b) {
    const wrap = this.querySelector(".fp-wrap");
    if (!wrap || wrap.querySelector(".fp-confirm")) return;
    const target = this._config.gate_action || b.entity;
    const domain = target ? target.split(".")[0] : "";
    const canAct = ["cover", "button", "input_button", "switch", "script", "input_boolean"].includes(domain);
    const closing = domain === "cover" && b._open;
    const dlg = document.createElement("div");
    dlg.className = "fp-confirm";
    dlg.innerHTML = `<div class="fp-confirm-box">
      <ha-icon icon="${closing ? "mdi:garage" : "mdi:garage-open"}"></ha-icon>
      <div class="fp-confirm-q"></div>
      <div class="fp-confirm-btns"><button class="fp-no">Nie</button><button class="fp-yes">Tak</button></div></div>`;
    dlg.querySelector(".fp-confirm-q").textContent = canAct
      ? (closing ? "Na pewno zamknąć bramę?" : "Na pewno otworzyć bramę?")
      : "Nie wybrano encji otwierającej bramę. Ustaw „Otwieranie bramy” w edytorze karty.";
    const yes = dlg.querySelector(".fp-yes");
    if (!canAct) yes.remove();
    const close = () => dlg.remove();
    dlg.addEventListener("click", (ev) => { ev.stopPropagation(); if (ev.target === dlg) close(); });
    dlg.querySelector(".fp-no").addEventListener("click", close);
    yes.addEventListener("click", () => {
      close();
      if (!this._hass) return;
      const data = { entity_id: target };
      if (domain === "cover") this._hass.callService("cover", closing ? "close_cover" : "open_cover", data);
      else if (domain === "button" || domain === "input_button") this._hass.callService(domain, "press", data);
      else if (domain === "switch" || domain === "script") this._hass.callService(domain, "turn_on", data);
      else if (domain === "input_boolean") this._hass.callService("input_boolean", "toggle", data);
    });
    wrap.appendChild(dlg);
  }

  // klik = przełącz (światło), przytrzymanie / klik w temperaturę = szczegóły encji
  _bindPress(el, entityId, infoOnly = false) {
    let timer = null;
    let held = false;
    const moreInfo = () => this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId }, bubbles: true, composed: true,
    }));
    el.addEventListener("pointerdown", () => {
      held = false;
      timer = setTimeout(() => { held = true; moreInfo(); }, 500);
    });
    const cancel = () => { if (timer) clearTimeout(timer); timer = null; };
    el.addEventListener("pointerleave", cancel);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      cancel();
      if (held) return;
      if (infoOnly) { moreInfo(); return; }
      if (this._hass) this._hass.callService("homeassistant", "toggle", { entity_id: entityId });
    });
  }

  set hass(hass) {
    this._hass = hass;
    if (this._card) this._card.hass = hass;
    this._updateLayers();
    this._refresh(); // np. zachód słońca -> motyw nocny
  }

  // Widok „Sekcje”: karta zajmuje całą szerokość.
  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  getLayoutOptions() {
    return { grid_columns: "full" };
  }

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {};
  }
}

if (!customElements.get("ha-floor-plan-card")) customElements.define("ha-floor-plan-card", HaFloorPlanCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "ha-floor-plan-card")) window.customCards.push({
  type: "ha-floor-plan-card",
  name: "Floor Plan Card (mapa domu)",
  description: "Plan domu z podświetlanymi pokojami, bramą i drzwiami. Motywy pór roku i dnia/nocy.",
});

console.info(`%c HA-FLOOR-PLAN-CARD %c ${CARD_VERSION} `, "background:#333;color:#fff", "background:#fc0;color:#000");
