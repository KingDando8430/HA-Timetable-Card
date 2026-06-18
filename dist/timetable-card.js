// ═══════════════════════════════════════════════════════════════════
// Home Assistant Timetable Card
// Author: KingDando8430
// https://github.com/KingDando8430/HA-Timetable-Card
// Version: 1.2.0
// ═══════════════════════════════════════════════════════════════════

const TC_VERSION = '1.2.0';

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'timetable-card',
  name: 'Timetable Card',
  description: 'Weekly timetable view for calendar entities',
  preview: true,
  documentationURL: 'https://github.com/KingDando8430/HA-Timetable-Card',
  getEntitySuggestion: (hass, entityId) => {
    if (entityId.split('.')[0] !== 'calendar') return null;
    return {
      config: { type: 'custom:timetable-card', entities: [{ id: entityId, color: null }] },
    };
  },
});

// ─── Translation loader ───────────────────────────────────────────
const TC_STRINGS_CACHE = {};
const TC_STRINGS_FALLBACK = 'en';

async function tcLoadStrings(lang) {
  if (TC_STRINGS_CACHE[lang]) return TC_STRINGS_CACHE[lang];
  const base = new URL(import.meta.url).pathname.replace(/\/[^/]+$/, '');
  try {
    const res = await fetch(`${base}/translations/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    TC_STRINGS_CACHE[lang] = await res.json();
    return TC_STRINGS_CACHE[lang];
  } catch {
    if (lang !== TC_STRINGS_FALLBACK) return tcLoadStrings(TC_STRINGS_FALLBACK);
    return null;
  }
}

function tcS(hass) {
  const lang = hass?.locale?.language || hass?.language || TC_STRINGS_FALLBACK;
  return TC_STRINGS_CACHE[lang] || TC_STRINGS_CACHE[TC_STRINGS_FALLBACK] || {};
}

// ─── Constants ──────────────────────────────────────────────────────
const TC_DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

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
  weekdays: [0, 1, 2, 3, 4, 5, 6],
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function tcEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function tcRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#','');
  const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  if (f.length !== 6) return null;
  return { r:parseInt(f.slice(0,2),16), g:parseInt(f.slice(2,4),16), b:parseInt(f.slice(4,6),16) };
}
function tcNormalizeEntities(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(e => typeof e === 'string' ? { id: e, color: null } : e);
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
  }

  setConfig(config) {
    if (config.entity && !config.entities) config = { ...config, entities: [config.entity] };
    this._config = { ...TC_DEFAULT, ...config };
    this._render();
  }

  set hass(h) {
    this._hass = h;
    if (this._pickerEl) this._pickerEl.hass = h;
    if (!this._rendered) {
      const lang = h?.locale?.language || h?.language || TC_STRINGS_FALLBACK;
      tcLoadStrings(lang).then(() => this._render());
    }
  }

  _dispatch(cfg) {
    this._config = cfg;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }
  _set(k, v) {
    this._dispatch({ ...this._config, [k]: v });
    if (k === 'keywords') this._renderKwList();
    if (k === 'entities') this._renderEntityList();
    if (k === 'weekdays') this._renderWeekdays();
  }

  // ── Entities ────────────────────────────────────────────────────
  _getEntities() { return tcNormalizeEntities(this._config.entities || []); }

  _addEntity(id) {
    if (!id) return;
    const ents = this._getEntities();
    if (ents.find(e => e.id === id)) return;
    this._set('entities', [...ents, { id, color: null }]);
    if (this._pickerEl) this._pickerEl.value = '';
  }

  _removeEntity(id) {
    this._set('entities', this._getEntities().filter(e => e.id !== id));
  }

  _setEntityColor(id, color) {
    this._set('entities', this._getEntities().map(e => e.id === id ? { ...e, color: color || null } : e));
  }

  _renderEntityList() {
    const el = this.shadowRoot.getElementById('entity-list');
    if (!el) return;
    const t    = tcS(this._hass);
    const ents = this._getEntities();
    el.innerHTML = ents.length
      ? ents.map(e => `
        <div class="ent-row" data-id="${tcEsc(e.id)}">
          <span class="ent-icon">📅</span>
          <span class="ent-id">${tcEsc(e.id)}</span>
          <div class="swatch${e.color?'':' no-col'}" style="background:${e.color||'transparent'}" title="${t.ent_color_title}">
            <input type="color" class="cpick ent-cpick" value="${e.color||'#03a9f4'}" data-id="${tcEsc(e.id)}" />
          </div>
          <button class="rm-btn ent-rm" data-id="${tcEsc(e.id)}" title="${t.ent_remove_title}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>`).join('')
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
  }

  // ── Keywords ────────────────────────────────────────────────────
  _addKw() {
    this._set('keywords', [...(this._config.keywords || []), {
      keyword: '', color: null, exact_match: true,
      color_mode: 'block', hidden: false, rename: '',
      rename_enabled: false, partial_rename_enabled: false,
      partial_rename_mode: 'keyword', partial_rename_text: ''
    }]);
  }
  _rmKw(i)      { const a = [...(this._config.keywords||[])]; a.splice(i,1); this._set('keywords', a); }
  _setKw(i,k,v) { const a = [...(this._config.keywords||[])]; a[i] = { ...a[i], [k]: v }; this._set('keywords', a); }

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
      const renameOn   = kw.rename_enabled === true;
      const partialOn  = renameOn && kw.partial_rename_enabled === true;
      const partMode   = kw.partial_rename_mode || 'keyword';
      return `
      <div class="kw-card">
        <div class="kw-r1">
          <input class="kw-in" placeholder="${t.kw_placeholder}" value="${tcEsc(kw.keyword||'')}" data-i="${i}" />
          <div class="swatch${kw.color?'':' no-col'}" style="background:${kw.color||'transparent'}">
            <input type="color" class="cpick kw-cpick" value="${kw.color||'#4CAF50'}" data-i="${i}" />
          </div>
          <button class="rm-btn kw-rm" data-i="${i}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
        <div class="kw-r2">
          <label class="kw-pill">
            <input type="checkbox" class="kw-chk" data-i="${i}" data-k="exact_match" ${kw.exact_match!==false?'checked':''} />
            <span>${t.kw_exact}</span>
          </label>
          <label class="kw-pill">
            <input type="checkbox" class="kw-chk" data-i="${i}" data-k="hidden" ${kw.hidden?'checked':''} />
            <span>${t.kw_hide}</span>
          </label>
          <div class="kw-seg">
            <button class="seg-sm${(kw.color_mode||'block')==='block'?' on':''}" data-i="${i}" data-v="block">${t.kw_block}</button>
            <button class="seg-sm${kw.color_mode==='border'?' on':''}" data-i="${i}" data-v="border">${t.kw_border}</button>
          </div>
        </div>
        <div class="kw-r2b">
          <button class="kw-tog${renameOn?' on':''}" data-i="${i}" data-type="rename">${t.kw_rename_btn}</button>
          ${renameOn ? `<button class="kw-tog${partialOn?' on':''}" data-i="${i}" data-type="partial">${t.kw_partial_btn}</button>` : ''}
        </div>
        ${renameOn ? `
        <div class="kw-r3">
          ${partialOn ? `
          <div class="kw-partial-wrap">
            <div class="kw-seg kw-pseg">
              <button class="seg-sm${partMode==='keyword'?' on':''}" data-i="${i}" data-pv="keyword">${t.kw_partial_kw}</button>
              <button class="seg-sm${partMode==='text'?' on':''}" data-i="${i}" data-pv="text">${t.kw_partial_text}</button>
            </div>
            ${partMode==='text' ? `<input class="kw-rename" placeholder="${t.kw_partial_ph}" value="${tcEsc(kw.partial_rename_text||'')}" data-i="${i}" data-field="partial_rename_text" />` : ''}
          </div>` : ''}
          <div class="kw-rename-row">
            <span class="kw-rlbl">${t.kw_rename_label}</span>
            <input class="kw-rename" placeholder="${t.kw_rename_ph}" value="${tcEsc(kw.rename||'')}" data-i="${i}" data-field="rename" />
          </div>
        </div>` : ''}
      </div>`;
    }).join('');

    el.querySelectorAll('.kw-in').forEach(e => {
      e.addEventListener('change', ev => this._setKw(+e.dataset.i, 'keyword', ev.target.value));
    });
    el.querySelectorAll('.kw-rename[data-field]').forEach(e => {
      e.addEventListener('change', ev => this._setKw(+e.dataset.i, e.dataset.field, ev.target.value));
    });
    el.querySelectorAll('.kw-cpick').forEach(e => {
      e.addEventListener('change', ev => {
        const v = ev.target.value;
        this._setKw(+e.dataset.i, 'color', v);
        e.parentElement.style.background = v;
        e.parentElement.classList.remove('no-col');
      });
    });
    el.querySelectorAll('.kw-chk').forEach(e => {
      e.addEventListener('change', ev => this._setKw(+e.dataset.i, e.dataset.k, ev.target.checked));
    });
    el.querySelectorAll('.seg-sm[data-v]').forEach(b => {
      b.addEventListener('click', () => this._setKw(+b.dataset.i, 'color_mode', b.dataset.v));
    });
    el.querySelectorAll('.seg-sm[data-pv]').forEach(b => {
      b.addEventListener('click', () => this._setKw(+b.dataset.i, 'partial_rename_mode', b.dataset.pv));
    });
    el.querySelectorAll('.kw-tog[data-type="rename"]').forEach(b => {
      b.addEventListener('click', () => {
        const cur = this._config.keywords[+b.dataset.i];
        const newVal = !cur.rename_enabled;
        const a = [...this._config.keywords];
        a[+b.dataset.i] = { ...cur, rename_enabled: newVal, partial_rename_enabled: newVal ? cur.partial_rename_enabled : false };
        this._set('keywords', a);
      });
    });
    el.querySelectorAll('.kw-tog[data-type="partial"]').forEach(b => {
      b.addEventListener('click', () => {
        const cur = this._config.keywords[+b.dataset.i];
        const a = [...this._config.keywords];
        a[+b.dataset.i] = { ...cur, partial_rename_enabled: !cur.partial_rename_enabled };
        this._set('keywords', a);
      });
    });
    el.querySelectorAll('.kw-rm').forEach(e => {
      e.addEventListener('click', () => this._rmKw(+e.dataset.i));
    });
  }

  // ── Weekdays ────────────────────────────────────────────────────
  _renderWeekdays() {
    const el = this.shadowRoot.getElementById('wd-row');
    if (!el) return;
    const t      = tcS(this._hass);
    const active = this._config.weekdays || TC_DAY_KEYS.map((_, i) => i);
    el.innerHTML = t.days.map((d, i) =>
      `<button class="wd-pill${active.includes(i)?' on':''}" data-i="${i}">${d.short}</button>`
    ).join('');
    el.querySelectorAll('.wd-pill').forEach(b => {
      b.addEventListener('click', () => {
        let wd = [...(this._config.weekdays || TC_DAY_KEYS.map((_, j) => j))];
        const i = +b.dataset.i;
        if (wd.includes(i)) { if (wd.length > 1) wd = wd.filter(x => x !== i); }
        else wd = [...wd, i].sort((a, b) => a - b);
        this._set('weekdays', wd);
      });
    });
  }

  // ── Full render ──────────────────────────────────────────────────
  _render() {
    this._rendered = true;
    const c   = this._config;
    const t   = tcS(this._hass);
    const ppm = c.px_per_min || 1.4;

    this.shadowRoot.innerHTML = `
<style>
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
#wd-row{display:flex;flex-wrap:wrap;gap:6px;padding:10px 15px 12px}
.wd-pill{padding:5px 10px;border-radius:20px;border:1.5px solid var(--divider-color,rgba(0,0,0,.16));background:none;color:var(--secondary-text-color);font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
.wd-pill.on{background:var(--primary-color,#03a9f4);border-color:var(--primary-color,#03a9f4);color:#fff}
#entity-list{padding:2px 15px 4px}
.ent-row{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.05))}
.ent-row:last-child{border-bottom:none}
.ent-icon{font-size:16px;line-height:1;flex-shrink:0}
.ent-id{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px;opacity:.85}
.picker-wrap{padding:6px 15px 10px;border-top:1px solid var(--divider-color,rgba(0,0,0,.06))}
#kw-list{padding:6px 15px 2px;display:flex;flex-direction:column;gap:10px}
.kw-card{background:var(--card-background-color,rgba(255,255,255,.6));border-radius:10px;overflow:hidden;border:1px solid var(--divider-color,rgba(0,0,0,.09))}
.kw-r1{display:flex;align-items:center;gap:8px;padding:9px 10px 8px}
.kw-in{flex:1;min-width:0;border:1px solid var(--divider-color,rgba(0,0,0,.14));border-radius:8px;background:var(--secondary-background-color,rgba(0,0,0,.03));padding:6px 10px;font-size:13.5px;color:var(--primary-text-color);outline:none;font-family:inherit}
.kw-in:focus{border-color:var(--primary-color,#03a9f4)}
.kw-r2{display:flex;align-items:center;gap:8px;padding:0 10px 8px;flex-wrap:wrap}
.kw-r2b{display:flex;align-items:center;gap:6px;padding:0 10px 8px;flex-wrap:wrap}
.kw-tog{padding:4px 11px;border-radius:20px;border:1.5px solid var(--divider-color,rgba(0,0,0,.16));background:none;color:var(--secondary-text-color);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
.kw-tog.on{background:rgba(var(--rgb-primary-color,3,169,244),.12);border-color:var(--primary-color,#03a9f4);color:var(--primary-color,#03a9f4)}
.kw-r3{display:flex;flex-direction:column;gap:6px;padding:8px 10px 9px;border-top:1px solid var(--divider-color,rgba(0,0,0,.06))}
.kw-partial-wrap{display:flex;flex-direction:column;gap:6px}
.kw-pseg{align-self:flex-start}
.kw-rename-row{display:flex;align-items:center;gap:8px}
.kw-rlbl{font-size:11px;font-weight:600;color:var(--secondary-text-color);opacity:.7;white-space:nowrap;flex-shrink:0}
.kw-rename{flex:1;min-width:0;border:1px solid var(--divider-color,rgba(0,0,0,.14));border-radius:8px;background:var(--secondary-background-color,rgba(0,0,0,.03));padding:5px 9px;font-size:13px;color:var(--primary-text-color);outline:none;font-family:inherit}
.kw-rename:focus{border-color:var(--primary-color,#03a9f4)}
label.kw-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:20px;border:1.5px solid var(--divider-color,rgba(0,0,0,.16));cursor:pointer;font-size:12.5px;font-weight:500;color:var(--secondary-text-color);font-family:inherit;transition:all .15s;user-select:none}
.kw-pill:has(input:checked){background:rgba(var(--rgb-primary-color,3,169,244),.12);border-color:var(--primary-color,#03a9f4);color:var(--primary-color,#03a9f4)}
.kw-pill input{display:none}
.kw-seg{display:flex;background:var(--secondary-background-color,rgba(120,120,128,.14));border-radius:8px;padding:2px;gap:1px;margin-left:auto}
.kw-r2b .kw-seg{margin-left:0}
.seg-sm{padding:3px 10px;border-radius:6px;border:none;background:none;font-size:11.5px;font-weight:500;cursor:pointer;color:var(--secondary-text-color);font-family:inherit;transition:all .14s;white-space:nowrap}
.seg-sm.on{background:var(--card-background-color,#fff);color:var(--primary-text-color);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.kw-footer{padding:8px 15px 10px;border-top:1px solid var(--divider-color,rgba(0,0,0,.06))}
.swatch{width:28px;height:28px;border-radius:7px;border:1.5px solid rgba(0,0,0,.14);overflow:hidden;position:relative;flex-shrink:0;cursor:pointer}
.swatch.no-col{background:repeating-conic-gradient(rgba(0,0,0,.07) 0% 25%, transparent 0% 50%) 0 0/8px 8px !important;border-style:dashed}
.cpick{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);opacity:0;cursor:pointer}
.ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 15px;background:none;border:1.5px solid var(--primary-color,#03a9f4);border-radius:20px;color:var(--primary-color,#03a9f4);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s}
.ghost:hover{background:rgba(var(--rgb-primary-color,3,169,244),.09)}
.rm-btn{background:none;border:none;cursor:pointer;color:var(--secondary-text-color);padding:5px;border-radius:6px;display:flex;align-items:center;opacity:.4;transition:opacity .15s,color .15s;flex-shrink:0}
.rm-btn:hover{opacity:1;color:var(--error-color,#f44336)}
.hint{font-size:13px;color:var(--secondary-text-color);padding:10px 0;opacity:.65;font-style:italic}
</style>

<span class="sec">${t.sec_calendar}</span>
<div class="box">
  <div id="entity-list"></div>
  <div class="picker-wrap" id="picker-wrap"></div>
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
  <div class="row" style="flex-direction:column;align-items:flex-start;padding-bottom:0">
    <div class="rl">${t.disp_weekdays}</div>
    <div id="wd-row"></div>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_loc}</div><div class="rs">${t.disp_loc_sub}</div></div>
    <ha-switch id="sw-loc" ${c.show_location!==false?'checked':''}></ha-switch>
  </div>
  <div class="row">
    <div><div class="rl">${t.disp_notes}</div><div class="rs">${t.disp_notes_sub}</div></div>
    <ha-switch id="sw-notes" ${c.show_notes!==false?'checked':''}></ha-switch>
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
      this._pickerEl.allowCustomEntity = false;
      this._pickerEl.value = '';
      this._pickerEl.addEventListener('value-changed', e => { if (e.detail.value) this._addEntity(e.detail.value); });
      this.shadowRoot.getElementById('picker-wrap').appendChild(this._pickerEl);
    }

    const s = this.shadowRoot;
    s.getElementById('add-kw').addEventListener('click', () => this._addKw());
    s.getElementById('sw-loc').addEventListener('change', e => this._set('show_location', e.target.checked));
    s.getElementById('sw-notes').addEventListener('change', e => this._set('show_notes', e.target.checked));
    s.getElementById('time-int').addEventListener('change', e => this._set('time_interval', e.target.value));
    s.getElementById('ref-int').addEventListener('change', e => this._set('refresh_interval', e.target.value));
    s.getElementById('ppm-in').addEventListener('change', e => this._set('px_per_min', parseFloat(e.target.value) || 1.4));
    s.querySelectorAll('.seg-o').forEach(b => b.addEventListener('click', () => this._set('time_position', b.dataset.v)));

    this._renderEntityList();
    this._renderKwList();
    this._renderWeekdays();
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
    this._hass    = null;
    this._weekOffset   = 0;
    this._clockTimer   = null;
    this._refreshTimer = null;
    this._lastFetchKey = null;
    this._popup        = null;
  }

  static getConfigElement() { return document.createElement('timetable-card-editor'); }

  static getStubConfig(hass) {
    const cals = hass
      ? Object.keys(hass.states).filter(e => e.startsWith('calendar.')).slice(0, 2)
      : [];
    return { ...TC_DEFAULT, entities: cals.map(id => ({ id, color: null })) };
  }

  getCardSize() { return 10; }
  getGridOptions() {
    return { columns: 12, rows: 10, min_columns: 5, min_rows: 5 };
  }

  setConfig(cfg) {
    if (cfg.entity && !cfg.entities) cfg = { ...cfg, entities: [cfg.entity] };
    const changed = JSON.stringify(cfg.entities) !== JSON.stringify(this._config.entities);
    this._config = { ...TC_DEFAULT, ...cfg };
    if (changed) { this._events = []; this._lastFetchKey = null; if (this._hass) this._fetchEvents(); }
    this._setupRefresh();
    this._render();
  }

  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    if (first) {
      const lang = h?.locale?.language || h?.language || TC_STRINGS_FALLBACK;
      tcLoadStrings(lang).then(() => {
        this._fetchEvents();
        this._setupRefresh();
        this._clockTimer = setInterval(() => this._render(), 30_000);
        this._render();
      });
    }
  }

  disconnectedCallback() {
    clearInterval(this._clockTimer);
    clearInterval(this._refreshTimer);
    this._closePopup();
  }

  _setupRefresh() {
    clearInterval(this._refreshTimer);
    const ri   = this._config.refresh_interval;
    const mins = (!ri || ri === 'auto') ? 10 : (parseInt(ri) || 10);
    this._refreshTimer = setInterval(() => { this._lastFetchKey = null; this._fetchEvents(); }, mins * 60_000);
  }

  _getEntities() { return tcNormalizeEntities(this._config.entities || []); }

  _weekRange() {
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
    const { monday } = this._weekRange();
    const sel = this._config.weekdays || TC_DAY_KEYS.map((_, i) => i);
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

  async _fetchEvents() {
    const ents = this._getEntities();
    if (!ents.length || !this._hass) return;
    const { monday, end } = this._weekRange();
    const key = `${ents.map(e=>e.id).join(',')}|${monday.toISOString()}`;
    if (this._lastFetchKey === key) return;
    this._lastFetchKey = key;
    this._loading = true;
    this._render();
    try {
      const results = await Promise.all(
        ents.map(e =>
          this._hass.callApi('GET',
            `calendars/${e.id}?start=${encodeURIComponent(monday.toISOString())}&end=${encodeURIComponent(end.toISOString())}`)
          .then(res => (Array.isArray(res) ? res : []).map(ev => ({ ...ev, _entityId: e.id })))
          .catch(() => [])
        )
      );
      this._events = results.flat();
      this._error  = null;
    } catch (err) {
      this._error  = err.message || String(err);
      this._events = [];
    }
    this._loading = false;
    this._render();
  }

  _isAllDay(ev) { return !!(ev.start && ev.start.date && !ev.start.dateTime); }
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
    const s = new Date(ev.start.date), e = new Date(ev.end.date);
    const d0 = new Date(day); d0.setHours(0,0,0,0);
    const d1 = new Date(d0); d1.setDate(d0.getDate()+1);
    return s < d1 && e > d0;
  }

  _applyRename(ev, kwRule) {
    if (!kwRule || !kwRule.rename_enabled || !kwRule.rename) return null;
    const title = ev.summary || '';
    if (!kwRule.partial_rename_enabled) return kwRule.rename;
    const mode = kwRule.partial_rename_mode || 'keyword';
    if (mode === 'keyword') {
      const re = new RegExp(kwRule.keyword.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
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
    for (const kw of (this._config.keywords || [])) {
      if (!kw.keyword) continue;
      const exact = kw.exact_match !== false;
      const match = exact
        ? title.toLowerCase() === kw.keyword.toLowerCase()
        : `${title} ${desc}`.toLowerCase().includes(kw.keyword.toLowerCase());
      if (match) return kw;
    }
    return null;
  }
  _entityColor(ev) {
    const ent = this._getEntities().find(e => e.id === ev._entityId);
    return ent?.color || null;
  }
  _eventColor(ev) {
    const kwRule = this._matchKw(ev);
    return kwRule?.color || this._entityColor(ev) || null;
  }
  _boundaries(timedEvs) {
    const set = new Set();
    timedEvs.forEach(ev => {
      const s = this._edt(ev,'start'), e = this._edt(ev,'end');
      if (s) set.add(this._toMin(s));
      if (e) set.add(this._toMin(e));
    });
    if (!set.size) return [];
    const iv = this._config.time_interval;
    if (iv && iv !== 'event_based') {
      const step = parseInt(iv) || 15;
      const arr  = Array.from(set).sort((a,b) => a-b);
      for (let t = arr[0]; t <= arr[arr.length-1]; t += step) set.add(t);
    }
    return Array.from(set).sort((a,b) => a-b);
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
    if (loc)     rows += `<div class="pd-row"><div class="pd-ico">📍</div><div class="pd-val">${tcEsc(loc)}</div></div>`;
    if (rawDesc) rows += `<div class="pd-row"><div class="pd-ico">📝</div><div class="pd-val pd-desc">${tcEsc(rawDesc)}</div></div>`;
    if (calId)   rows += `<div class="pd-row"><div class="pd-ico">📅</div><div class="pd-val pd-cal">${tcEsc(calId)}</div></div>`;

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

  _render() {
    const t        = tcS(this._hass);
    const days     = this._weekDays(t);
    const { monday } = this._weekRange();
    const now      = new Date();
    const weekNum  = this._weekNum(monday);
    const timeLeft = this._config.time_position !== 'right';
    const ppm      = parseFloat(this._config.px_per_min) || 1.4;

    const allDayEvs = this._events.filter(ev =>  this._isAllDay(ev));
    const timedEvs  = this._events.filter(ev => !this._isAllDay(ev));
    const hasAllDay = allDayEvs.length > 0;

    const bounds = this._boundaries(timedEvs);
    const minT   = bounds.length ? bounds[0] : 480;
    const maxT   = bounds.length ? bounds[bounds.length-1] : 960;
    const bodyH  = bounds.length ? (maxT - minT) * ppm + PADDING_TOP + PADDING_BOT : 200;

    const byDay = days.map(day =>
      timedEvs.filter(ev => { const s = this._edt(ev,'start'); return s && s.toDateString()===day.date.toDateString(); })
    );

    const isCurrentWeek = this._weekOffset === 0;

    const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{display:block;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Roboto',sans-serif;-webkit-font-smoothing:antialiased}
ha-card{overflow:hidden;border-radius:var(--ha-card-border-radius,16px)}
.hdr{display:flex;align-items:center;gap:9px;padding:10px 13px 9px;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.08));background:var(--card-background-color);z-index:10;user-select:none}
.hdr-ico{width:31px;height:31px;border-radius:8px;background:var(--primary-color,#03a9f4);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(var(--rgb-primary-color,3,169,244),.32)}
.hdr-txt{flex:1;min-width:0}
.hdr-title{font-size:14.5px;font-weight:700;letter-spacing:-.3px;color:var(--primary-text-color);line-height:1.2}
.hdr-sub{font-size:11px;color:var(--secondary-text-color);margin-top:1px}
.nav-grp{display:flex;align-items:center;gap:1px}
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
.allday-days{flex:1;display:flex}
.allday-col{flex:1;min-width:0;padding:4px 3px;border-left:1px solid var(--divider-color,rgba(0,0,0,.06));display:flex;flex-direction:column;gap:2px}
.allday-col:first-child{border-left:none}
.allday-chip{font-size:9px;font-weight:600;padding:2px 5px;border-radius:5px;background:rgba(var(--rgb-primary-color,3,169,244),.12);color:var(--primary-color,#03a9f4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.5;cursor:pointer}
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
.t-lbl{position:absolute;left:0;right:0;text-align:center;font-size:8.5px;font-weight:500;color:var(--secondary-text-color);opacity:.55;transform:translateY(-50%);line-height:1;pointer-events:none;user-select:none;letter-spacing:.2px}
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
.ev-title{font-size:11px;font-weight:700;color:var(--primary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.35;letter-spacing:-.1px}
.ev-loc{font-size:9.5px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;line-height:1.2;opacity:.68}
.ev-notes{font-size:9px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;line-height:1.2;opacity:.38;font-style:italic}
.now-badge{position:absolute;top:4px;right:5px;width:5px;height:5px;border-radius:50%;background:var(--primary-color,#03a9f4);animation:pulse 2s ease-in-out infinite;flex-shrink:0}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.6)}}`;

    const mondayStr = `${monday.getDate()}. ${t.months[monday.getMonth()]} ${monday.getFullYear()}`;
    const hdrHTML = `<div class="hdr">
      <div class="hdr-ico">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
        </svg>
      </div>
      <div class="hdr-txt">
        <div class="hdr-title">${t.card_title}</div>
        <div class="hdr-sub">${t.week_prefix} ${weekNum} · ${mondayStr}</div>
      </div>
      <div class="nav-grp">
        <button class="nav-btn" id="prev-btn" title="${t.prev_week}">&lt;</button>
        <button class="today-btn${isCurrentWeek?' active':''}" id="today-btn" title="${t.today_btn}">${t.today_btn}</button>
        <button class="nav-btn" id="next-btn" title="${t.next_week}">&gt;</button>
      </div>
      <button class="ico-btn${this._loading?' spin':''}" id="ref-btn" title="${t.refresh}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>
    </div>`;

    const ents = this._getEntities();
    if (!ents.length) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state"><div class="state-ico">📋</div>${t.state_no_entity}<br><small>${t.state_no_entity_hint}</small></div></ha-card>`;
      this._bindNav(); return;
    }
    if (this._loading && !this._events.length) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state"><div class="state-ico">📅</div>${t.state_loading}</div></ha-card>`;
      this._bindNav(); return;
    }
    if (this._error) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state err"><div class="state-ico">⚠️</div>${tcEsc(this._error)}</div></ha-card>`;
      this._bindNav(); return;
    }
    if (!bounds.length && !hasAllDay) {
      this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>${hdrHTML}<div class="state"><div class="state-ico">🗓️</div>${t.state_no_events}</div></ha-card>`;
      this._bindNav(); return;
    }

    let allDayHTML = '';
    if (hasAllDay) {
      const cols = days.map(day => {
        const chips = allDayEvs.filter(ev => this._allDayOnDay(ev, day.date)).map(ev => {
          const kwRule = this._matchKw(ev);
          if (kwRule?.hidden) return '';
          const col = kwRule?.color || this._entityColor(ev);
          const sty = col ? `background:${col}22;color:${col}` : '';
          const renamed = this._applyRename(ev, kwRule);
          const label = renamed || ev.summary || t.all_day;
          return `<div class="allday-chip" style="${sty}" data-evid="${tcEsc(JSON.stringify({s:ev.start,e:ev.end,sum:ev.summary,loc:ev.location,desc:ev.description,eid:ev._entityId}))}">${tcEsc(label)}</div>`;
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
    const showNow = isCurrentWeek && nowMin >= minT && nowMin <= maxT;
    const nowTop  = (nowMin - minT) * ppm + PADDING_TOP;

    const dCols = days.map((day, di) => {
      const rawEvs  = byDay[di];
      const isToday = this._isToday(day.date);
      const gLines  = bounds.map(m => `<div class="g-line" style="top:${(m-minT)*ppm+PADDING_TOP}px"></div>`).join('');
      const nowLine = (isToday && showNow)
        ? `<div class="now-line" style="top:${nowTop}px"><div class="now-dot"></div></div>` : '';
      const visibleEvs = rawEvs.filter(ev => !this._matchKw(ev)?.hidden);
      const layout     = this._layoutDay(visibleEvs);

      const evBlocks = layout.map(({ ev, col, total }) => {
        const s = this._edt(ev,'start'), e = this._edt(ev,'end');
        if (!s || !e) return '';
        const sm = this._toMin(s), em = this._toMin(e);
        const top    = (sm - minT) * ppm + PADDING_TOP;
        const height = Math.max((em - sm) * ppm, 28);
        const isCurr = this._isCurrent(ev);
        const colGap = 2, pad = 2;
        const colW   = `calc(${100/total}% - ${colGap*(total-1)/total + pad*2}px)`;
        const colLeft = col === 0 ? `${pad}px` : `calc(${col*100/total}% + ${colGap*col/total}px)`;
        const kwRule  = this._matchKw(ev);
        const baseCol = kwRule?.color || this._entityColor(ev);
        const rgb     = baseCol ? tcRgb(baseCol) : null;
        const mode    = kwRule?.color ? (kwRule.color_mode || 'block') : (this._entityColor(ev) ? 'block' : null);
        const renamed = this._applyRename(ev, kwRule);
        const displayTitle = renamed || ev.summary || t.no_title;
        const loc      = (ev.location || '').trim();
        const rawNotes = (ev.description || '').replace(/<[^>]+>/g,'').trim();
        const showLoc  = this._config.show_location !== false && loc;
        const showNote = this._config.show_notes !== false && rawNotes && height > 58;
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
        const evData = JSON.stringify({ s: ev.start, e: ev.end, sum: ev.summary, loc: ev.location, desc: ev.description, eid: ev._entityId });
        return `<div class="ev${isCurr?' now':''}" style="${sty}" data-ev="${tcEsc(evData)}">
          ${isCurr?`<div class="now-badge"></div>`:''}
          <div class="ev-title">${tcEsc(displayTitle)}</div>
          ${showLoc?`<div class="ev-loc">📍 ${tcEsc(loc)}</div>`:''}
          ${showNote?`<div class="ev-notes">${tcEsc(rawNotes.substring(0,80))}${rawNotes.length>80?'…':''}</div>`:''}
        </div>`;
      }).join('');

      return `<div class="d-col">${gLines}${nowLine}${evBlocks}</div>`;
    }).join('');

    this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>
      ${hdrHTML}${allDayHTML}${dhHTML}
      <div class="tt-scroll"><div class="tt-body">
        ${timeLeft?`<div class="t-col l">${tLabels}</div>`:''}
        <div class="days-area">${dCols}</div>
        ${!timeLeft?`<div class="t-col r">${tLabels}</div>`:''}
      </div></div>
    </ha-card>`;

    this._bindNav();
    this._bindEvents();
  }

  _bindNav() {
    const s = this.shadowRoot;
    s.getElementById('prev-btn')?.addEventListener('click', () => {
      this._weekOffset--; this._lastFetchKey = null; this._fetchEvents(); this._render();
    });
    s.getElementById('next-btn')?.addEventListener('click', () => {
      this._weekOffset++; this._lastFetchKey = null; this._fetchEvents(); this._render();
    });
    s.getElementById('today-btn')?.addEventListener('click', () => {
      if (this._weekOffset === 0) return;
      this._weekOffset = 0; this._lastFetchKey = null; this._fetchEvents(); this._render();
    });
    s.getElementById('ref-btn')?.addEventListener('click', () => {
      this._lastFetchKey = null; this._fetchEvents();
    });
  }

  _bindEvents() {
    this.shadowRoot.querySelectorAll('.ev[data-ev]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          const raw = JSON.parse(el.dataset.ev);
          const synthetic = {
            start: raw.s, end: raw.e, summary: raw.sum,
            location: raw.loc, description: raw.desc, _entityId: raw.eid
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
            location: raw.loc, description: raw.desc, _entityId: raw.eid
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
