// ═══════════════════════════════════════════════════════════════════
// Home Assistant Timetable Card
// Author: KingDando8430
// https://github.com/KingDando8430/HA-Timetable-Card
// Version: 1.5.0
// ═══════════════════════════════════════════════════════════════════

const TC_VERSION = '1.5.0';

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'timetable-card',
  name: 'Timetable Card',
  description: 'Weekly timetable view for calendar entities',
  preview: true,
  documentationURL: 'https://github.com/KingDando8430/HA-Timetable-Card',
  getEntitySuggestion: (hass, entityId) => {
    if (entityId.split('.')[0] !== 'calendar') return null;
    const base = { config: { type: 'custom:timetable-card', entities: [{ id: entityId }] } };
    const meta = hass?.entities?.[entityId];
    if (meta?.platform !== 'webuntis' || !meta.device_id) return base;
    return [
      base,
      { label: 'WebUntis', config: { type: 'custom:timetable-card', entities: [{ id: entityId, device_id: meta.device_id }] } },
    ];
  },
});

// ─── Translation loader ───────────────────────────────────────────
const TC_STRINGS_CACHE = {};
const TC_STRINGS_FALLBACK = 'en';

const TC_SAFE_DEFAULTS = {
  days: [
    { short: 'Mo' }, { short: 'Tu' }, { short: 'We' }, { short: 'Th' },
    { short: 'Fr' }, { short: 'Sa' }, { short: 'Su' },
  ],
  days_long: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  card_title: 'Timetable',
  week_prefix: 'Wk',
  prev_week: 'Previous week',
  next_week: 'Next week',
  today_btn: 'Today',
  refresh: 'Refresh',
  all_day: 'All day',
  no_title: 'No title',
  state_no_entity: 'No calendar configured.',
  state_no_entity_hint: 'Edit the card to select a calendar.',
  state_loading: 'Loading calendar…',
  state_no_events: 'No events this week',
  cf_btn_title: 'Filter calendars',
  cf_title: 'Calendars',
  cf_done: 'Done',
};

async function tcLoadStrings(lang) {
  if (TC_STRINGS_CACHE[lang]) return TC_STRINGS_CACHE[lang];
  const base = new URL(import.meta.url).pathname.replace(/\/[^/]+$/, '');
  try {
    const res = await fetch(`${base}/translations/${lang}.json?v=${TC_VERSION}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    TC_STRINGS_CACHE[lang] = await res.json();
    return TC_STRINGS_CACHE[lang];
  } catch {
    if (lang !== TC_STRINGS_FALLBACK) return tcLoadStrings(TC_STRINGS_FALLBACK);
    return null;
  }
}

function tcS(hass) {
  const lang   = hass?.locale?.language || hass?.language || TC_STRINGS_FALLBACK;
  const loaded = TC_STRINGS_CACHE[lang] || TC_STRINGS_CACHE[TC_STRINGS_FALLBACK];
  return loaded ? { ...TC_SAFE_DEFAULTS, ...loaded } : TC_SAFE_DEFAULTS;
}

// ─── Constants ──────────────────────────────────────────────────────
const TC_DAY_KEYS   = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const TC_DAY_TOKENS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const TC_WEBUNTIS_HORIZON_WEEKS = 12;

const TIME_W     = 50;
const PADDING_TOP = 12;
const PADDING_BOT = 20;

const TC_DEFAULT = {
  entities: [],
  time_position: 'left',
  show_location: true,
  show_notes: true,
  time_interval: 'event_based',
  px_per_min: 1.4,
  keywords: [],
  refresh_interval: 'auto',
  title: '',
  weekdays: [...TC_DAY_TOKENS],
  dynamic_start: 'today',
  dynamic_count: 1,
  first_day_only: false,
  last_day_only: false,
  show_description_indicator: false,
  auto_switch_week: false,
  show_calendar: true,
  show_now_line: true,
  show_create_event_button: false,
  show_calendar_filter: false,
  time_range: null,
  show_out_of_range_hint: false,
  fontsize: [],
};

const TC_FONT_KEYS     = ['title', 'timestamps', 'event_title', 'event_description', 'event_location'];
const TC_FONT_DEFAULTS = { title: 14.5, timestamps: 8.5, event_title: 11, event_description: 9, event_location: 9.5 };
const TC_FONT_MIN = 6;
const TC_FONT_MAX = 32;
const TC_RANGE_DEFAULT = { start: '08:00', end: '16:00' };

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function tcEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// Returns the colour unchanged if it is a plain CSS colour (hex, rgb/hsl, var(--x), named), else null.
// Every configured colour goes through this before it reaches a style attribute or <style> block.
function tcSafeColor(c) {
  if (typeof c !== 'string') return null;
  const v = c.trim();
  if (!v || v.length > 64) return null;
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
  if (/^(?:rgb|hsl)a?\(\s*[0-9.]+%?(?:\s*[, ]\s*[0-9.]+%?){2}(?:\s*[,/]\s*[0-9.]+%?)?\s*\)$/i.test(v)) return v;
  if (/^var\(--[a-z0-9_-]+\)$/i.test(v)) return v;
  if (/^[a-z]{3,24}$/i.test(v)) return v;
  return null;
}
// Hex value for <input type="color"> (needs #rrggbb), else the fallback.
function tcPickerColor(c, fallback) {
  const v = tcSafeColor(c);
  if (v && /^#[0-9a-f]{6}$/i.test(v)) return v;
  if (v && /^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(x => x + x).join('');
  return fallback;
}
function tcRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#','');
  if (!/^[0-9a-f]+$/i.test(h)) return null;
  const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  if (f.length !== 6) return null;
  return { r:parseInt(f.slice(0,2),16), g:parseInt(f.slice(2,4),16), b:parseInt(f.slice(4,6),16) };
}
function tcNormalizeEntities(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(e => typeof e === 'string' ? { id: e, color: null } : e);
}
// Accepts either a legacy numeric weekday (0-6, Mon-Sun) or a new 'Mon'..'Sun' token
// and returns the 0-6 index, or null if unrecognised.
function tcDayIdx(v) {
  if (typeof v === 'number') return (v >= 0 && v <= 6) ? v : null;
  const i = TC_DAY_TOKENS.indexOf(v);
  return i >= 0 ? i : null;
}
// Normalises a weekdays array (either format, or missing) to a sorted array of 0-6 indices.
function tcNormWeekdays(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const out = arr.map(tcDayIdx).filter(v => v !== null);
  return out.length ? out : null;
}
// True if the array contains any legacy numeric entries that still need migrating.
function tcNeedsWeekdayMigration(arr) {
  return Array.isArray(arr) && arr.some(v => typeof v === 'number');
}
// Converts a legacy numeric weekdays array to the new 'Mon'..'Sun' token array, preserving order.
function tcMigrateWeekdays(arr) {
  return arr.map(v => (typeof v === 'number' ? (TC_DAY_TOKENS[v] || v) : v));
}
// All-day chip colours: tinted background + coloured text, always built from a sanitised colour.
function tcChipStyle(col) {
  const safe = tcSafeColor(col);
  if (!safe) return '';
  const rgb = tcRgb(safe);
  return rgb
    ? `background:rgba(${rgb.r},${rgb.g},${rgb.b},.133);color:${safe}`
    : `background:color-mix(in srgb,${safe} 13%,transparent);color:${safe}`;
}
// `keyword` may be a string or (yaml) a list of strings. Returns the non-empty entries.
function tcKwList(kw) {
  const raw = kw ? kw.keyword : null;
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter(v => v !== null && v !== undefined && typeof v !== 'object')
    .map(v => String(v))
    .filter(v => v.length > 0);
}
function tcKwDisplay(kw) {
  const raw = kw ? kw.keyword : '';
  if (Array.isArray(raw)) return raw.join(', ');
  return raw === null || raw === undefined ? '' : String(raw);
}
// `fontsize` is a list of single-key items (or a plain map). Returns a full size table in px.
function tcFontSizes(raw) {
  const out = { ...TC_FONT_DEFAULTS };
  const apply = (k, v) => {
    if (!TC_FONT_KEYS.includes(k)) return;
    const n = parseFloat(v);
    if (Number.isFinite(n) && n >= TC_FONT_MIN && n <= TC_FONT_MAX) out[k] = n;
  };
  if (Array.isArray(raw)) {
    raw.forEach(item => {
      if (item && typeof item === 'object' && !Array.isArray(item)) Object.entries(item).forEach(([k, v]) => apply(k, v));
    });
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([k, v]) => apply(k, v));
  }
  return out;
}
// Inverse of tcFontSizes: only values that differ from the default are written.
function tcFontConfig(sizes) {
  return TC_FONT_KEYS.filter(k => sizes[k] !== TC_FONT_DEFAULTS[k]).map(k => ({ [k]: sizes[k] }));
}
// 'HH:MM' -> minutes since midnight (0-1440), or null.
function tcParseHM(v) {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  if (mi > 59 || h > 24) return null;
  const total = h * 60 + mi;
  return total <= 1440 ? total : null;
}
function tcFmtHM(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
// Returns { start, end } in minutes for a valid custom time window, else null (= auto).
function tcTimeRange(cfg) {
  const r = cfg && cfg.time_range;
  if (!r || typeof r !== 'object') return null;
  const s = tcParseHM(r.start), e = tcParseHM(r.end);
  return (s !== null && e !== null && e > s) ? { start: s, end: e } : null;
}

// ═══════════════════════════════════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════════════════════════════════
class TimetableCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = { ...TC_DEFAULT };
    this._hass = null;
    this._pickerEl = null;
    this._rendered = false;
    this._lang = null;
    this._editorPage = 'main';
    this._editorKwIndex = null;
    this._editorEntIndex = null;
    this._kwRenameForceOpen = {};
    this._wdModeForce = null; // null | 'fixed' | 'dynamic' — UI-only override, never written to yaml
  }

  setConfig(config) {
    if (config.entity && !config.entities) config = { ...config, entities: [config.entity] };
    this._config = { ...TC_DEFAULT, ...config };
    this._render();
  }

  set hass(h) {
    const prevLang = this._lang;
    this._hass = h;
    if (this._pickerEl) this._pickerEl.hass = h;
    const lang = h?.locale?.language || h?.language || TC_STRINGS_FALLBACK;
    this._lang = lang;
    if (!this._rendered || lang !== prevLang) tcLoadStrings(lang).then(() => this._render());
  }

  _dispatch(cfg) {
    if (tcNeedsWeekdayMigration(cfg.weekdays)) {
      cfg = { ...cfg, weekdays: tcMigrateWeekdays(cfg.weekdays) };
    }
    this._config = cfg;
    const minimal = this._minimizeConfig(cfg);
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: minimal }, bubbles: true, composed: true }));
  }

  _minimizeConfig(cfg) {
    const out = {};
    for (const k of Object.keys(cfg)) {
      if (k === 'entities') {
        const ents = (cfg.entities || []).map(e => this._minimizeEntity(e));
        if (ents.length) out.entities = ents;
        continue;
      }
      if (k === 'keywords') {
        const kws = (cfg.keywords || []).map(kw => this._minimizeKeyword(kw));
        if (kws.length) out.keywords = kws;
        continue;
      }
      if (!(k in TC_DEFAULT)) { out[k] = cfg[k]; continue; } // e.g. 'type' — always kept
      const def  = TC_DEFAULT[k];
      const same = Array.isArray(def) ? JSON.stringify(cfg[k]) === JSON.stringify(def) : cfg[k] === def;
      if (!same) out[k] = cfg[k];
    }
    return out;
  }

  _minimizeEntity(e) {
    const out = { id: e.id };
    if (e.color) out.color = e.color;
    if (e.device_id) {
      out.device_id = e.device_id;
      if (e.subject_display && e.subject_display !== 'short') out.subject_display = e.subject_display;
      if (e.teacher_display && e.teacher_display !== 'short') out.teacher_display = e.teacher_display;
      if (e.room_display && e.room_display !== 'short') out.room_display = e.room_display;
    }
    return out;
  }

  _minimizeKeyword(kw) {
    const def = { keyword:'', color:null, exact_match:true, color_mode:'border', hidden:false, rename:'',
      partial_rename_enabled:false, partial_rename_mode:'keyword', partial_rename_text:'', match_mode:'keyword', presence:'has' };
    const out = {};
    for (const k of Object.keys(kw)) {
      if (k === 'match_source') { if (kw[k]) out[k] = kw[k]; continue; } // explicit source always kept — differs semantically from "unset"
      if (kw[k] !== def[k]) out[k] = kw[k];
    }
    return out;
  }
  _set(k, v) {
    this._dispatch({ ...this._config, [k]: v });
    if (k === 'keywords') this._renderKwList();
    if (k === 'entities') { this._renderEntityList(); this._syncCalFilterRow(); }
  }

  // ── Entities ────────────────────────────────────────────────────
  _getEntities() { return tcNormalizeEntities(this._config.entities || []); }

  _addEntity(id) {
    if (!id) return;
    const ents = this._getEntities();
    if (ents.find(e => e.id === id)) return;
    const entry = { id, color: null };
    const meta = this._hass?.entities?.[id];
    if (meta?.platform === 'webuntis' && meta.device_id) {
      entry.device_id = meta.device_id;
      entry.subject_display = 'short';
      entry.teacher_display = 'short';
      entry.room_display = 'short';
    }
    this._set('entities', [...ents, entry]);
    if (this._pickerEl) this._pickerEl.value = '';
  }

  _removeEntity(id) {
    this._set('entities', this._getEntities().filter(e => e.id !== id));
  }

  _setEntityColor(id, color) {
    this._set('entities', this._getEntities().map(e => e.id === id ? { ...e, color: color || null } : e));
  }

  // ── WebUntis devices ────────────────────────────────────────────
  _webuntisDeviceName(e) {
    const dev = this._hass?.devices?.[e.device_id];
    return dev?.name_by_user || dev?.name || e.id;
  }

  _renderEntityList() {
    const el = this.shadowRoot.getElementById('entity-list');
    if (!el) return;
    const t    = tcS(this._hass);
    const ents = [...this._getEntities()].sort((a, b) => (a.device_id?1:0) - (b.device_id?1:0));
    el.innerHTML = ents.length
      ? ents.map(e => {
          if (e.device_id) {
            const name = tcEsc(this._webuntisDeviceName(e));
            return `
            <div class="ent-row" data-id="${tcEsc(e.id)}">
              <ha-icon class="ent-icon" icon="mdi:alpha-u-box"></ha-icon>
              <span class="ent-id">${tcEsc(t.wu_label_prefix)}: ${name}</span>
              <div class="swatch${e.color?'':' no-col'}" style="background:${tcEsc(tcSafeColor(e.color)||'transparent')}" title="${t.ent_color_title}">
                <input type="color" class="cpick ent-cpick" value="${tcPickerColor(e.color,'#03a9f4')}" data-id="${tcEsc(e.id)}" />
              </div>
              <button class="rm-btn ent-rm" data-id="${tcEsc(e.id)}" title="${t.ent_remove_title}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <button class="kw-adv-btn ent-adv-btn" data-id="${tcEsc(e.id)}">
              <span>${t.adv_config_btn}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </button>`;
          }
          const meta = this._hass?.entities?.[e.id];
          const icon = meta?.icon || this._hass?.states?.[e.id]?.attributes?.icon || 'mdi:calendar';
          return `
          <div class="ent-row" data-id="${tcEsc(e.id)}">
            <ha-icon class="ent-icon" icon="${tcEsc(icon)}"></ha-icon>
            <span class="ent-id">${tcEsc(e.id)}</span>
            <div class="swatch${e.color?'':' no-col'}" style="background:${tcEsc(tcSafeColor(e.color)||'transparent')}" title="${t.ent_color_title}">
              <input type="color" class="cpick ent-cpick" value="${tcPickerColor(e.color,'#03a9f4')}" data-id="${tcEsc(e.id)}" />
            </div>
            <button class="rm-btn ent-rm" data-id="${tcEsc(e.id)}" title="${t.ent_remove_title}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>`;
        }).join('')
      : `<p class="hint">${t.ent_hint}</p>`;

    el.querySelectorAll('.ent-rm').forEach(b => b.addEventListener('click', () => this._removeEntity(b.dataset.id)));
    el.querySelectorAll('.ent-cpick').forEach(inp => {
      inp.addEventListener('change', ev => {
        const v = ev.target.value;
        this._setEntityColor(inp.dataset.id, v);
        inp.parentElement.style.background = v;
        inp.parentElement.classList.remove('no-col');
      });
    });
    el.querySelectorAll('.ent-adv-btn').forEach(b => {
      b.addEventListener('click', () => {
        this._editorEntIndex = this._getEntities().findIndex(e => e.id === b.dataset.id);
        this._editorPage = 'wu-advanced';
        this._render();
      });
    });

    if (this._pickerEl) this._pickerEl.excludeEntities = this._getEntities().map(e => e.id);
  }

  // ── WebUntis advanced page ─────────────────────────────────────────
  _renderWuAdvancedPage(i) {
    const t   = tcS(this._hass);
    const ent = (this._config.entities || [])[i];
    if (!ent || !ent.device_id) { this._editorPage = 'main'; this._render(); return; }
    const subj = ent.subject_display === 'long' ? 'long' : 'short';
    const room  = ['long', 'hide'].includes(ent.room_display) ? ent.room_display : 'short';
    const teach = ['long', 'hide'].includes(ent.teacher_display) ? ent.teacher_display : 'short';
    const name = tcEsc(this._webuntisDeviceName(ent));

    this.shadowRoot.innerHTML = `
<style>${this._editorCss()}</style>
<div class="nav-hdr">
  <button class="nav-back" id="wu-back" title="${t.nav_back}">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
  </button>
  <div class="nav-hdr-txt">
    <div class="nav-hdr-title">${t.adv_config_btn}</div>
    <div class="nav-hdr-sub">${tcEsc(t.wu_label_prefix)}: ${name}</div>
  </div>
</div>

<span class="sec">${t.sec_wu_lesson}</span>
<div class="box">
  <div class="row wrap">
    <div><div class="rl">${t.wu_subject_title}</div><div class="rs">${t.wu_subject_sub}</div></div>
    <div class="seg">
      <button class="seg-o${subj==='short'?' on':''}" data-f="subject_display" data-v="short">${t.wu_short}</button>
      <button class="seg-o${subj==='long'?' on':''}" data-f="subject_display" data-v="long">${t.wu_long}</button>
    </div>
  </div>
  <div class="row wrap">
    <div><div class="rl">${t.wu_teacher_title}</div><div class="rs">${t.wu_teacher_sub}</div></div>
    <div class="seg seg3">
      <button class="seg-o${teach==='short'?' on':''}" data-f="teacher_display" data-v="short">${t.wu_short}</button>
      <button class="seg-o${teach==='long'?' on':''}" data-f="teacher_display" data-v="long">${t.wu_long}</button>
      <button class="seg-o${teach==='hide'?' on':''}" data-f="teacher_display" data-v="hide">${t.wu_hide}</button>
    </div>
  </div>
  <div class="row wrap">
    <div><div class="rl">${t.wu_room_title}</div><div class="rs">${t.wu_room_sub}</div></div>
    <div class="seg seg3">
      <button class="seg-o${room==='short'?' on':''}" data-f="room_display" data-v="short">${t.wu_short}</button>
      <button class="seg-o${room==='long'?' on':''}" data-f="room_display" data-v="long">${t.wu_long}</button>
      <button class="seg-o${room==='hide'?' on':''}" data-f="room_display" data-v="hide">${t.wu_hide}</button>
    </div>
  </div>
</div>`;

    const s = this.shadowRoot;
    s.getElementById('wu-back').addEventListener('click', () => { this._editorPage = 'main'; this._render(); });
    s.querySelectorAll('[data-f]').forEach(b => {
      b.addEventListener('click', () => {
        const ents = [...(this._config.entities || [])];
        ents[i] = { ...ents[i], [b.dataset.f]: b.dataset.v };
        this._dispatch({ ...this._config, entities: ents });
        this._renderWuAdvancedPage(i);
      });
    });
  }

  // ── Keywords ────────────────────────────────────────────────────
  _addKw() {
    this._set('keywords', [...(this._config.keywords || []), {
      keyword: '', color: null, exact_match: true,
      color_mode: 'block', hidden: false, rename: '',
      partial_rename_enabled: false, partial_rename_mode: 'keyword', partial_rename_text: '',
      match_source: 'summary', match_mode: 'keyword', presence: 'has'
    }]);
  }
  _rmKw(i)      { const a = [...(this._config.keywords||[])]; a.splice(i,1); this._kwRenameForceOpen = {}; this._set('keywords', a); }
  _setKw(i,k,v) { const a = [...(this._config.keywords||[])]; a[i] = { ...a[i], [k]: v }; this._set('keywords', a); }
  _patchKwAdv(i, patch) {
    const a = [...(this._config.keywords||[])];
    a[i] = { ...a[i], ...patch };
    this._dispatch({ ...this._config, keywords: a });
    this._renderKwAdvancedPage(i);
  }

  _renderKwList() {
    const el = this.shadowRoot.getElementById('kw-list');
    if (!el) return;
    const t   = tcS(this._hass);
    const kws = this._config.keywords || [];
    if (!kws.length) {
      el.innerHTML = `<p class="hint">${t.kw_hint}</p>`;
      return;
    }
    el.innerHTML = kws.map((kw, i) => {
      const isPresence = kw.match_mode === 'presence' && (kw.match_source === 'description' || kw.match_source === 'location');
      let roLabel = '';
      if (isPresence) {
        const srcLbl  = kw.match_source === 'location' ? t.kw_src_location : t.kw_src_description;
        const presLbl = kw.presence !== 'none' ? t.kw_presence_has : t.kw_presence_none;
        roLabel = `${srcLbl}: ${presLbl}`;
      }
      return `
      <div class="kw-card">
        <div class="kw-r1">
          ${isPresence
            ? `<input class="kw-in kw-in-ro" value="${tcEsc(roLabel)}" disabled />`
            : `<input class="kw-in" placeholder="${t.kw_placeholder}" value="${tcEsc(tcKwDisplay(kw))}" data-i="${i}" />`}
          <button class="rm-btn kw-rm" data-i="${i}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
        <div class="kw-r2">
          <div class="swatch${kw.color?'':' no-col'}" style="background:${tcEsc(tcSafeColor(kw.color)||'transparent')}">
            <input type="color" class="cpick kw-cpick" value="${tcPickerColor(kw.color,'#4CAF50')}" data-i="${i}" />
          </div>
          <div class="kw-seg">
            <button class="seg-sm${(kw.color_mode||'block')==='block'?' on':''}" data-i="${i}" data-v="block">${t.kw_block}</button>
            <button class="seg-sm${kw.color_mode==='border'?' on':''}" data-i="${i}" data-v="border">${t.kw_border}</button>
          </div>
        </div>
        <button class="kw-adv-btn" data-i="${i}">
          <span>${t.adv_config_btn}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>`;
    }).join('');

    el.querySelectorAll('.kw-in:not(.kw-in-ro)').forEach(e => {
      e.addEventListener('change', ev => {
        const i   = +e.dataset.i;
        const cur = (this._config.keywords || [])[i];
        if (cur && Array.isArray(cur.keyword)) {
          // yaml list: untouched text keeps the list, edited text is split on commas
          const val = ev.target.value;
          if (val === tcKwDisplay(cur)) return;
          const parts = val.split(',').map(x => x.trim()).filter(Boolean);
          this._setKw(i, 'keyword', parts.length > 1 ? parts : (parts[0] || ''));
          return;
        }
        this._setKw(i, 'keyword', ev.target.value);
      });
    });
    el.querySelectorAll('.kw-cpick').forEach(e => {
      e.addEventListener('change', ev => {
        const v = ev.target.value;
        this._setKw(+e.dataset.i, 'color', v);
        e.parentElement.style.background = v;
        e.parentElement.classList.remove('no-col');
      });
    });
    el.querySelectorAll('.seg-sm[data-v]').forEach(b => {
      b.addEventListener('click', () => this._setKw(+b.dataset.i, 'color_mode', b.dataset.v));
    });
    el.querySelectorAll('.kw-rm').forEach(e => {
      e.addEventListener('click', () => this._rmKw(+e.dataset.i));
    });
    el.querySelectorAll('.kw-adv-btn').forEach(b => {
      b.addEventListener('click', () => {
        this._editorKwIndex = +b.dataset.i;
        this._editorPage = 'kw-advanced';
        this._render();
      });
    });

    if (this._pickerEl) this._pickerEl.excludeEntities = this._getEntities().map(e => e.id);
  }

  // ── Keyword advanced page ──────────────────────────────────────────
  _renderKwAdvancedPage(i) {
    const t  = tcS(this._hass);
    const kw = (this._config.keywords || [])[i];
    if (!kw) { this._editorPage = 'main'; this._render(); return; }

    const source        = kw.match_source || 'summary';
    const presenceReady = source === 'description' || source === 'location';
    const isPresence    = presenceReady && kw.match_mode === 'presence';
    const presence      = kw.presence !== 'none' ? 'has' : 'none';
    const renameOn      = !!(kw.rename && kw.rename.trim()) || this._kwRenameForceOpen[i] === true;
    const partialOn     = kw.partial_rename_enabled === true;
    const partMode      = kw.partial_rename_mode || 'keyword';

    this.shadowRoot.innerHTML = `
<style>${this._editorCss()}</style>
<div class="nav-hdr">
  <button class="nav-back" id="kw-back" title="${t.nav_back}">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
  </button>
  <div class="nav-hdr-txt">
    <div class="nav-hdr-title">${t.adv_config_btn}</div>
    <div class="nav-hdr-sub">${tcEsc(tcKwDisplay(kw) || t.kw_placeholder)}</div>
  </div>
</div>

<span class="sec">${t.sec_kw_rules}</span>
<div class="box">
  <div class="row">
    <div><div class="rl">${t.kw_source_title}</div><div class="rs">${t.kw_source_sub}</div></div>
    <div class="seg">
      <button class="seg-o${source==='summary'?' on':''}" data-src="summary">${t.kw_src_summary}</button>
      <button class="seg-o${source==='description'?' on':''}" data-src="description">${t.kw_src_description}</button>
      <button class="seg-o${source==='location'?' on':''}" data-src="location">${t.kw_src_location}</button>
    </div>
  </div>
  ${presenceReady ? `
  <div class="row">
    <div><div class="rl">${t.kw_presence_title}</div><div class="rs">${t.kw_presence_sub}</div></div>
    <ha-switch id="kw-presence-sw" ${isPresence?'checked':''}></ha-switch>
  </div>` : ''}
  ${isPresence ? `
  <div class="row sub">
    <div class="seg">
      <button class="seg-o${presence==='has'?' on':''}" data-pres="has">${t.kw_presence_has}</button>
      <button class="seg-o${presence==='none'?' on':''}" data-pres="none">${t.kw_presence_none}</button>
    </div>
  </div>` : ''}
  ${!isPresence ? `
  <div class="row">
    <div><div class="rl">${t.kw_exact}</div><div class="rs">${t.kw_exact_sub}</div></div>
    <ha-switch id="kw-exact-sw" ${kw.exact_match!==false?'checked':''}></ha-switch>
  </div>` : ''}
</div>

<span class="sec">${t.sec_kw_appearance}</span>
<div class="box">
  <div class="row">
    <div><div class="rl">${t.kw_rename_btn}</div><div class="rs">${t.kw_rename_sub}</div></div>
    <ha-switch id="kw-rename-sw" ${renameOn?'checked':''}></ha-switch>
  </div>
  ${renameOn ? `
  <div class="row">
    <div><div class="rl">${t.kw_partial_btn}</div><div class="rs">${t.kw_partial_sub}</div></div>
    <ha-switch id="kw-partial-sw" ${partialOn?'checked':''}></ha-switch>
  </div>
  ${partialOn ? `
  <div class="row sub">
    <div class="seg">
      <button class="seg-o${partMode==='keyword'?' on':''}" data-pmode="keyword">${t.kw_partial_kw}</button>
      <button class="seg-o${partMode==='text'?' on':''}" data-pmode="text">${t.kw_partial_text}</button>
    </div>
  </div>
  ${partMode==='text' ? `
  <div class="row">
    <div class="rl">${t.kw_partial_text}</div>
    <input class="txt-in" id="kw-partial-text" placeholder="${t.kw_partial_ph}" value="${tcEsc(kw.partial_rename_text||'')}" />
  </div>` : ''}` : ''}
  <div class="row">
    <div class="rl">${t.kw_rename_label}</div>
    <input class="txt-in" id="kw-rename-to" placeholder="${t.kw_rename_ph}" value="${tcEsc(kw.rename||'')}" />
  </div>` : ''}
  <div class="row">
    <div><div class="rl">${t.kw_hide}</div><div class="rs">${t.kw_hide_sub}</div></div>
    <ha-switch id="kw-hide-sw" ${kw.hidden?'checked':''}></ha-switch>
  </div>
</div>`;

    this._bindKwAdvancedPage(i);
  }

  _bindKwAdvancedPage(i) {
    const s = this.shadowRoot;
    s.getElementById('kw-back').addEventListener('click', () => {
      this._editorPage = 'main';
      this._render();
    });
    s.querySelectorAll('[data-src]').forEach(b => {
      b.addEventListener('click', () => {
        const patch = { match_source: b.dataset.src };
        if (b.dataset.src === 'summary') patch.match_mode = 'keyword';
        this._patchKwAdv(i, patch);
      });
    });
    s.getElementById('kw-presence-sw')?.addEventListener('change', e => {
      this._patchKwAdv(i, { match_mode: e.target.checked ? 'presence' : 'keyword' });
    });
    s.querySelectorAll('[data-pres]').forEach(b => {
      b.addEventListener('click', () => this._patchKwAdv(i, { presence: b.dataset.pres }));
    });
    s.getElementById('kw-exact-sw')?.addEventListener('change', e => this._setKw(i, 'exact_match', e.target.checked));
    s.getElementById('kw-rename-sw')?.addEventListener('change', e => {
      if (e.target.checked) {
        this._kwRenameForceOpen[i] = true;
        this._renderKwAdvancedPage(i);
      } else {
        this._kwRenameForceOpen[i] = false;
        this._patchKwAdv(i, { rename: '', partial_rename_enabled: false, partial_rename_text: '' });
      }
    });
    s.getElementById('kw-partial-sw')?.addEventListener('change', e => this._patchKwAdv(i, { partial_rename_enabled: e.target.checked }));
    s.querySelectorAll('[data-pmode]').forEach(b => {
      b.addEventListener('click', () => this._patchKwAdv(i, { partial_rename_mode: b.dataset.pmode }));
    });
    s.getElementById('kw-partial-text')?.addEventListener('change', e => this._setKw(i, 'partial_rename_text', e.target.value));
    s.getElementById('kw-rename-to')?.addEventListener('change', e => this._setKw(i, 'rename', e.target.value));
    s.getElementById('kw-hide-sw')?.addEventListener('change', e => this._setKw(i, 'hidden', e.target.checked));
  }

  // ── Weekdays (Fixed / Dynamic) ──────────────────────────────────
  _wdMode() {
    const c = this._config;
    const hasDynamic = c.dynamic_start !== TC_DEFAULT.dynamic_start || c.dynamic_count !== TC_DEFAULT.dynamic_count;
    return this._wdModeForce || (hasDynamic ? 'dynamic' : 'fixed');
  }

  _renderWeekdaysBlock() {
    const el = this.shadowRoot.getElementById('wd-block');
    if (!el) return;
    const t    = tcS(this._hass);
    const c    = this._config;
    const mode = this._wdMode();
    const dynStart = c.dynamic_start === 'tomorrow' ? 'tomorrow' : 'today';
    const dynCount = Math.max(1, parseInt(c.dynamic_count) || 1);

    el.innerHTML = `
      <div style="padding:9px 15px 2px"><div class="rl">${t.disp_weekdays}</div></div>
      <div class="seg seg-wide" id="wd-mode-seg" style="margin:8px 15px 10px">
        <button class="seg-o${mode==='fixed'?' on':''}" data-wdmode="fixed">${t.wd_fixed}</button>
        <button class="seg-o${mode==='dynamic'?' on':''}" data-wdmode="dynamic">${t.wd_dynamic}</button>
      </div>
      ${mode === 'fixed' ? `<div id="wd-row"></div>` : `
      <div class="wd-dyn">
        <div class="wd-dyn-row">
          <div class="rl">${t.wd_dyn_start}</div>
          <div class="seg">
            <button class="seg-o${dynStart==='today'?' on':''}" data-dynf="today">${t.wd_dyn_today}</button>
            <button class="seg-o${dynStart==='tomorrow'?' on':''}" data-dynf="tomorrow">${t.wd_dyn_tomorrow}</button>
          </div>
        </div>
        <div class="wd-dyn-row">
          <div><div class="rl">${t.wd_dyn_count}</div><div class="rs">${t.wd_dyn_count_sub}</div></div>
          <input type="number" class="num-in" id="wd-dyn-count" min="1" max="14" value="${dynCount}" />
        </div>
      </div>`}
      <div class="row" id="wd-auto-row">
        <div><div class="rl">${t.disp_auto_week}</div><div class="rs">${t.disp_auto_week_sub}</div></div>
        <ha-switch id="sw-auto-week" ${c.auto_switch_week===true?'checked':''}></ha-switch>
      </div>`;

    el.querySelectorAll('[data-wdmode]').forEach(b => {
      b.addEventListener('click', () => {
        if (this._wdMode() === b.dataset.wdmode) return;
        this._wdModeForce = b.dataset.wdmode;
        this._renderWeekdaysBlock();
      });
    });
    el.querySelector('#sw-auto-week').addEventListener('change', e => this._set('auto_switch_week', e.target.checked));

    if (mode === 'fixed') {
      this._renderWeekdayPills();
    } else {
      el.querySelectorAll('[data-dynf]').forEach(b => {
        b.addEventListener('click', () => {
          this._wdModeForce = 'dynamic';
          this._dispatch({ ...this._config, dynamic_start: b.dataset.dynf, weekdays: [...TC_DEFAULT.weekdays] });
          this._renderWeekdaysBlock();
        });
      });
      el.querySelector('#wd-dyn-count').addEventListener('change', e => {
        const v = Math.min(14, Math.max(1, parseInt(e.target.value) || 1));
        this._wdModeForce = 'dynamic';
        this._dispatch({ ...this._config, dynamic_count: v, weekdays: [...TC_DEFAULT.weekdays] });
        this._renderWeekdaysBlock();
      });
    }
  }

  _renderWeekdayPills() {
    const el = this.shadowRoot.getElementById('wd-row');
    if (!el) return;
    const t      = tcS(this._hass);
    const active = tcNormWeekdays(this._config.weekdays) || [0,1,2,3,4,5,6];
    el.innerHTML = t.days.map((d, i) =>
      `<button class="wd-pill${active.includes(i)?' on':''}" data-i="${i}">${d.short}</button>`
    ).join('');
    el.querySelectorAll('.wd-pill').forEach(b => {
      b.addEventListener('click', () => {
        let wd = [...(tcNormWeekdays(this._config.weekdays) || [0,1,2,3,4,5,6])];
        const i = +b.dataset.i;
        if (wd.includes(i)) { if (wd.length > 1) wd = wd.filter(x => x !== i); }
        else wd = [...wd, i].sort((a, b) => a - b);
        this._wdModeForce = 'fixed';
        this._dispatch({
          ...this._config,
          weekdays: wd.map(idx => TC_DAY_TOKENS[idx]),
          dynamic_start: TC_DEFAULT.dynamic_start,
          dynamic_count: TC_DEFAULT.dynamic_count,
        });
        this._renderWeekdayPills();
      });
    });
  }

  // ── Calendar filter row (disabled with fewer than two calendars) ─
  _syncCalFilterRow() {
    const row = this.shadowRoot.getElementById('cf-row');
    if (!row) return;
    const t   = tcS(this._hass);
    const dis = this._getEntities().length < 2;
    row.classList.toggle('dis', dis);
    const sw = row.querySelector('ha-switch');
    if (sw) {
      if (dis) sw.setAttribute('disabled', ''); else sw.removeAttribute('disabled');
      sw.disabled = dis;
    }
    const sub = row.querySelector('.rs');
    if (sub) sub.textContent = dis ? t.disp_calfilter_need2 : t.disp_calfilter_sub;
  }

  // ── Time window (Auto / Custom) ─────────────────────────────────
  _renderTimeRangeBlock() {
    const el = this.shadowRoot.getElementById('tr-block');
    if (!el) return;
    const t      = tcS(this._hass);
    const c      = this._config;
    const custom = !!(c.time_range && typeof c.time_range === 'object');
    const r      = custom ? c.time_range : {};
    const sMin   = tcParseHM(r.start), eMin = tcParseHM(r.end);
    const sVal   = tcFmtHM(Math.min(sMin ?? tcParseHM(TC_RANGE_DEFAULT.start), 1439));
    const eVal   = tcFmtHM(Math.min(eMin ?? tcParseHM(TC_RANGE_DEFAULT.end), 1439));
    const invalid = sMin !== null && eMin !== null && eMin <= sMin;

    el.innerHTML = `
      <div style="padding:9px 15px 2px"><div class="rl">${t.disp_timerange}</div></div>
      <div class="seg seg-wide" style="margin:8px 15px 10px">
        <button class="seg-o${custom?'':' on'}" data-trmode="auto">${t.tr_auto}</button>
        <button class="seg-o${custom?' on':''}" data-trmode="custom">${t.tr_custom}</button>
      </div>
      ${custom ? `
      <div class="row tr-row">
        <input type="time" class="tm-in" id="tr-start" value="${sVal}" />
        <span class="tr-dash">–</span>
        <input type="time" class="tm-in" id="tr-end" value="${eVal}" />
      </div>
      <div class="tr-err" id="tr-err" ${invalid?'':'hidden'}>${t.tr_invalid}</div>
      <div class="row">
        <div><div class="rl">${t.tr_hint_title}</div><div class="rs">${t.tr_hint_sub}</div></div>
        <ha-switch id="sw-tr-hint" ${c.show_out_of_range_hint===true?'checked':''}></ha-switch>
      </div>` : ''}`;

    el.querySelectorAll('[data-trmode]').forEach(b => {
      b.addEventListener('click', () => {
        const wantCustom = b.dataset.trmode === 'custom';
        if (wantCustom === custom) return;
        this._dispatch(wantCustom
          ? { ...this._config, time_range: { ...TC_RANGE_DEFAULT } }
          : { ...this._config, time_range: null, show_out_of_range_hint: false });
        this._renderTimeRangeBlock();
      });
    });
    const st = el.querySelector('#tr-start'), en = el.querySelector('#tr-end'), err = el.querySelector('#tr-err');
    if (st && en) {
      const onTime = () => {
        const s = tcParseHM(st.value), e = tcParseHM(en.value);
        if (s === null || e === null) return;
        if (e <= s) { err.hidden = false; return; }
        err.hidden = true;
        this._dispatch({ ...this._config, time_range: { start: tcFmtHM(s), end: tcFmtHM(e) } });
      };
      st.addEventListener('change', onTime);
      en.addEventListener('change', onTime);
    }
    el.querySelector('#sw-tr-hint')?.addEventListener('change', e => this._set('show_out_of_range_hint', e.target.checked));
  }

  // ── Font size page ──────────────────────────────────────────────
  _renderFontsizePage() {
    const t     = tcS(this._hass);
    const sizes = tcFontSizes(this._config.fontsize);
    const anyChanged = TC_FONT_KEYS.some(k => sizes[k] !== TC_FONT_DEFAULTS[k]);
    const cardTitle  = (this._config.title && this._config.title.trim()) || t.card_title;

    const rows = TC_FONT_KEYS.map(k => {
      const v = sizes[k], def = TC_FONT_DEFAULTS[k];
      return `
  <div class="row fs-row">
    <div><div class="rl">${t['fs_' + k]}</div><div class="rs">${t.fs_default}: ${def} px</div></div>
    <button class="fs-reset" data-k="${k}" title="${t.fs_reset}" ${v === def ? 'style="visibility:hidden"' : ''}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
    </button>
    <div class="fs-step">
      <button class="fs-b" data-k="${k}" data-d="-0.5" aria-label="−">−</button>
      <input type="number" class="fs-num" data-k="${k}" min="${TC_FONT_MIN}" max="${TC_FONT_MAX}" step="0.5" value="${v}" />
      <button class="fs-b" data-k="${k}" data-d="0.5" aria-label="+">+</button>
    </div>
  </div>`;
    }).join('');

    this.shadowRoot.innerHTML = `
<style>${this._editorCss()}</style>
<div class="nav-hdr">
  <button class="nav-back" id="fs-back" title="${t.nav_back}">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
  </button>
  <div class="nav-hdr-txt">
    <div class="nav-hdr-title">${t.des_fontsize}</div>
    <div class="nav-hdr-sub">${t.des_fontsize_sub}</div>
  </div>
</div>

<span class="sec">${t.fs_preview}</span>
<div class="box fs-prev">
  <div class="pv-title" style="font-size:${sizes.title}px">${tcEsc(cardTitle)}</div>
  <div class="pv-body">
    <div class="pv-time" style="font-size:${sizes.timestamps}px">08:00</div>
    <div class="pv-ev">
      <div style="font-size:${sizes.event_title}px;font-weight:700;color:var(--primary-text-color)">${t.fs_sample_title}</div>
      <div style="font-size:${sizes.event_location}px;color:var(--secondary-text-color);opacity:.75">📍 ${t.fs_sample_loc}</div>
      <div style="font-size:${sizes.event_description}px;color:var(--secondary-text-color);opacity:.55;font-style:italic">${t.fs_sample_desc}</div>
    </div>
  </div>
</div>

<span class="sec">${t.des_fontsize}</span>
<div class="box">${rows}</div>
${anyChanged ? `<div class="fs-foot"><button class="ghost" id="fs-reset-all">${t.fs_reset_all}</button></div>` : ''}`;

    const s = this.shadowRoot;
    const setSize = (k, v) => {
      const cur = tcFontSizes(this._config.fontsize);
      let n = parseFloat(v);
      if (!Number.isFinite(n)) n = TC_FONT_DEFAULTS[k];
      cur[k] = Math.round(Math.min(TC_FONT_MAX, Math.max(TC_FONT_MIN, n)) * 10) / 10;
      this._dispatch({ ...this._config, fontsize: tcFontConfig(cur) });
      this._renderFontsizePage();
    };
    s.getElementById('fs-back').addEventListener('click', () => { this._editorPage = 'main'; this._render(); });
    s.querySelectorAll('.fs-b').forEach(b => b.addEventListener('click', () => {
      setSize(b.dataset.k, tcFontSizes(this._config.fontsize)[b.dataset.k] + parseFloat(b.dataset.d));
    }));
    s.querySelectorAll('.fs-num').forEach(inp => inp.addEventListener('change', () => setSize(inp.dataset.k, inp.value)));
    s.querySelectorAll('.fs-reset').forEach(b => b.addEventListener('click', () => setSize(b.dataset.k, TC_FONT_DEFAULTS[b.dataset.k])));
    s.getElementById('fs-reset-all')?.addEventListener('click', () => {
      this._dispatch({ ...this._config, fontsize: [] });
      this._renderFontsizePage();
    });
  }

  // ── Full render ──────────────────────────────────────────────────
  _render() {
    this._rendered = true;
    if (this._editorPage === 'kw-advanced' && (this._config.keywords || [])[this._editorKwIndex]) {
      this._renderKwAdvancedPage(this._editorKwIndex);
      return;
    }
    if (this._editorPage === 'wu-advanced' && (this._config.entities || [])[this._editorEntIndex]?.device_id) {
      this._renderWuAdvancedPage(this._editorEntIndex);
      return;
    }
    if (this._editorPage === 'fontsize') {
      this._renderFontsizePage();
      return;
    }
    this._editorPage = 'main';
    this._renderMainPage();
  }

  _editorCss() {
    return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{display:block;font-family:-apple-system,BlinkMacSystemFont,'Roboto',sans-serif;color:var(--primary-text-color);padding-bottom:12px}
.sec{font-size:11px;font-weight:700;letter-spacing:.85px;text-transform:uppercase;color:var(--secondary-text-color);opacity:.68;margin:22px 2px 7px;display:block}
.sec:first-of-type{margin-top:6px}
.box{background:var(--secondary-background-color,rgba(120,120,128,.09));border-radius:13px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;min-height:47px;padding:9px 15px;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.06))}
.row:last-child{border-bottom:none}
.rl{flex:1;font-size:14.5px;line-height:1.3}
.rs{font-size:11.5px;color:var(--secondary-text-color);margin-top:2px}
.seg{display:flex;background:var(--secondary-background-color,rgba(120,120,128,.15));border-radius:9px;padding:2px;gap:1px}
.seg-o{padding:5px 14px;border-radius:7px;border:none;background:none;font-size:13px;font-weight:500;cursor:pointer;color:var(--secondary-text-color);font-family:inherit;transition:all .14s;white-space:nowrap}
.seg-o.on{background:var(--card-background-color,#fff);color:var(--primary-text-color);box-shadow:0 1px 4px rgba(0,0,0,.13)}
select.pick{background:var(--secondary-background-color,rgba(0,0,0,.04));border:1px solid var(--divider-color,rgba(0,0,0,.12));border-radius:9px;padding:6px 10px;color:var(--primary-text-color);font-size:13px;cursor:pointer;outline:none;font-family:inherit;min-width:130px}
input[type=number].num-in{background:var(--secondary-background-color,rgba(0,0,0,.04));border:1px solid var(--divider-color,rgba(0,0,0,.12));border-radius:9px;padding:6px 10px;color:var(--primary-text-color);font-size:13px;outline:none;font-family:inherit;width:90px;text-align:right}
input[type=number].num-in:focus{border-color:var(--primary-color,#03a9f4)}
ha-switch{flex-shrink:0}
.row>ha-switch{margin-left:auto}
.row:has(>ha-switch:disabled){opacity:.45}
#wd-row{display:flex;flex-wrap:wrap;gap:6px;padding:10px 15px 12px}
.wd-pill{padding:5px 10px;border-radius:20px;border:1.5px solid var(--divider-color,rgba(0,0,0,.16));background:none;color:var(--secondary-text-color);font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
.wd-pill.on{background:var(--primary-color,#03a9f4);border-color:var(--primary-color,#03a9f4);color:#fff}
.seg-wide{width:auto}
.seg-wide .seg-o{flex:1;text-align:center}
.wd-dyn{padding:2px 15px 12px;display:flex;flex-direction:column;gap:10px}
.wd-dyn-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
#entity-list{padding:2px 15px 4px}
.ent-row{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.05))}
.ent-row:last-child{border-bottom:none}
.ent-icon{width:18px;height:18px;--mdc-icon-size:18px;color:var(--secondary-text-color);flex-shrink:0}
.ent-id{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px;opacity:.85}
.picker-wrap{padding:6px 15px 10px;border-top:1px solid var(--divider-color,rgba(0,0,0,.06))}
#kw-list{padding:6px 15px 2px;display:flex;flex-direction:column;gap:10px}
.kw-card{background:var(--card-background-color,rgba(255,255,255,.6));border-radius:10px;overflow:hidden;border:1px solid var(--divider-color,rgba(0,0,0,.09))}
.kw-r1{display:flex;align-items:center;gap:8px;padding:9px 10px 8px}
.kw-in{flex:1;min-width:0;border:1px solid var(--divider-color,rgba(0,0,0,.14));border-radius:8px;background:var(--secondary-background-color,rgba(0,0,0,.03));padding:6px 10px;font-size:13.5px;color:var(--primary-text-color);outline:none;font-family:inherit}
.kw-in:focus{border-color:var(--primary-color,#03a9f4)}
.kw-in-ro{opacity:.55;font-style:italic;cursor:default}
.kw-r2{display:flex;align-items:center;gap:8px;padding:0 10px 8px;flex-wrap:wrap}
.kw-seg{display:flex;background:var(--secondary-background-color,rgba(120,120,128,.14));border-radius:8px;padding:2px;gap:1px;margin-left:auto}
.seg-sm{padding:3px 10px;border-radius:6px;border:none;background:none;font-size:11.5px;font-weight:500;cursor:pointer;color:var(--secondary-text-color);font-family:inherit;transition:all .14s;white-space:nowrap}
.seg-sm.on{background:var(--card-background-color,#fff);color:var(--primary-text-color);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.kw-adv-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 10px;background:none;border:none;border-top:1px solid var(--divider-color,rgba(0,0,0,.06));color:var(--primary-color,#03a9f4);font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s}
.kw-adv-btn:hover{background:var(--secondary-background-color,rgba(120,120,128,.08))}
.kw-adv-btn svg{opacity:.75;flex-shrink:0}
.kw-footer{padding:8px 15px 10px;border-top:1px solid var(--divider-color,rgba(0,0,0,.06))}
.swatch{width:28px;height:28px;border-radius:7px;border:1.5px solid rgba(0,0,0,.14);overflow:hidden;position:relative;flex-shrink:0;cursor:pointer}
.swatch.no-col{background:repeating-conic-gradient(rgba(0,0,0,.07) 0% 25%, transparent 0% 50%) 0 0/8px 8px !important;border-style:dashed}
.cpick{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);opacity:0;cursor:pointer}
.ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 15px;background:none;border:1.5px solid var(--primary-color,#03a9f4);border-radius:20px;color:var(--primary-color,#03a9f4);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s}
.ghost:hover{background:rgba(var(--rgb-primary-color,3,169,244),.09)}
.rm-btn{background:none;border:none;cursor:pointer;color:var(--secondary-text-color);padding:5px;border-radius:6px;display:flex;align-items:center;opacity:.4;transition:opacity .15s,color .15s;flex-shrink:0}
.rm-btn:hover{opacity:1;color:var(--error-color,#f44336)}
.hint{font-size:13px;color:var(--secondary-text-color);padding:10px 0;opacity:.65;font-style:italic}
.txt-in{border:1px solid var(--divider-color,rgba(0,0,0,.14));border-radius:8px;background:var(--secondary-background-color,rgba(0,0,0,.03));padding:6px 10px;font-size:13px;color:var(--primary-text-color);outline:none;font-family:inherit;text-align:right;max-width:170px;width:100%}
.txt-in:focus{border-color:var(--primary-color,#03a9f4)}
.row.sub{padding-top:2px;padding-bottom:12px;justify-content:flex-end}
.nav-hdr{display:flex;align-items:center;gap:10px;padding:2px 2px 16px}
.nav-back{background:var(--secondary-background-color,rgba(120,120,128,.14));border:none;border-radius:9px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--primary-color,#03a9f4);flex-shrink:0;transition:background .15s;padding:0}
.nav-back:hover{background:rgba(var(--rgb-primary-color,3,169,244),.14)}
.nav-hdr-txt{flex:1;min-width:0}
.nav-hdr-title{font-size:16px;font-weight:700;letter-spacing:-.3px;color:var(--primary-text-color);line-height:1.25}
.nav-hdr-sub{font-size:12px;color:var(--secondary-text-color);opacity:.7;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row.dis{opacity:.45}
.row.dis ha-switch{pointer-events:none}
.row.wrap{flex-wrap:wrap}
.row.wrap>.seg{margin-left:auto}
.seg.seg3 .seg-o{padding:5px 10px}
#tr-block{border-top:1px solid var(--divider-color,rgba(0,0,0,.06));border-bottom:1px solid var(--divider-color,rgba(0,0,0,.06))}
.tr-row{justify-content:center;gap:10px}
.tm-in{background:var(--card-background-color,#fff);border:1px solid var(--divider-color,rgba(0,0,0,.12));border-radius:9px;padding:6px 10px;color:var(--primary-text-color);font-size:14px;font-family:inherit;outline:none;font-variant-numeric:tabular-nums}
.tm-in:focus{border-color:var(--primary-color,#03a9f4)}
.tr-dash{font-size:15px;color:var(--secondary-text-color)}
.tr-err{padding:0 15px 10px;font-size:11.5px;color:var(--error-color,#f44336);text-align:center}
.nav-row{display:flex;align-items:center;gap:12px;width:100%;min-height:47px;padding:9px 15px;background:none;border:none;border-top:1px solid var(--divider-color,rgba(0,0,0,.06));color:var(--primary-text-color);cursor:pointer;font-family:inherit;text-align:left;transition:background .15s}
.nav-row:hover{background:rgba(120,120,128,.08)}
.nav-row>div{flex:1;min-width:0}
.nav-row .chev{color:var(--secondary-text-color);opacity:.6;flex-shrink:0}
.fs-prev{padding:14px 15px 15px}
.pv-title{font-weight:700;letter-spacing:-.3px;color:var(--primary-text-color);margin-bottom:10px;line-height:1.2}
.pv-body{display:flex;gap:10px;align-items:flex-start}
.pv-time{width:38px;flex-shrink:0;text-align:right;color:var(--secondary-text-color);opacity:.6;line-height:1}
.pv-ev{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:6px 9px;border-radius:8px;background:rgba(var(--rgb-primary-color,3,169,244),.1);border-left:3px solid var(--primary-color,#03a9f4)}
.pv-ev>div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fs-row>div:first-child{flex:1;min-width:0}
.fs-step{display:flex;align-items:center;background:var(--card-background-color,#fff);border-radius:9px;box-shadow:0 1px 4px rgba(0,0,0,.13);flex-shrink:0}
.fs-b{width:32px;height:30px;border:none;background:none;color:var(--primary-color,#03a9f4);font-size:19px;font-weight:500;line-height:1;cursor:pointer;font-family:inherit;border-radius:9px}
.fs-b:hover{background:rgba(var(--rgb-primary-color,3,169,244),.1)}
.fs-num{width:50px;border:none;background:none;text-align:center;font-size:14px;color:var(--primary-text-color);font-family:inherit;outline:none;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
.fs-num::-webkit-outer-spin-button,.fs-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.fs-reset{background:none;border:none;cursor:pointer;color:var(--secondary-text-color);padding:5px;border-radius:6px;display:flex;align-items:center;opacity:.6;flex-shrink:0}
.fs-reset:hover{opacity:1;color:var(--primary-color,#03a9f4)}
.fs-foot{margin-top:14px;text-align:center}`;
  }

  _renderMainPage() {
    const c   = this._config;
    const t   = tcS(this._hass);
    const ppm = c.px_per_min || 1.4;
    const cfDis = this._getEntities().length < 2;

    this.shadowRoot.innerHTML = `
<style>${this._editorCss()}</style>

<span class="sec">${t.sec_calendar}</span>
<div class="box">
  <div id="entity-list"></div>
  <div class="picker-wrap" id="picker-wrap"></div>
</div>

<span class="sec">${t.sec_title}</span>
<div class="box">
  <div class="row">
    <input class="kw-in" id="title-in" placeholder="${tcEsc(t.card_title)}" value="${tcEsc(c.title||'')}" />
  </div>
</div>

<span class="sec">${t.sec_keywords}</span>
<div class="box">
  <div id="kw-list"></div>
  <div class="kw-footer">
    <button class="ghost" id="add-kw">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      ${t.kw_add}
    </button>
  </div>
</div>

<span class="sec">${t.sec_display}</span>
<div class="box">
  <div id="wd-block"></div>
  <div id="tr-block"></div>
  <div class="row">
    <div><div class="rl">${t.disp_loc}</div><div class="rs">${t.disp_loc_sub}</div></div>
    <ha-switch id="sw-loc" ${c.show_location!==false?'checked':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_notes}</div><div class="rs">${t.disp_notes_sub}</div></div>
    <ha-switch id="sw-notes" ${c.show_notes!==false?'checked':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_cal}</div><div class="rs">${t.disp_cal_sub}</div></div>
    <ha-switch id="sw-cal" ${c.show_calendar!==false?'checked':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_nowline}</div><div class="rs">${t.disp_nowline_sub}</div></div>
    <ha-switch id="sw-nowline" ${c.show_now_line!==false?'checked':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_first_day}</div><div class="rs">${t.disp_first_day_sub}</div></div>
    <ha-switch id="sw-first-day" ${c.first_day_only===true?'checked':''} ${c.last_day_only===true?'disabled':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_last_day}</div><div class="rs">${t.disp_last_day_sub}</div></div>
    <ha-switch id="sw-last-day" ${c.last_day_only===true?'checked':''} ${c.first_day_only===true?'disabled':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_desc_indicator}</div><div class="rs">${t.disp_desc_indicator_sub}</div></div>
    <ha-switch id="sw-desc-ind" ${c.show_description_indicator===true?'checked':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_create_event_btn}</div><div class="rs">${t.disp_create_event_btn_sub}</div></div>
    <ha-switch id="sw-create-event-btn" ${c.show_create_event_button===true?'checked':''}></ha-switch>
  </div>
  <div class="row${cfDis?' dis':''}" id="cf-row">
    <div><div class="rl">${t.disp_calfilter}</div><div class="rs">${cfDis ? t.disp_calfilter_need2 : t.disp_calfilter_sub}</div></div>
    <ha-switch id="sw-calfilter" ${c.show_calendar_filter===true?'checked':''} ${cfDis?'disabled':''}></ha-switch>
  </div>
</div>

<span class="sec">${t.sec_design}</span>
<div class="box">
  <div class="row">
    <div class="rl">${t.des_axis}</div>
    <div class="seg">
      <button class="seg-o${(c.time_position||'left')==='left'?' on':''}" data-v="left">${t.des_left}</button>
      <button class="seg-o${c.time_position==='right'?' on':''}" data-v="right">${t.des_right}</button>
    </div>
  </div>
  <div class="row">
    <div><div class="rl">${t.des_interval}</div><div class="rs">${t.des_interval_sub}</div></div>
    <select class="pick" id="time-int">
      <option value="event_based" ${(c.time_interval||'event_based')==='event_based'?'selected':''}>${t.des_interval_event}</option>
      <option value="15"  ${c.time_interval==='15'?'selected':''}>15 min</option>
      <option value="30"  ${c.time_interval==='30'?'selected':''}>30 min</option>
      <option value="60"  ${c.time_interval==='60'?'selected':''}>60 min</option>
    </select>
  </div>
  <div class="row">
    <div><div class="rl">${t.des_ppm}</div><div class="rs">${t.des_ppm_sub}</div></div>
    <input type="number" class="num-in" id="ppm-in" min="1" max="20" step="0.1" value="${ppm}" />
  </div>
  <button class="nav-row" id="fs-open">
    <div><div class="rl">${t.des_fontsize}</div><div class="rs">${t.des_fontsize_sub}</div></div>
    <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
  </button>
</div>

<span class="sec">${t.sec_refresh}</span>
<div class="box">
  <div class="row">
    <div><div class="rl">${t.ref_interval}</div><div class="rs">${t.ref_interval_sub}</div></div>
    <select class="pick" id="ref-int">
      <option value="auto"  ${(c.refresh_interval||'auto')==='auto'?'selected':''}>${t.ref_auto}</option>
      <option value="5"     ${c.refresh_interval==='5'?'selected':''}>${t.ref_5}</option>
      <option value="10"    ${c.refresh_interval==='10'?'selected':''}>${t.ref_10}</option>
      <option value="15"    ${c.refresh_interval==='15'?'selected':''}>${t.ref_15}</option>
      <option value="30"    ${c.refresh_interval==='30'?'selected':''}>${t.ref_30}</option>
      <option value="60"    ${c.refresh_interval==='60'?'selected':''}>${t.ref_60}</option>
      <option value="120"   ${c.refresh_interval==='120'?'selected':''}>${t.ref_120}</option>
      <option value="180"   ${c.refresh_interval==='180'?'selected':''}>${t.ref_180}</option>
      <option value="360"   ${c.refresh_interval==='360'?'selected':''}>${t.ref_360}</option>
    </select>
  </div>
</div>`;

    if (this._hass) {
      this._pickerEl = document.createElement('ha-entity-picker');
      this._pickerEl.hass = this._hass;
      this._pickerEl.label = t.ent_picker_label;
      this._pickerEl.includeDomains = ['calendar'];
      this._pickerEl.excludeEntities = this._getEntities().map(e => e.id);
      this._pickerEl.allowCustomEntity = false;
      this._pickerEl.value = '';
      this._pickerEl.addEventListener('value-changed', e => { if (e.detail.value) this._addEntity(e.detail.value); });
      this.shadowRoot.getElementById('picker-wrap').appendChild(this._pickerEl);
    }

    const s = this.shadowRoot;
    s.getElementById('title-in').addEventListener('change', e => this._set('title', e.target.value.trim()));
    s.getElementById('add-kw').addEventListener('click', () => this._addKw());
    s.getElementById('sw-loc').addEventListener('change', e => this._set('show_location', e.target.checked));
    s.getElementById('sw-notes').addEventListener('change', e => this._set('show_notes', e.target.checked));
    s.getElementById('sw-cal').addEventListener('change', e => this._set('show_calendar', e.target.checked));
    s.getElementById('sw-nowline').addEventListener('change', e => this._set('show_now_line', e.target.checked));
    s.getElementById('sw-desc-ind').addEventListener('change', e => this._set('show_description_indicator', e.target.checked));
    s.getElementById('sw-create-event-btn').addEventListener('change', e => this._set('show_create_event_button', e.target.checked));
    s.getElementById('sw-calfilter').addEventListener('change', e => this._set('show_calendar_filter', e.target.checked));
    s.getElementById('fs-open').addEventListener('click', () => { this._editorPage = 'fontsize'; this._render(); });
    s.getElementById('sw-first-day').addEventListener('change', e => {
      const v = e.target.checked;
      this._dispatch({ ...this._config, first_day_only: v, last_day_only: v ? false : this._config.last_day_only });
      this._render();
    });
    s.getElementById('sw-last-day').addEventListener('change', e => {
      const v = e.target.checked;
      this._dispatch({ ...this._config, last_day_only: v, first_day_only: v ? false : this._config.first_day_only });
      this._render();
    });
    s.getElementById('time-int').addEventListener('change', e => this._set('time_interval', e.target.value));
    s.getElementById('ref-int').addEventListener('change', e => this._set('refresh_interval', e.target.value));
    s.getElementById('ppm-in').addEventListener('change', e => this._set('px_per_min', parseFloat(e.target.value) || 1.4));
    s.querySelectorAll('.seg-o').forEach(b => b.addEventListener('click', () => this._set('time_position', b.dataset.v)));

    this._renderEntityList();
    this._renderKwList();
    this._renderWeekdaysBlock();
    this._renderTimeRangeBlock();
  }
}
customElements.define('timetable-card-editor', TimetableCardEditor);


// ═══════════════════════════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════════════════════════
class TimetableCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = { ...TC_DEFAULT };
    this._events = [];
    this._loading = false;
    this._error   = null;
    this._unavailable = false;
    this._hass    = null;
    this._weekOffset   = 0;
    this._dayOffset    = 0;
    this._homeOffsetCache = 0;
    this._createDialog  = null;
    this._createDialogSelect = null;
    this._clockTimer   = null;
    this._refreshTimer = null;
    this._retryTimer   = null;
    this._midnightTimer = null;
    this._lastFetchKey = null;
    this._lastRenderedKey = null;
    this._lastEventsSig   = null;
    this._popup        = null;
    this._webuntisState = {};
    this._calFilterCache   = null;
    this._calFilterOverlay = null;
  }

  static getConfigElement() { return document.createElement('timetable-card-editor'); }

  static getStubConfig() { return {}; }

  getCardSize() { return 10; }
  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 9, min_rows: 5 };
  }

  setConfig(cfg) {
    if (cfg.entity && !cfg.entities) cfg = { ...cfg, entities: [cfg.entity] };
    const changed = JSON.stringify(cfg.entities) !== JSON.stringify(this._config.entities);
    const rangeChanged = cfg.dynamic_start !== this._config.dynamic_start || cfg.dynamic_count !== this._config.dynamic_count;
    this._config = { ...TC_DEFAULT, ...cfg };
    const newHome = this._computeHomeOffset();
    if (this._weekOffset === this._homeOffsetCache && this._weekOffset !== newHome) {
      this._weekOffset = newHome;
      this._lastFetchKey = null;
    }
    this._homeOffsetCache = newHome;
    if (changed) { this._events = []; this._lastFetchKey = null; if (this._hass) this._fetchEvents(); }
    else if (rangeChanged) { this._lastFetchKey = null; if (this._hass) this._fetchEvents(); }
    this._reconvertWebuntis();
    this._setupRefresh();
    this._setupClock();
    this._render();
  }

  _wdMode() {
    const c = this._config;
    return (c.dynamic_start !== TC_DEFAULT.dynamic_start || c.dynamic_count !== TC_DEFAULT.dynamic_count) ? 'dynamic' : 'fixed';
  }

  _computeHomeOffset() {
    if (this._wdMode() === 'dynamic') return 0; // dynamic mode has no week concept — always anchored via _dayOffset
    if (!this._config.auto_switch_week) return 0;
    const sel = tcNormWeekdays(this._config.weekdays);
    if (!sel || !sel.length) return 0;
    const lastSelected = Math.max(...sel);
    const todayIdx = (new Date().getDay() + 6) % 7;
    return todayIdx > lastSelected ? 1 : 0;
  }

  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    if (first) {
      const lang = h?.locale?.language || h?.language || TC_STRINGS_FALLBACK;
      tcLoadStrings(lang).then(() => {
        this._fetchEvents();
        if (this.isConnected) {
          this._setupRefresh();
          this._setupClock();
        }
        this._render();
      });
    }
  }

  connectedCallback() {
    if (!this._hass) return;
    this._setupClock();
    this._setupRefresh();
  }

  disconnectedCallback() {
    clearInterval(this._clockTimer);
    clearInterval(this._refreshTimer);
    clearTimeout(this._retryTimer);
    clearTimeout(this._midnightTimer);
    this._closePopup();
    this._closeCreateEventDialog();
    this._closeCalFilter();
  }

  _setupClock() {
    clearInterval(this._clockTimer);
    this._clockTimer = this._config.show_now_line !== false
      ? setInterval(() => this._render(), 30_000)
      : null;
    this._scheduleMidnightRefresh();
  }

  _scheduleMidnightRefresh() {
    clearTimeout(this._midnightTimer);
    const now  = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    this._midnightTimer = setTimeout(() => {
      if (this.isConnected) this._fetchEvents(true);
      this._scheduleMidnightRefresh();
    }, next - now);
  }

  _setupRefresh() {
    clearInterval(this._refreshTimer);
    const ri   = this._config.refresh_interval;
    const mins = (!ri || ri === 'auto') ? 10 : (parseInt(ri) || 10);
    this._refreshTimer = setInterval(() => { this._lastFetchKey = null; this._fetchEvents(); this._refreshWebuntisAnchor(); }, mins * 60_000);
  }

  _getEntities() { return tcNormalizeEntities(this._config.entities || []); }
  _webuntisDeviceName(e) {
    const dev = this._hass?.devices?.[e.device_id];
    return dev?.name_by_user || dev?.name || e.id;
  }

  // In Dynamic mode "monday" is repurposed as the first displayed day (not necessarily a Monday),
  // and dynCount holds how many consecutive days are shown, anchored on real "today" + _dayOffset.
  _weekRange() {
    if (this._wdMode() === 'dynamic') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const base  = this._addDays(today, this._config.dynamic_start === 'tomorrow' ? 1 : 0);
      const count = Math.max(1, parseInt(this._config.dynamic_count) || 1);
      const monday = this._addDays(base, this._dayOffset);
      const end = new Date(monday);
      end.setDate(monday.getDate() + count);
      end.setHours(23, 59, 59, 999);
      return { monday, end, dynCount: count };
    }
    const now = new Date();
    const monday = new Date(now);
    const dow = now.getDay();
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + this._weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const end = new Date(monday);
    end.setDate(monday.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { monday, end };
  }

  _weekDays(t) {
    const { monday, dynCount } = this._weekRange();
    if (this._wdMode() === 'dynamic') {
      const days = [];
      for (let i = 0; i < dynCount; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const idx = (date.getDay() + 6) % 7; // 0=Mon..6=Sun
        days.push({ key: TC_DAY_KEYS[idx], short: t.days[idx].short, idx, date, selected: true });
      }
      return days;
    }
    const sel = tcNormWeekdays(this._config.weekdays) || [0, 1, 2, 3, 4, 5, 6];
    return TC_DAY_KEYS.map((key, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return { key, short: t.days[i].short, idx: i, date, selected: sel.includes(i) };
    }).filter(d => d.selected);
  }

  _weekNum(d) {
    const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    u.setUTCDate(u.getUTCDate() + 4 - (u.getUTCDay() || 7));
    const y1 = new Date(Date.UTC(u.getUTCFullYear(), 0, 1));
    return Math.ceil(((u - y1) / 86_400_000 + 1) / 7);
  }

  _entityUsable(id) {
    const st = this._hass?.states?.[id]?.state;
    return st !== undefined && st !== 'unavailable' && st !== 'unknown';
  }

  _eventsSignature(events) {
    return events
      .map(ev => [
        ev._entityId,
        ev.start?.dateTime || ev.start?.date || '',
        ev.end?.dateTime || ev.end?.date || '',
        ev.summary || '', ev.location || '', ev.description || '',
      ].join('|'))
      .sort()
      .join('\n');
  }

  async _fetchEvents(force = false) {
    const allEnts = this._getEntities();
    if (!allEnts.length || !this._hass) return;
    const ents = allEnts.filter(e => this._entityUsable(e.id));
    if (!ents.length) {
      this._unavailable = true;
      this._error = null;
      this._events = [];
      this._loading = false;
      this._lastFetchKey = null;
      this._render();
      return;
    }
    this._unavailable = false;
    const { monday, end } = this._weekRange();
    const key = `${ents.map(e=>e.id).join(',')}|${monday.toISOString()}`;
    if (this._lastFetchKey === key && !force) return;
    const isNewView = force || key !== this._lastRenderedKey;
    this._lastFetchKey = key;
    if (isNewView) {
      this._loading = true;
      this._render();
    }
    let failed = false;
    let newEvents = [];
    try {
      const results = await Promise.all(
        ents.map(e =>
          this._hass.callApi('GET',
            `calendars/${e.id}?start=${encodeURIComponent(monday.toISOString())}&end=${encodeURIComponent(end.toISOString())}`)
          .then(res => (Array.isArray(res) ? res : []).map(ev => ({ ...ev, _entityId: e.id })))
          .catch(() => { failed = true; return []; })
        )
      );
      newEvents = results.flat();
    } catch (err) {
      failed = true;
      this._error = err.message || String(err);
    }
    if (failed) {
      this._events = newEvents;
      this._lastFetchKey = null;
      this._lastRenderedKey = null;
      clearTimeout(this._retryTimer);
      this._retryTimer = setTimeout(() => this._fetchEvents(), 5_000);
      this._loading = false;
      this._render();
      this._checkWebuntisFetch();
      return;
    }
    this._error = null;
    const sig = this._eventsSignature(newEvents);
    const dataChanged = sig !== this._lastEventsSig;
    this._events = newEvents;
    this._lastEventsSig   = sig;
    this._lastRenderedKey = key;
    this._loading = false;
    if (isNewView || dataChanged) this._render();
    this._checkWebuntisFetch();
  }

  // ── WebUntis supplemental fetch ─────────────────────────────────────
  _allEvents() {
    const wu = [];
    for (const ent of this._getEntities()) {
      if (!ent.device_id) continue;
      const st = this._webuntisState[ent.id];
      if (st?.events?.length) wu.push(...st.events);
    }
    const all = wu.length ? [...this._events, ...wu] : this._events;
    if (!this._calFilterActive()) return all;
    const hidden = this._calFilterHiddenSet();
    return hidden.size ? all.filter(ev => !hidden.has(ev._entityId)) : all;
  }

  // ── Calendar filter (selection lives in the browser's localStorage) ─
  _calFilterActive() {
    return this._config.show_calendar_filter === true && this._getEntities().length > 1;
  }
  _calFilterKey() {
    return 'timetable-card:calendar-filter:' + this._getEntities().map(e => e.id).sort().join(',');
  }
  _calFilterHiddenSet() {
    const key = this._calFilterKey();
    if (!this._calFilterCache || this._calFilterCache.key !== key) {
      let arr = [];
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) arr = parsed.filter(x => typeof x === 'string');
      } catch { /* storage unavailable — default to all calendars shown */ }
      this._calFilterCache = { key, hidden: new Set(arr) };
    }
    return this._calFilterCache.hidden;
  }
  _saveCalFilter() {
    const key = this._calFilterKey();
    const hidden = this._calFilterHiddenSet();
    try {
      if (hidden.size) window.localStorage.setItem(key, JSON.stringify([...hidden]));
      else window.localStorage.removeItem(key);
    } catch { /* ignore */ }
  }
  _openCalFilter() {
    this._closeCalFilter();
    const t      = tcS(this._hass);
    const hidden = this._calFilterHiddenSet();
    const items  = this._getEntities().map(ent => {
      const col = this._entityColor({ _entityId: ent.id }) || 'var(--primary-color,#03a9f4)';
      return `<label class="cf-item"><span class="cf-dot" style="background:${tcEsc(col)}"></span><span class="cf-name">${tcEsc(this._calLabel(ent))}</span><input type="checkbox" class="cf-chk" data-id="${tcEsc(ent.id)}"${hidden.has(ent.id) ? '' : ' checked'} /></label>`;
    }).join('');
    const overlay = document.createElement('div');
    overlay.className = 'tc-cf-overlay';
    overlay.innerHTML = `
      <style>
        .tc-cf-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.38);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:cfFade .18s ease;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Roboto',sans-serif}
        @keyframes cfFade{from{opacity:0}to{opacity:1}}
        .tc-cf{background:var(--card-background-color,#fff);border-radius:18px;width:min(92vw,340px);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.28);animation:cfUp .2s cubic-bezier(.34,1.26,.64,1)}
        @keyframes cfUp{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
        .cf-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px}
        .cf-title{font-size:17px;font-weight:700;letter-spacing:-.3px;color:var(--primary-text-color)}
        .cf-done{background:none;border:none;color:var(--primary-color,#03a9f4);font-size:15px;font-weight:600;cursor:pointer;padding:4px 2px;font-family:inherit}
        .cf-list{overflow-y:auto;padding:0 12px 14px}
        .cf-item{display:flex;align-items:center;gap:11px;padding:11px 8px;border-top:1px solid var(--divider-color,rgba(0,0,0,.07));cursor:pointer}
        .cf-item:first-child{border-top:none}
        .cf-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .cf-name{flex:1;min-width:0;font-size:14.5px;color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cf-chk{width:20px;height:20px;flex-shrink:0;accent-color:var(--primary-color,#03a9f4);cursor:pointer}
      </style>
      <div class="tc-cf" role="dialog" aria-label="${tcEsc(t.cf_title)}">
        <div class="cf-head">
          <div class="cf-title">${tcEsc(t.cf_title)}</div>
          <button class="cf-done" id="tc-cf-done">${tcEsc(t.cf_done)}</button>
        </div>
        <div class="cf-list">${items}</div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) this._closeCalFilter(); });
    overlay.querySelector('#tc-cf-done').addEventListener('click', () => this._closeCalFilter());
    overlay.querySelectorAll('.cf-chk').forEach(cb => {
      cb.addEventListener('change', () => {
        const set = this._calFilterHiddenSet();
        if (cb.checked) set.delete(cb.dataset.id); else set.add(cb.dataset.id);
        this._saveCalFilter();
        this._render(); // filter only — the shown week stays as it is
      });
    });
    document.body.appendChild(overlay);
    this._calFilterOverlay = overlay;
  }
  _closeCalFilter() {
    if (this._calFilterOverlay) { this._calFilterOverlay.remove(); this._calFilterOverlay = null; }
  }

  _fmtISODate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  _mondayOf(d)   { const dt = new Date(d); dt.setHours(0,0,0,0); dt.setDate(dt.getDate() - ((dt.getDay()+6)%7)); return dt; }
  _addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }

  _convertLesson(lesson, ent) {
    const pick = (arr, pref) => {
      if (pref === 'hide') return '';
      if (!Array.isArray(arr) || !arr.length) return '';
      const key = pref === 'long' ? 'long_name' : 'name';
      return arr.map(x => (x && (x[key] || x.name)) || '').filter(Boolean).join(', ');
    };
    const desc = [lesson.info, lesson.lstext, lesson.substText].filter(v => v && String(v).trim()).join(', ');
    return {
      start: { dateTime: lesson.start },
      end:   { dateTime: lesson.end },
      // the subject is the event title, so it can never be hidden
      summary: pick(lesson.subjects, ent.subject_display === 'hide' ? 'short' : ent.subject_display),
      location: pick(lesson.rooms, ent.room_display),
      description: desc,
      _teacher: pick(lesson.teachers, ent.teacher_display),
      _lesson: lesson,
      _entityId: ent.id,
    };
  }

  // Re-applies the display options (short / long / hide) to lessons that are already cached.
  _reconvertWebuntis() {
    for (const ent of this._getEntities()) {
      if (!ent.device_id) continue;
      const st = this._webuntisState[ent.id];
      if (!st || !st.events || !st.events.length) continue;
      st.events = st.events.map(ev => (ev._lesson ? this._convertLesson(ev._lesson, ent) : ev));
    }
  }

  // Sunday ending the Nth week counted from the current real week's Monday (e.g. 12 weeks out).
  _computeWebuntisHorizon() {
    const anchorMonday = this._mondayOf(new Date());
    const horizon = this._addDays(anchorMonday, TC_WEBUNTIS_HORIZON_WEEKS * 7 - 1);
    horizon.setHours(23, 59, 59, 999);
    return horizon;
  }

  async _scanWebuntisNativeCoverage(ent, horizon) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endEx = this._addDays(horizon, 1);
    try {
      const res = await this._hass.callApi('GET',
        `calendars/${ent.id}?start=${encodeURIComponent(today.toISOString())}&end=${encodeURIComponent(endEx.toISOString())}`);
      const evs = Array.isArray(res) ? res : [];
      let lastEnd = null;
      for (const ev of evs) {
        const e = ev.end?.dateTime ? new Date(ev.end.dateTime) : (ev.end?.date ? this._allDayDate(ev.end.date) : null);
        if (e && (!lastEnd || e > lastEnd)) lastEnd = e;
      }
      return lastEnd;
    } catch {
      return undefined;
    }
  }

  _webuntisGapInView(ent, st) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days  = this._weekDays(tcS(this._hass));
    const known = [...this._events.filter(ev => ev._entityId === ent.id), ...st.events];
    for (const day of days) {
      if (day.date < today) continue; // never look into the past
      const dayEnd = this._addDays(day.date, 1);
      if (!known.some(ev => this._edt(ev, 'start') < dayEnd && this._edt(ev, 'end') > day.date)) return true;
    }
    return false;
  }

  async _checkWebuntisFetch() {
    if (!this._hass) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const ent of this._getEntities()) {
      if (!ent.device_id) continue;
      const st = (this._webuntisState[ent.id] ||= { events: [], coverageFrom: null, coverageEnd: null, loading: false, failed: false });
      if (st.loading) continue;

      if (!this._webuntisGapInView(ent, st)) continue;

      const horizon = this._computeWebuntisHorizon();
      const lastNativeEnd = await this._scanWebuntisNativeCoverage(ent, horizon);
      if (lastNativeEnd === undefined) continue; // native scan failed this cycle — retry later

      if (lastNativeEnd && lastNativeEnd >= horizon) {
        if (st.events.length || st.coverageEnd) { st.events = []; st.coverageFrom = null; st.coverageEnd = null; }
        st.failed = false;
        continue;
      }

      const neededStart = (lastNativeEnd && lastNativeEnd > today) ? lastNativeEnd : today;
      const alreadyCovered = st.coverageFrom && st.coverageEnd
        && st.coverageFrom <= neededStart && st.coverageEnd >= horizon;
      if (alreadyCovered) continue;
      if (st.failed) continue;

      st.loading = true;
      this._render();
      try {
        const result = await this._hass.callService('webuntis', 'get_timetable', {
          device_id: ent.device_id,
          start: this._fmtISODate(neededStart),
          end: this._fmtISODate(horizon),
          apply_filter: true,
          show_cancelled: true,
          compact_result: true,
          compact_tolerance_minutes: 0,
        }, undefined, undefined, true);
        const lessons = (result && result.response && result.response.lessons) || [];
        st.events = lessons.map(l => this._convertLesson(l, ent));
        st.coverageFrom = neededStart;
        st.coverageEnd = horizon;
        st.failed = false;
      } catch (err) {
        st.failed = true;
      }
      st.loading = false;
      this._render();
    }
  }

  async _refreshWebuntisAnchor(manual = false) {
    if (!this._hass) return;
    const targets = this._getEntities().filter(e => e.device_id && this._webuntisState[e.id]?.coverageEnd && !this._webuntisState[e.id].loading);
    if (!targets.length) return;
    const anchorStart = this._mondayOf(new Date());
    const anchorEnd   = this._addDays(anchorStart, 20);
    const anchorEndEx = this._addDays(anchorEnd, 1);
    for (const ent of targets) {
      const st = this._webuntisState[ent.id];
      st.loading = true;
      this._render();
      try {
        const result = await this._hass.callService('webuntis', 'get_timetable', {
          device_id: ent.device_id,
          start: this._fmtISODate(anchorStart),
          end: this._fmtISODate(anchorEnd),
          apply_filter: true,
          show_cancelled: true,
          compact_result: true,
          compact_tolerance_minutes: 0,
        }, undefined, undefined, true);
        const lessons = (result && result.response && result.response.lessons) || [];
        const converted = lessons.map(l => this._convertLesson(l, ent));
        st.events = st.events.filter(e2 => {
          const s = new Date(e2.start.dateTime);
          return !(s >= anchorStart && s < anchorEndEx);
        }).concat(converted);
        st.failed = false;
      } catch (err) {
        st.failed = true;
      }
      st.loading = false;
    }
    this._render();
  }

  _isAllDay(ev) { return !!(ev.start && ev.start.date && !ev.start.dateTime); }
  _allDayDate(dateStr) { return new Date(`${dateStr}T00:00:00`); }
  _edt(ev, f) {
    const v = ev[f];
    return v ? (v.dateTime ? new Date(v.dateTime) : new Date(v.date)) : null;
  }
  _toMin(d) { return d.getHours() * 60 + d.getMinutes(); }
  _fmt(m)   { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
  _fmtDate(d) {
    const t = tcS(this._hass);
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dow = days[d.getDay()];
    const dayIdx = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(dow);
    const dayName = dayIdx >= 0 ? (t.days_long?.[dayIdx] || t.days?.[dayIdx]?.short || '') : '';
    return `${dayName}${dayName ? ', ' : ''}${d.getDate()}. ${t.months[d.getMonth()]} ${d.getFullYear()}`;
  }
  _isToday(d) {
    const t = new Date();
    return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate();
  }
  _isCurrent(ev) {
    const now = new Date(), s = this._edt(ev,'start'), e = this._edt(ev,'end');
    return s && e && now >= s && now <= e;
  }
  _allDayOnDay(ev, day) {
    if (!this._isAllDay(ev)) return false;
    const s = this._allDayDate(ev.start.date), e = this._allDayDate(ev.end.date);
    const d0 = new Date(day); d0.setHours(0,0,0,0);
    const d1 = new Date(d0); d1.setDate(d0.getDate()+1);
    return s < d1 && e > d0;
  }
  _isAllDayFirstDay(ev, day) {
    const s = this._allDayDate(ev.start.date);
    const d0 = new Date(day); d0.setHours(0,0,0,0);
    return s.toDateString() === d0.toDateString();
  }
  _isAllDayLastDay(ev, day) {
    const last = this._allDayDate(ev.end.date);
    last.setDate(last.getDate() - 1);
    const d0 = new Date(day); d0.setHours(0,0,0,0);
    return last.toDateString() === d0.toDateString();
  }

  _applyRename(ev, kwRule) {
    if (!kwRule || !kwRule.rename) return null;
    const title = ev.summary || '';
    if (!kwRule.partial_rename_enabled) return kwRule.rename;
    const mode = kwRule.partial_rename_mode || 'keyword';
    if (mode === 'keyword' && kwRule.keyword) {
      const re = new RegExp(String(kwRule.keyword).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
      return title.replace(re, kwRule.rename);
    }
    if (mode === 'text' && kwRule.partial_rename_text) {
      const re = new RegExp(kwRule.partial_rename_text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
      return title.replace(re, kwRule.rename);
    }
    return kwRule.rename;
  }

  _matchKw(ev) {
    const title = ev.summary || '';
    const desc  = (ev.description || '').replace(/<[^>]+>/g, '');
    const loc   = ev.location || '';
    for (const kw of (this._config.keywords || [])) {
      if (kw.match_mode === 'presence') {
        if (kw.match_source !== 'description' && kw.match_source !== 'location') continue;
        const val  = (kw.match_source === 'location' ? loc : desc).trim();
        const has  = val.length > 0;
        const want = kw.presence !== 'none';
        if (has === want) return kw;
        continue;
      }
      const words = tcKwList(kw); // `keyword` may be a single string or a yaml list
      if (!words.length) continue;
      const exact = kw.exact_match !== false;
      let haystack;
      if (kw.match_source === 'description') haystack = desc;
      else if (kw.match_source === 'location') haystack = loc;
      else if (kw.match_source === 'summary') haystack = title;
      else haystack = exact ? title : `${title} ${desc}`; // legacy configs without match_source
      const hay = haystack.toLowerCase();
      const hit = words.find(w => exact ? hay === w.toLowerCase() : hay.includes(w.toLowerCase()));
      if (hit !== undefined) return Array.isArray(kw.keyword) ? { ...kw, keyword: hit } : kw;
    }
    return null;
  }
  _entityColor(ev) {
    const ent = this._getEntities().find(e => e.id === ev._entityId);
    return tcSafeColor(ent?.color) || this._defaultEntityColor(ev._entityId) || null;
  }
  _kwColor(kwRule) { return tcSafeColor(kwRule?.color); }
  _defaultEntityColor(entityId) {
    if (!entityId) return null;
    const palette = ['#e57373','#64b5f6','#81c784','#ffb74d','#ba68c8','#4db6ac','#f06292','#9575cd','#a1887f','#4fc3f7','#aed581','#ffd54f'];
    let hash = 0;
    for (let i = 0; i < entityId.length; i++) hash = (hash * 31 + entityId.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }
  _eventColor(ev) {
    const kwRule = this._matchKw(ev);
    return this._kwColor(kwRule) || this._entityColor(ev) || null;
  }
  // Start / end as minutes since midnight; an event running past midnight ends at 24:00.
  _evSpan(ev) {
    const s = this._edt(ev, 'start'), e = this._edt(ev, 'end');
    if (!s || !e) return null;
    const sm = this._toMin(s);
    let em = this._toMin(e);
    if (em <= sm && e.toDateString() !== s.toDateString()) em = 1440;
    return { sm, em };
  }

  // Minutes at which a time label + grid line is drawn.
  //  · event_based: every event start / end
  //  · fixed interval: only multiples of that interval
  //  · custom time window: limited to (and spanning exactly) that window
  _boundaries(timedEvs, range) {
    const iv    = this._config.time_interval;
    const fixed = !!iv && iv !== 'event_based';
    const step  = fixed ? (parseInt(iv) || 15) : 0;
    const spans = timedEvs.map(ev => this._evSpan(ev)).filter(Boolean);
    if (!spans.length) return [];

    if (range) {
      const set = new Set();
      if (fixed) {
        for (let t = Math.ceil(range.start / step) * step; t <= range.end; t += step) set.add(t);
        if (!set.size) { set.add(range.start); set.add(range.end); }
      } else {
        set.add(range.start);
        set.add(range.end);
        spans.forEach(({ sm, em }) => {
          if (em <= range.start || sm >= range.end) return; // outside the window
          set.add(Math.max(sm, range.start));
          set.add(Math.min(em, range.end));
        });
      }
      return Array.from(set).sort((a, b) => a - b);
    }

    if (fixed) {
      const lo = Math.floor(Math.min(...spans.map(x => x.sm)) / step) * step;
      const hi = Math.ceil(Math.max(...spans.map(x => x.em)) / step) * step;
      const out = [];
      for (let t = lo; t <= hi; t += step) out.push(t);
      return out;
    }

    const set = new Set();
    spans.forEach(({ sm, em }) => { set.add(sm); set.add(em); });
    return Array.from(set).sort((a, b) => a - b);
  }
  _layoutDay(evs) {
    const sorted = [...evs].sort((a, b) => (this._edt(a,'start')||0) - (this._edt(b,'start')||0));
    const cols = [], result = [];
    for (const ev of sorted) {
      const s = this._edt(ev,'start'), e = this._edt(ev,'end');
      if (!s || !e) continue;
      let placed = false;
      for (let ci = 0; ci < cols.length; ci++) {
        const lastEnd = this._edt(cols[ci][cols[ci].length-1], 'end');
        if (lastEnd && lastEnd <= s) { cols[ci].push(ev); result.push({ ev, col: ci }); placed = true; break; }
      }
      if (!placed) { result.push({ ev, col: cols.length }); cols.push([ev]); }
    }
    return result.map(item => {
      const s = this._edt(item.ev,'start'), e = this._edt(item.ev,'end');
      let total = 0;
      for (const col of cols) {
        if (col.some(o => { const os=this._edt(o,'start'),oe=this._edt(o,'end'); return os&&oe&&os<e&&oe>s; })) total++;
      }
      return { ...item, total };
    });
  }

  // ── Popup ────────────────────────────────────────────────────────
  _calLabel(ent) {
    if (!ent) return '';
    return ent.device_id
      ? `${tcS(this._hass).wu_label_prefix}: ${this._webuntisDeviceName(ent)}`
      : (this._hass?.states?.[ent.id]?.attributes?.friendly_name || ent.id);
  }

  _openPopup(ev) {
    this._closePopup();
    const t = tcS(this._hass);
    const kwRule = this._matchKw(ev);
    const accentColor = this._eventColor(ev) || 'var(--primary-color,#03a9f4)';
    const title = this._applyRename(ev, kwRule) || ev.summary || t.no_title;
    const s = this._edt(ev,'start'), e = this._edt(ev,'end');
    const loc = (ev.location || '').trim();
    const rawDesc = (ev.description || '').replace(/<[^>]+>/g,'').trim();
    const calId = ev._entityId || '';

    let timeStr = '';
    if (this._isAllDay(ev)) {
      timeStr = t.all_day;
    } else if (s && e) {
      const sDate = this._fmtDate(s);
      const eDate = this._fmtDate(e);
      if (sDate === eDate) {
        timeStr = `${sDate}<br>${this._fmt(this._toMin(s))} – ${this._fmt(this._toMin(e))}`;
      } else {
        timeStr = `${sDate} ${this._fmt(this._toMin(s))} – ${eDate} ${this._fmt(this._toMin(e))}`;
      }
    }

    let rows = '';
    if (timeStr) rows += `<div class="pd-row"><div class="pd-ico">🕐</div><div class="pd-val">${timeStr}</div></div>`;
    const teacher = (ev._teacher || '').trim();
    if (teacher) rows += `<div class="pd-row"><div class="pd-ico">👤</div><div class="pd-val">${tcEsc(teacher)}</div></div>`;
    if (loc)     rows += `<div class="pd-row"><div class="pd-ico">📍</div><div class="pd-val">${tcEsc(loc)}</div></div>`;
    if (rawDesc) rows += `<div class="pd-row"><div class="pd-ico">📝</div><div class="pd-val pd-desc">${tcEsc(rawDesc)}</div></div>`;
    if (calId && this._config.show_calendar !== false) {
      const calEnt   = this._getEntities().find(en => en.id === calId);
      const calLabel = this._calLabel(calEnt) || calId;
      rows += `<div class="pd-row"><div class="pd-ico">📅</div><div class="pd-val pd-cal">${tcEsc(calLabel)}</div></div>`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'tc-popup-overlay';
    overlay.innerHTML = `
      <style>
        .tc-popup-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.38);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:pfadeIn .18s ease}
        @keyframes pfadeIn{from{opacity:0}to{opacity:1}}
        .tc-popup{background:var(--card-background-color,#fff);border-radius:18px;width:min(92vw,360px);max-height:80vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.28);animation:pslideUp .2s cubic-bezier(.34,1.26,.64,1)}
        @keyframes pslideUp{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
        .tc-popup-bar{width:4px;flex-shrink:0;background:${accentColor};border-radius:0 0 0 18px}
        .tc-popup-inner{display:flex;flex:1;overflow:hidden}
        .tc-popup-body{flex:1;overflow-y:auto;padding:18px 18px 18px 14px}
        .tc-popup-title{font-size:17px;font-weight:700;letter-spacing:-.3px;color:var(--primary-text-color);line-height:1.3;margin-bottom:14px}
        .pd-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
        .pd-row:last-child{margin-bottom:0}
        .pd-ico{font-size:15px;flex-shrink:0;margin-top:1px;width:18px;text-align:center}
        .pd-val{font-size:13.5px;color:var(--primary-text-color);line-height:1.5;word-break:break-word}
        .pd-desc{color:var(--secondary-text-color);font-size:13px;white-space:pre-wrap}
        .pd-cal{color:var(--secondary-text-color);font-size:12px;opacity:.65}
        .tc-popup-close{position:absolute;top:12px;right:12px;background:var(--secondary-background-color,rgba(120,120,128,.15));border:none;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--secondary-text-color);transition:background .15s}
        .tc-popup-close:hover{background:var(--secondary-background-color,rgba(120,120,128,.25))}
        .tc-popup-wrap{position:relative}
      </style>
      <div class="tc-popup-wrap">
        <div class="tc-popup">
          <div class="tc-popup-inner">
            <div class="tc-popup-bar"></div>
            <div class="tc-popup-body">
              <div class="tc-popup-title">${tcEsc(title)}</div>
              ${rows}
            </div>
          </div>
        </div>
        <button class="tc-popup-close" id="tc-pop-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>`;

    overlay.addEventListener('click', ev => { if (ev.target === overlay) this._closePopup(); });
    overlay.querySelector('#tc-pop-close').addEventListener('click', () => this._closePopup());
    document.body.appendChild(overlay);
    this._popup = overlay;
  }

  _closePopup() {
    if (this._popup) { this._popup.remove(); this._popup = null; }
  }

  // ── Create-event dialog ─────────────────────────────────────────
  _openCreateEventDialog() {
    this._closeCreateEventDialog();
    const t = tcS(this._hass);
    const overlay = document.createElement('div');
    overlay.className = 'tc-ce-overlay';

    const now = new Date();
    const startDefault = new Date(now);
    startDefault.setMinutes(Math.ceil(startDefault.getMinutes() / 30) * 30, 0, 0);
    const endDefault = new Date(startDefault.getTime() + 60 * 60000);
    const fmtTime = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    overlay.innerHTML = `
<style>
.tc-ce-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Roboto',sans-serif;box-sizing:border-box}
.tc-ce-overlay *{box-sizing:border-box}
.tc-ce-card{background:var(--card-background-color,#fff);color:var(--primary-text-color);border-radius:18px;width:100%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3)}
.tc-ce-hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 6px;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.08));flex-shrink:0}
.tc-ce-hdr-title{font-size:16px;font-weight:700;letter-spacing:-.2px}
.tc-ce-hbtn{background:none;border:none;font-size:15px;padding:8px 12px;cursor:pointer;color:var(--primary-color,#03a9f4);font-family:inherit;border-radius:8px}
.tc-ce-hbtn.save{font-weight:700}
.tc-ce-hbtn:disabled{opacity:.4;cursor:default}
.tc-ce-body{overflow-y:auto;padding:4px 0 18px}
.tc-ce-plain{width:100%;border:none;background:none;padding:11px 16px;font-size:15px;color:var(--primary-text-color);outline:none;font-family:inherit;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.08))}
.tc-ce-plain::placeholder{color:var(--secondary-text-color);opacity:.65}
textarea.tc-ce-plain{resize:none;min-height:64px;line-height:1.4;font-family:inherit}
.tc-ce-group{margin:16px 16px 0;background:var(--secondary-background-color,rgba(120,120,128,.09));border-radius:13px;overflow:hidden}
.tc-ce-row{display:flex;align-items:center;gap:10px;min-height:46px;padding:8px 14px;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.06))}
.tc-ce-row:last-child{border-bottom:none}
.tc-ce-label{flex:1;font-size:14.5px}
.tc-ce-dt{display:flex;gap:6px;flex-shrink:0}
.tc-ce-date,.tc-ce-time,.tc-ce-select{border:none;background:none;color:var(--primary-text-color);font-size:13.5px;font-family:inherit;text-align:right;outline:none}
.tc-ce-cal-wrap{flex:1;min-width:0}
.tc-ce-cal-select{width:100%;text-align:left;padding:6px 0}
.tc-ce-error{margin:14px 16px 0;padding:10px 12px;border-radius:10px;background:rgba(var(--rgb-error-color,244,67,54),.12);color:var(--error-color,#f44336);font-size:13px;line-height:1.4}
</style>
<div class="tc-ce-card">
  <div class="tc-ce-hdr">
    <button class="tc-ce-hbtn" id="ce-cancel">${t.ce_cancel}</button>
    <div class="tc-ce-hdr-title">${t.ce_dialog_title}</div>
    <button class="tc-ce-hbtn save" id="ce-save">${t.ce_save}</button>
  </div>
  <div class="tc-ce-body">
    <input class="tc-ce-plain" id="ce-title" placeholder="${t.ce_title_ph}" />
    <input class="tc-ce-plain" id="ce-location" placeholder="${t.ce_location_ph}" />
    <textarea class="tc-ce-plain" id="ce-description" placeholder="${t.ce_description_ph}"></textarea>
    <div class="tc-ce-group">
      <div class="tc-ce-row">
        <div class="tc-ce-label">${t.ce_calendar}</div>
        <div class="tc-ce-cal-wrap" id="ce-cal-wrap"></div>
      </div>
      <div class="tc-ce-row">
        <div class="tc-ce-label">${t.ce_all_day}</div>
        <ha-switch id="ce-allday"></ha-switch>
      </div>
      <div class="tc-ce-row">
        <div class="tc-ce-label">${t.ce_start}</div>
        <div class="tc-ce-dt">
          <input type="date" class="tc-ce-date" id="ce-start-date" value="${this._fmtISODate(startDefault)}" />
          <input type="time" class="tc-ce-time" id="ce-start-time" value="${fmtTime(startDefault)}" />
        </div>
      </div>
      <div class="tc-ce-row">
        <div class="tc-ce-label">${t.ce_end}</div>
        <div class="tc-ce-dt">
          <input type="date" class="tc-ce-date" id="ce-end-date" value="${this._fmtISODate(endDefault)}" />
          <input type="time" class="tc-ce-time" id="ce-end-time" value="${fmtTime(endDefault)}" />
        </div>
      </div>
      <div class="tc-ce-row">
        <div class="tc-ce-label">${t.ce_repeat}</div>
        <select class="tc-ce-select" id="ce-repeat">
          <option value="none">${t.ce_repeat_none}</option>
          <option value="daily">${t.ce_repeat_daily}</option>
          <option value="weekly">${t.ce_repeat_weekly}</option>
          <option value="monthly">${t.ce_repeat_monthly}</option>
          <option value="yearly">${t.ce_repeat_yearly}</option>
        </select>
      </div>
    </div>
    <div class="tc-ce-error" id="ce-error" style="display:none"></div>
  </div>
</div>`;

    document.body.appendChild(overlay);
    this._createDialog = overlay;

    overlay.addEventListener('click', ev => { if (ev.target === overlay) this._closeCreateEventDialog(); });
    overlay.querySelector('#ce-cancel').addEventListener('click', () => this._closeCreateEventDialog());
    overlay.querySelector('#ce-save').addEventListener('click', () => this._submitCreateEvent());

    const startTimeEl = overlay.querySelector('#ce-start-time');
    const endTimeEl   = overlay.querySelector('#ce-end-time');
    overlay.querySelector('#ce-allday').addEventListener('change', e => {
      const on = e.target.checked;
      startTimeEl.style.display = on ? 'none' : '';
      endTimeEl.style.display   = on ? 'none' : '';
    });

    this._createDialogSelect = null;
    const calWrap = overlay.querySelector('#ce-cal-wrap');
    const calEnts = this._getEntities();
    const sel = document.createElement('select');
    sel.className = 'tc-ce-select tc-ce-cal-select';
    sel.innerHTML = calEnts.length
      ? calEnts.map(ent => `<option value="${tcEsc(ent.id)}">${tcEsc(this._calLabel(ent))}</option>`).join('')
      : `<option value="">${t.ce_calendar_none}</option>`;
    calWrap.appendChild(sel);
    this._createDialogSelect = sel;
  }

  _closeCreateEventDialog() {
    if (this._createDialog) { this._createDialog.remove(); this._createDialog = null; this._createDialogSelect = null; }
  }

  async _submitCreateEvent() {
    const t = tcS(this._hass);
    const ov = this._createDialog;
    if (!ov) return;
    const errEl = ov.querySelector('#ce-error');
    errEl.style.display = 'none';

    const title       = ov.querySelector('#ce-title').value.trim();
    const location     = ov.querySelector('#ce-location').value.trim();
    const description  = ov.querySelector('#ce-description').value.trim();
    const entityId      = this._createDialogSelect ? this._createDialogSelect.value : '';
    const allDay      = ov.querySelector('#ce-allday').checked;
    const startDate     = ov.querySelector('#ce-start-date').value;
    const startTime     = ov.querySelector('#ce-start-time').value || '00:00';
    const endDate     = ov.querySelector('#ce-end-date').value;
    const endTime     = ov.querySelector('#ce-end-time').value || '00:00';
    const repeat      = ov.querySelector('#ce-repeat').value;

    if (!title || !entityId || !startDate || !endDate) {
      errEl.textContent = t.ce_error_required;
      errEl.style.display = '';
      return;
    }

    let start, end;
    if (allDay) {
      start = new Date(`${startDate}T00:00:00`);
      end   = new Date(`${endDate}T00:00:00`);
      end.setDate(end.getDate() + 1); // HA all-day end date is exclusive (RFC5545)
    } else {
      start = new Date(`${startDate}T${startTime}:00`);
      end   = new Date(`${endDate}T${endTime}:00`);
    }
    if (end <= start) {
      errEl.textContent = t.ce_error_range;
      errEl.style.display = '';
      return;
    }

    const saveBtn = ov.querySelector('#ce-save');
    saveBtn.disabled = true;
    saveBtn.textContent = t.ce_saving;

    const pad = n => String(n).padStart(2, '0');
    const fmtDateTime = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

    try {
      if (repeat === 'none') {
        // The stable, universally-supported REST service — no rrule support, so this path
        // is used whenever no repeat was requested.
        const fields = { summary: title };
        if (description) fields.description = description;
        if (location) fields.location = location;
        if (allDay) {
          fields.start_date = this._fmtISODate(start);
          fields.end_date = this._fmtISODate(end);
        } else {
          fields.start_date_time = fmtDateTime(start);
          fields.end_date_time = fmtDateTime(end);
        }
        await this._hass.callService('calendar', 'create_event', fields, { entity_id: entityId });
      } else {
        // Recurrence is only exposed via the frontend WebSocket command — support for it
        // depends on the target calendar integration and may fail there.
        const rruleMap = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
        const event = { summary: title, rrule: rruleMap[repeat] };
        if (description) event.description = description;
        if (location) event.location = location;
        if (allDay) {
          event.start = this._fmtISODate(start);
          event.end = this._fmtISODate(end);
        } else {
          event.start = fmtDateTime(start).replace(' ', 'T');
          event.end = fmtDateTime(end).replace(' ', 'T');
        }
        await this._hass.callWS({ type: 'calendar/event/create', entity_id: entityId, event });
      }
      this._closeCreateEventDialog();
      this._lastFetchKey = null;
      this._fetchEvents();
    } catch (err) {
      errEl.textContent = (err && err.message) ? err.message : t.ce_error_generic;
      errEl.style.display = '';
      saveBtn.disabled = false;
      saveBtn.textContent = t.ce_save;
    }
  }

  _render() {
    const newHome = this._computeHomeOffset();
    if (this._weekOffset === this._homeOffsetCache && this._weekOffset !== newHome) {
      this._weekOffset = newHome;
      this._lastFetchKey = null;
    }
    this._homeOffsetCache = newHome;
    if (this._calFilterOverlay && !this._calFilterActive()) this._closeCalFilter();

    const t        = tcS(this._hass);
    const mode     = this._wdMode();
    const days     = this._weekDays(t);
    const { monday, end: rangeEnd } = this._weekRange();
    const now      = new Date();
    const weekNum  = this._weekNum(monday);
    const timeLeft = this._config.time_position !== 'right';
    const ppm      = parseFloat(this._config.px_per_min) || 1.4;
    const fs       = tcFontSizes(this._config.fontsize);

    const evSrc      = this._allEvents();
    const allDayEvs = evSrc.filter(ev =>  this._isAllDay(ev));
    const timedEvs  = evSrc.filter(ev => !this._isAllDay(ev));
    const hasAllDay = allDayEvs.length > 0;

    const range  = tcTimeRange(this._config);
    const bounds = this._boundaries(timedEvs, range);
    const minT   = range ? range.start : (bounds.length ? bounds[0] : 480);
    const maxT   = range ? range.end   : (bounds.length ? bounds[bounds.length-1] : 960);
    const bodyH  = bounds.length ? (maxT - minT) * ppm + PADDING_TOP + PADDING_BOT : 200;

    const byDay = days.map(day =>
      timedEvs.filter(ev => { const s = this._edt(ev,'start'); return s && s.toDateString()===day.date.toDateString(); })
    );

    const isCurrentWeek = now >= monday && now <= rangeEnd;
    const isHome        = mode === 'dynamic' ? this._dayOffset === 0 : this._weekOffset === newHome;

    const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{display:block;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Roboto',sans-serif;-webkit-font-smoothing:antialiased}
ha-card{overflow:hidden;border-radius:var(--ha-card-border-radius,16px);position:relative}
.ce-fab{position:absolute;bottom:14px;right:14px;width:44px;height:44px;border-radius:50%;background:var(--primary-color,#03a9f4);color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(var(--rgb-primary-color,3,169,244),.4);z-index:15;transition:transform .15s ease,box-shadow .15s ease;flex-shrink:0}
.ce-fab:hover{transform:scale(1.06);box-shadow:0 6px 18px rgba(var(--rgb-primary-color,3,169,244),.5)}
.ce-fab:active{transform:scale(.96)}
.hdr{display:flex;align-items:center;gap:9px;padding:10px 13px 9px;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.08));background:var(--card-background-color);z-index:10;user-select:none}
.hdr-ico{width:31px;height:31px;border-radius:8px;background:var(--primary-color,#03a9f4);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(var(--rgb-primary-color,3,169,244),.32)}
.hdr-txt{flex:1;min-width:0}
.hdr-title-row{display:flex;align-items:center;gap:2px;min-width:0}
.hdr-title{min-width:0;font-size:${fs.title}px;font-weight:700;letter-spacing:-.3px;color:var(--primary-text-color);line-height:1.2}
.hdr-sub{font-size:11px;color:var(--secondary-text-color);margin-top:1px}
.cf-btn{background:none;border:none;cursor:pointer;color:var(--secondary-text-color);padding:2px 5px;margin-left:2px;border-radius:6px;display:flex;align-items:center;opacity:.6;flex-shrink:0;transition:opacity .15s,background .15s,color .15s}
.cf-btn:hover{opacity:1;background:var(--secondary-background-color,rgba(0,0,0,.05))}
.cf-btn.on{color:var(--primary-color,#03a9f4);opacity:1}
.cf-btn ha-icon{--mdc-icon-size:16px;width:16px;height:16px;display:block}
.nav-grp{display:flex;align-items:center;gap:1px}
.wu-status-ico{width:16px;height:16px;--mdc-icon-size:16px;color:var(--secondary-text-color);opacity:.6;flex-shrink:0;margin-right:2px}
.wu-status-ico.loading{animation:pulse 1.4s ease-in-out infinite}
.nav-btn{background:none;border:none;cursor:pointer;color:var(--secondary-text-color);padding:5px 9px;border-radius:8px;font-size:15px;font-weight:700;line-height:1;display:flex;align-items:center;transition:background .14s,color .14s;font-family:inherit}
.nav-btn:hover{background:var(--secondary-background-color,rgba(0,0,0,.06));color:var(--primary-text-color)}
.today-btn{background:none;border:1.5px solid var(--divider-color,rgba(0,0,0,.16));cursor:pointer;color:var(--secondary-text-color);padding:4px 9px;border-radius:7px;font-size:11px;font-weight:600;line-height:1;display:flex;align-items:center;transition:background .14s,color .14s,border-color .14s;font-family:inherit;white-space:nowrap}
.today-btn:hover{background:var(--secondary-background-color,rgba(0,0,0,.06));color:var(--primary-text-color)}
.today-btn.active{border-color:var(--primary-color,#03a9f4);color:var(--primary-color,#03a9f4);background:rgba(var(--rgb-primary-color,3,169,244),.08)}
.ico-btn{background:none;border:none;cursor:pointer;color:var(--secondary-text-color);padding:6px;border-radius:8px;display:flex;align-items:center;opacity:.5;transition:opacity .15s,background .15s}
.ico-btn:hover{opacity:1;background:var(--secondary-background-color,rgba(0,0,0,.05))}
.ico-btn.spin svg{animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.state{padding:52px 20px;text-align:center;color:var(--secondary-text-color);font-size:14px;display:flex;flex-direction:column;align-items:center;gap:10px;line-height:1.6}
.state.err{color:var(--error-color,#f44336)}
.state-ico{font-size:38px;line-height:1}
.allday{display:flex;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.08));background:var(--secondary-background-color,rgba(120,120,128,.05));min-height:32px}
.allday-lbl{width:${TIME_W}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:7.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--secondary-text-color);opacity:.5;border-right:1px solid var(--divider-color,rgba(0,0,0,.07))}
.allday-lbl.r{border-right:none;border-left:1px solid var(--divider-color,rgba(0,0,0,.07));order:2}
.allday-days{flex:1;min-width:0;display:flex}
.allday-col{flex:1;min-width:0;overflow:hidden;padding:4px 3px;border-left:1px solid var(--divider-color,rgba(0,0,0,.06));display:flex;flex-direction:column;gap:2px}
.allday-col:first-child{border-left:none}
.allday-chip{min-width:0;max-width:100%;font-size:9px;font-weight:600;padding:2px 5px;border-radius:5px;background:rgba(var(--rgb-primary-color,3,169,244),.12);color:var(--primary-color,#03a9f4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.5;cursor:pointer}
.allday-chip:hover{opacity:.8}
.day-hdrs{display:flex;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.07));background:var(--card-background-color);position:sticky;top:0;z-index:9}
.time-sp{width:${TIME_W}px;flex-shrink:0}
.day-hdr{flex:1;min-width:0;text-align:center;padding:7px 3px 6px;border-left:1px solid var(--divider-color,rgba(0,0,0,.06))}
.day-hdr:first-child{border-left:none}
.d-name{font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--secondary-text-color);line-height:1}
.d-date{font-size:20px;font-weight:200;color:var(--primary-text-color);line-height:1.3;letter-spacing:-.5px;margin-top:1px}
.day-hdr.today .d-name{color:var(--primary-color,#03a9f4)}
.day-hdr.today .d-date{font-weight:700;color:var(--primary-color,#03a9f4)}
.tt-scroll{overflow-y:auto}
.tt-body{display:flex;position:relative;height:${bodyH}px}
.t-col{width:${TIME_W}px;flex-shrink:0;position:relative}
.t-col.l{border-right:1px solid var(--divider-color,rgba(0,0,0,.07))}
.t-col.r{border-left:1px solid var(--divider-color,rgba(0,0,0,.07));order:2}
.t-lbl{position:absolute;left:0;right:0;text-align:center;font-size:${fs.timestamps}px;font-weight:500;color:var(--secondary-text-color);opacity:.55;transform:translateY(-50%);line-height:1;pointer-events:none;user-select:none;letter-spacing:.2px}
.days-area{flex:1;display:flex;min-width:0}
.d-col{flex:1;min-width:0;position:relative;border-left:1px solid var(--divider-color,rgba(0,0,0,.055))}
.d-col:first-child{border-left:none}
.g-line{position:absolute;left:0;right:0;height:1px;background:var(--divider-color,rgba(0,0,0,.04));pointer-events:none}
.now-line{position:absolute;left:-1px;right:-1px;height:2px;background:var(--primary-color,#03a9f4);z-index:7;border-radius:1px;pointer-events:none}
.now-dot{position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--primary-color,#03a9f4)}
.ev{position:absolute;border-radius:8px;padding:5px 7px 5px 10px;overflow:hidden;cursor:pointer;z-index:1;display:flex;flex-direction:column;justify-content:flex-start;background:rgba(var(--rgb-primary-color,3,169,244),.08);border-left:3px solid rgba(var(--rgb-primary-color,3,169,244),.45);transition:transform .15s ease,box-shadow .15s ease;will-change:transform}
.ev:hover{z-index:5;transform:scale(1.022) translateZ(0);box-shadow:0 4px 16px rgba(0,0,0,.12)}
.ev.now{z-index:3;transform:scale(1.03) translateZ(0);box-shadow:0 7px 22px rgba(0,0,0,.14)}
.ev.now:hover{z-index:6;transform:scale(1.048) translateZ(0)}
.ev-title{font-size:${fs.event_title}px;font-weight:700;color:var(--primary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.35;letter-spacing:-.1px}
.ev-teacher{font-size:${fs.event_location}px;font-weight:500;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;line-height:1.2;opacity:.85}
.ev-loc{font-size:${fs.event_location}px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;line-height:1.2;opacity:.68}
.ev-notes{font-size:${fs.event_description}px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;line-height:1.2;opacity:.38;font-style:italic}
.ev-desc-ind{position:absolute;bottom:3px;right:6px;font-size:10px;line-height:1;opacity:.55;color:var(--primary-text-color);pointer-events:none}
.now-badge{position:absolute;top:4px;right:5px;width:5px;height:5px;border-radius:50%;background:var(--primary-color,#03a9f4);animation:pulse 2s ease-in-out infinite;flex-shrink:0}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.6)}}
.rng-hint{position:absolute;left:50%;transform:translateX(-50%);z-index:8;font-size:8px;font-weight:700;line-height:1;padding:2px 6px;border-radius:8px;background:var(--secondary-background-color,rgba(120,120,128,.14));color:var(--secondary-text-color);pointer-events:none;letter-spacing:.1px}
.rng-hint.top{top:0}
.rng-hint.bot{bottom:2px}`;

    const cardTitle = (this._config.title && this._config.title.trim()) || t.card_title;
    let subtitleStr;
    if (mode === 'dynamic') {
      const fmtShort = d => `${d.getDate()}. ${t.months[d.getMonth()]}`;
      const lastDay  = days.length ? days[days.length - 1].date : monday;
      subtitleStr = days.length > 1 ? `${fmtShort(monday)} – ${fmtShort(lastDay)}` : fmtShort(monday);
    } else {
      const mondayStr = `${monday.getDate()}. ${t.months[monday.getMonth()]} ${monday.getFullYear()}`;
      subtitleStr = `${t.week_prefix} ${weekNum} · ${mondayStr}`;
    }
    const wuStates    = this._getEntities().filter(e => e.device_id).map(e => this._webuntisState[e.id]).filter(Boolean);
    const wuLoading   = wuStates.some(s => s.loading);
    const wuFailed    = !wuLoading && wuStates.some(s => s.failed);
    const wuCutoff    = !wuLoading && !wuFailed && wuStates.some(s => s.coverageEnd && s.events.length === 0);
    const wuStatusIco = wuLoading ? 'mdi:alpha-u-box' : ((wuFailed || wuCutoff) ? 'mdi:cloud-cancel' : '');
    const wuStatusTtl = wuLoading ? t.wu_loading_title : (wuFailed ? t.wu_failed_title : t.wu_stopped_title);

    const cfOn      = this._calFilterActive();
    const cfHidden  = cfOn ? this._calFilterHiddenSet().size : 0;
    const cfBtnHTML = cfOn
      ? `<button class="cf-btn${cfHidden?' on':''}" id="cf-btn" title="${tcEsc(t.cf_btn_title)}"><ha-icon icon="mdi:calendar-filter"></ha-icon></button>`
      : '';

    const hdrHTML = `<div class="hdr">
      <div class="hdr-ico">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
        </svg>
      </div>
      <div class="hdr-txt">
        <div class="hdr-title-row">
          <div class="hdr-title">${tcEsc(cardTitle)}</div>
          ${cfBtnHTML}
        </div>
        <div class="hdr-sub">${subtitleStr}</div>
      </div>
      ${wuStatusIco ? `<ha-icon class="wu-status-ico${wuLoading?' loading':''}" icon="${wuStatusIco}" title="${wuStatusTtl}"></ha-icon>` : ''}
      <div class="nav-grp">
        <button class="nav-btn" id="prev-btn" title="${t.prev_week}">&lt;</button>
        <button class="today-btn${isHome?' active':''}" id="today-btn" title="${t.today_btn}">${t.today_btn}</button>
        <button class="nav-btn" id="next-btn" title="${t.next_week}">&gt;</button>
      </div>
      <button class="ico-btn${this._loading?' spin':''}" id="ref-btn" title="${t.refresh}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>
    </div>`;

    const fabHTML = this._config.show_create_event_button === true ? `
      <button class="ce-fab" id="ce-fab-btn" title="${t.ce_dialog_title}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </button>` : '';

    const ents = this._getEntities();
    if (!ents.length) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state"><div class="state-ico">📋</div>${t.state_no_entity}<br><small>${t.state_no_entity_hint}</small></div>${fabHTML}</ha-card>`;
      this._bindNav(); return;
    }
    if (this._unavailable) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state"><div class="state-ico">🔌</div>${t.state_unavailable}<br><small>${t.state_unavailable_hint}</small></div>${fabHTML}</ha-card>`;
      this._bindNav(); return;
    }
    if (this._loading && !this._events.length) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state"><div class="state-ico">📅</div>${t.state_loading}</div>${fabHTML}</ha-card>`;
      this._bindNav(); return;
    }
    if (this._error) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state err"><div class="state-ico">⚠️</div>${tcEsc(this._error)}</div>${fabHTML}</ha-card>`;
      this._bindNav(); return;
    }
    if (!bounds.length && !hasAllDay) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state"><div class="state-ico">🗓️</div>${t.state_no_events}</div>${fabHTML}</ha-card>`;
      this._bindNav(); return;
    }

    let allDayHTML = '';
    if (hasAllDay) {
      const cols = days.map(day => {
        const chips = allDayEvs.filter(ev => {
          if (!this._allDayOnDay(ev, day.date)) return false;
          if (this._config.first_day_only) return this._isAllDayFirstDay(ev, day.date);
          if (this._config.last_day_only) return this._isAllDayLastDay(ev, day.date);
          return true;
        }).map(ev => {
          const kwRule = this._matchKw(ev);
          if (kwRule?.hidden) return '';
          const col = this._kwColor(kwRule) || this._entityColor(ev);
          const sty = tcChipStyle(col);
          const renamed = this._applyRename(ev, kwRule);
          const label = renamed || ev.summary || t.all_day;
          return `<div class="allday-chip" style="${tcEsc(sty)}" data-evid="${tcEsc(JSON.stringify({s:ev.start,e:ev.end,sum:ev.summary,loc:ev.location,desc:ev.description,eid:ev._entityId}))}">${tcEsc(label)}</div>`;
        }).join('');
        return `<div class="allday-col">${chips}</div>`;
      }).join('');
      allDayHTML = `<div class="allday">
        <div class="allday-lbl${timeLeft?'':' r'}">${t.all_day}</div>
        <div class="allday-days">${cols}</div>
      </div>`;
    }

    const dhCols = days.map(d => `
      <div class="day-hdr${this._isToday(d.date)?' today':''}">
        <div class="d-name">${d.short}</div>
        <div class="d-date">${d.date.getDate()}.</div>
      </div>`).join('');
    const dhHTML = `<div class="day-hdrs">
      ${timeLeft?`<div class="time-sp"></div>`:''}${dhCols}${!timeLeft?`<div class="time-sp"></div>`:''}
    </div>`;

    const tLabels = bounds.map(m => {
      const top = (m - minT) * ppm + PADDING_TOP;
      return `<div class="t-lbl" style="top:${top}px">${this._fmt(m)}</div>`;
    }).join('');

    const nowMin = this._toMin(now);
    const showNow = this._config.show_now_line !== false && isCurrentWeek && nowMin >= minT && nowMin <= maxT;
    const nowTop  = (nowMin - minT) * ppm + PADDING_TOP;

    const dCols = days.map((day, di) => {
      const rawEvs  = byDay[di];
      const isToday = this._isToday(day.date);
      const gLines  = bounds.map(m => `<div class="g-line" style="top:${(m-minT)*ppm+PADDING_TOP}px"></div>`).join('');
      const nowLine = (isToday && showNow)
        ? `<div class="now-line" style="top:${nowTop}px"><div class="now-dot"></div></div>` : '';
      const visibleEvs = rawEvs.filter(ev => !this._matchKw(ev)?.hidden);
      // custom time window: only events overlapping it take part in the layout
      const inWindow   = range
        ? visibleEvs.filter(ev => { const sp = this._evSpan(ev); return sp && sp.em > range.start && sp.sm < range.end; })
        : visibleEvs;
      const layout     = this._layoutDay(inWindow);

      let hintTop = '', hintBot = '';
      if (range && this._config.show_out_of_range_hint === true) {
        let before = 0, after = 0;
        visibleEvs.forEach(ev => {
          const sp = this._evSpan(ev);
          if (!sp) return;
          if (sp.em <= range.start) before++;
          else if (sp.sm >= range.end) after++;
        });
        if (before) hintTop = `<div class="rng-hint top">+${before}</div>`;
        if (after)  hintBot = `<div class="rng-hint bot">+${after}</div>`;
      }

      const evBlocks = layout.map(({ ev, col, total }) => {
        const span = this._evSpan(ev);
        if (!span) return '';
        const sm = Math.max(span.sm, minT), em = Math.min(span.em, maxT); // clipped to the shown window
        const top    = (sm - minT) * ppm + PADDING_TOP;
        const height = Math.max((em - sm) * ppm, 28);
        const isCurr = this._isCurrent(ev);
        const colGap = 2, pad = 2;
        const colW   = `calc(${100/total}% - ${colGap*(total-1)/total + pad*2}px)`;
        const colLeft = col === 0 ? `${pad}px` : `calc(${col*100/total}% + ${colGap*col/total}px)`;
        const kwRule  = this._matchKw(ev);
        const baseCol = this._kwColor(kwRule) || this._entityColor(ev);
        const rgb     = baseCol ? tcRgb(baseCol) : null;
        const mode    = this._kwColor(kwRule) ? (kwRule.color_mode || 'border') : (this._entityColor(ev) ? 'block' : null);
        const renamed = this._applyRename(ev, kwRule);
        const displayTitle = renamed || ev.summary || t.no_title;
        const loc      = (ev.location || '').trim();
        const rawNotes = (ev.description || '').replace(/<[^>]+>/g,'').trim();
        const teacher  = (ev._teacher || '').trim();
        const showLoc  = this._config.show_location !== false && loc;
        const showNote = this._config.show_notes !== false && rawNotes && height > (teacher ? 72 : 58);
        const showDescInd = this._config.show_description_indicator === true && !!rawNotes;
        let sty = `top:${top}px;height:${height}px;left:${colLeft};width:${colW};`;
        if (rgb) {
          const { r, g, b } = rgb;
          if (mode === 'block') {
            sty += `background:rgba(${r},${g},${b},.11);border-left-color:rgba(${r},${g},${b},${isCurr?.92:.62});`;
            if (isCurr) sty += `box-shadow:0 6px 20px rgba(${r},${g},${b},.2);`;
          } else {
            sty += `background:transparent;border-left-color:rgba(${r},${g},${b},${isCurr?1:.75});`;
            if (isCurr) sty += `box-shadow:0 4px 14px rgba(${r},${g},${b},.14);`;
          }
        } else if (isCurr) {
          sty += `background:rgba(var(--rgb-primary-color,3,169,244),.13);border-left-color:var(--primary-color,#03a9f4);`;
        }
        const evData = JSON.stringify({ s: ev.start, e: ev.end, sum: ev.summary, loc: ev.location, desc: ev.description, eid: ev._entityId, tch: ev._teacher });
        return `<div class="ev${isCurr?' now':''}" style="${sty}" data-ev="${tcEsc(evData)}">
          ${isCurr?`<div class="now-badge"></div>`:''}
          <div class="ev-title">${tcEsc(displayTitle)}</div>
          ${teacher?`<div class="ev-teacher">${tcEsc(teacher)}</div>`:''}
          ${showLoc?`<div class="ev-loc">📍 ${tcEsc(loc)}</div>`:''}
          ${showNote?`<div class="ev-notes">${tcEsc(rawNotes.substring(0,80))}${rawNotes.length>80?'…':''}</div>`:''}
          ${showDescInd?`<div class="ev-desc-ind">ⓘ</div>`:''}
        </div>`;
      }).join('');

      return `<div class="d-col">${gLines}${nowLine}${evBlocks}${hintTop}${hintBot}</div>`;
    }).join('');

    this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>
      ${hdrHTML}${allDayHTML}${dhHTML}
      <div class="tt-scroll"><div class="tt-body">
        ${timeLeft?`<div class="t-col l">${tLabels}</div>`:''}
        <div class="days-area">${dCols}</div>
        ${!timeLeft?`<div class="t-col r">${tLabels}</div>`:''}
      </div></div>
      ${fabHTML}
    </ha-card>`;

    this._bindNav();
    this._bindEvents();
  }

  _bindNav() {
    const s = this.shadowRoot;
    s.getElementById('prev-btn')?.addEventListener('click', () => {
      if (this._wdMode() === 'dynamic') this._dayOffset -= Math.max(1, parseInt(this._config.dynamic_count) || 1);
      else this._weekOffset--;
      this._lastFetchKey = null; this._fetchEvents(); this._render();
    });
    s.getElementById('next-btn')?.addEventListener('click', () => {
      if (this._wdMode() === 'dynamic') this._dayOffset += Math.max(1, parseInt(this._config.dynamic_count) || 1);
      else this._weekOffset++;
      this._lastFetchKey = null; this._fetchEvents(); this._render();
    });
    s.getElementById('today-btn')?.addEventListener('click', () => {
      if (this._wdMode() === 'dynamic') {
        if (this._dayOffset === 0) return;
        this._dayOffset = 0;
      } else {
        const home = this._computeHomeOffset();
        if (this._weekOffset === home) return;
        this._weekOffset = home; this._homeOffsetCache = home;
      }
      this._lastFetchKey = null; this._fetchEvents(); this._render();
    });
    s.getElementById('ref-btn')?.addEventListener('click', () => {
      Object.values(this._webuntisState).forEach(st => { st.failed = false; });
      this._lastFetchKey = null; this._fetchEvents(true); this._refreshWebuntisAnchor(true);
    });
    s.getElementById('ce-fab-btn')?.addEventListener('click', () => this._openCreateEventDialog());
    s.getElementById('cf-btn')?.addEventListener('click', () => this._openCalFilter());
  }

  _bindEvents() {
    this.shadowRoot.querySelectorAll('.ev[data-ev]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          const raw = JSON.parse(el.dataset.ev);
          const synthetic = {
            start: raw.s, end: raw.e, summary: raw.sum,
            location: raw.loc, description: raw.desc, _entityId: raw.eid, _teacher: raw.tch
          };
          this._openPopup(synthetic);
        } catch {}
      });
    });
    this.shadowRoot.querySelectorAll('.allday-chip[data-evid]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          const raw = JSON.parse(el.dataset.evid);
          const synthetic = {
            start: raw.s, end: raw.e, summary: raw.sum,
            location: raw.loc, description: raw.desc, _entityId: raw.eid, _teacher: raw.tch
          };
          this._openPopup(synthetic);
        } catch {}
      });
    });
  }
}
customElements.define('timetable-card', TimetableCard);

// Pre-load English as fallback so the card renders immediately on first paint
tcLoadStrings(TC_STRINGS_FALLBACK);

console.info(
  `%c TIMETABLE-CARD %c v${TC_VERSION} `,
  'background:#1565C0;color:#fff;padding:2px 8px;border-radius:4px 0 0 4px;font-weight:700;font-size:11px',
  'background:#37474F;color:#fff;padding:2px 8px;border-radius:0 4px 4px 0;font-size:11px'
);
