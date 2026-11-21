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
 */

const CARD_VERSION = "1.0.1";

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
const DEFAULT_COVERS = {
  drzwi2: "binary_sensor.czujnik_drzwi_glowne_contact",
};

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
  const base = (config.base_path || "/hacsfiles/ha-floor-plan-card").replace(/\/$/, "");
  const img = (n) => `${base}/${n}.png`;
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
        style: OVERLAY_STYLE,
      });
      controls.push({
        type: "state-icon",
        entity: room.light,
        title: `${room.name || def.name} - światło`,
        icon: room.icon || "mdi:lightbulb",
        state_color: true,
        tap_action: { action: "toggle" },
        hold_action: { action: "more-info" },
        style: {
          left: `${left}%`, top: `${top}%`,
          background: "rgba(0,0,0,0.45)", "border-radius": "50%", padding: "6px",
          "--mdc-icon-size": "28px",
        },
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

class HaFloorPlanCard extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error("Brak konfiguracji");
    this._config = config;
    this._card = null;
    this._build();
  }

  async _build() {
    const helpers = await window.loadCardHelpers();
    const card = helpers.createCardElement(buildPictureElements(this._config));
    if (this._hass) card.hass = this._hass;
    this.innerHTML = "";
    this.appendChild(card);
    this._card = card;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._card) this._card.hass = hass;
  }

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {};
  }
}

customElements.define("ha-floor-plan-card", HaFloorPlanCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-floor-plan-card",
  name: "Floor Plan Card (mapa domu)",
  description: "Plan domu z podświetlanymi pokojami, bramą i drzwiami.",
});

console.info(`%c HA-FLOOR-PLAN-CARD %c ${CARD_VERSION} `, "background:#333;color:#fff", "background:#fc0;color:#000");
