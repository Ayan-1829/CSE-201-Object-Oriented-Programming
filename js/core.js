/* ===================== core.js : shared helpers ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- light/dark theme toggle, shared by every page ---------- */
(function () {
  const KEY = 'oop-theme';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  function effective() {
    if (saved === 'dark' || saved === 'light') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function apply() {
    if (saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);
    else document.documentElement.removeAttribute('data-theme');
  }
  const SUN = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"></path>';
  const MOON = '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"></path>';
  function paint(btn) {
    const dark = effective() === 'dark', label = btn.querySelector('span'), icon = btn.querySelector('.btn-ic');
    if (label) label.textContent = dark ? 'Light mode' : 'Dark mode'; else btn.textContent = dark ? 'Light mode' : 'Dark mode';
    if (icon) icon.innerHTML = dark ? SUN : MOON;
    btn.setAttribute('aria-pressed', String(dark));
  }
  apply();
  const btn = document.getElementById('btn-theme');
  if (btn) {
    paint(btn);
    btn.addEventListener('click', () => {
      saved = effective() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, saved); } catch (e) { /* storage unavailable */ }
      apply(); paint(btn);
    });
  }
})();

function mk(ns, tag, attrs, kids) {
  const e = ns ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.slice(0, 2) === '--') e.style.setProperty(p, v[p]); else e.style[p] = v[p]; } }
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
const h = (tag, attrs, ...kids) => mk(false, tag, attrs, kids);
const sv = (tag, attrs, ...kids) => mk(true, tag, attrs, kids);
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

const App = {
  cleanups: [],
  onCleanup(fn) { this.cleanups.push(fn); },
  timer(fn, ms) { const id = setInterval(fn, ms); this.onCleanup(() => clearInterval(id)); return id; }
};

/* ---------- storage (localStorage guarded by try/catch) ---------- */
const Store = (() => {
  const KEY = 'oop-slides-v1';
  let mem = {};
  try { const raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw) || {}; } catch (e) { mem = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* storage unavailable */ } };
  return {
    get(k, d) { return mem[k] === undefined ? d : mem[k]; },
    set(k, v) { mem[k] = v; save(); },
    sub(k, id) { return (mem[k] || {})[id]; },
    setSub(k, id, v) { mem[k] = mem[k] || {}; mem[k][id] = v; save(); }
  };
})();
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

/* ---------- small utils ---------- */
const range = (n) => Array.from({ length: n }, (_, i) => i);
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- Java number formatting ---------- */
/* Java prints doubles with at least one decimal and switches to E-notation outside [1e-3, 1e7). */
function javaDouble(x) {
  if (Number.isNaN(x)) return 'NaN';
  if (x === Infinity) return 'Infinity';
  if (x === -Infinity) return '-Infinity';
  if (x === 0) return (Object.is(x, -0) ? '-0.0' : '0.0');
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e7) { const s = String(x); return /[.e]/.test(s) ? s : s + '.0'; }
  let [m, e] = x.toExponential().split('e');
  if (!m.includes('.')) m += '.0';
  return m + 'E' + (+e);
}
/* shortest decimal that round-trips through a 32-bit float, formatted the Java way */
function javaFloat(x) {
  const f = Math.fround(x);
  if (!Number.isFinite(f) || f === 0) return javaDouble(f);
  let s = String(f);
  for (let p = 1; p <= 9; p++) { const t = f.toPrecision(p); if (Math.fround(+t) === f) { s = String(+t); break; } }
  return javaDouble(+s);
}
const toJavaInt = (d) => (Number.isNaN(d) ? 0 : d >= 2147483647 ? 2147483647 : d <= -2147483648 ? -2147483648 : Math.trunc(d));
const int32 = (n) => n | 0;

/* ---------- widgets ---------- */
function tsw(label, init, onChange) {
  let v = init ? 1 : 0;
  const el = h('button', { type: 'button', class: 'tsw' + (v ? ' on' : ''), role: 'switch', 'aria-checked': String(!!v), 'aria-label': label },
    h('span', { class: 'track' }, h('span', { class: 'knob' })), label ? h('span', null, label) : null);
  const api = {
    el, get: () => v,
    set(x, silent) { v = x ? 1 : 0; el.classList.toggle('on', !!v); el.setAttribute('aria-checked', String(!!v)); if (!silent && onChange) onChange(v); }
  };
  el.addEventListener('click', () => api.set(v ? 0 : 1));
  return api;
}
function seg(options, value, onChange) {
  const opts = options.map((o) => (typeof o === 'object' ? o : { v: o, l: String(o) }));
  let cur = value;
  const btns = opts.map((o) => h('button', { type: 'button', class: o.v === cur ? 'on' : '', onclick: () => api.set(o.v) }, o.l));
  const el = h('div', { class: 'seg', role: 'group' }, btns);
  const api = {
    el, get: () => cur,
    set(v, silent) { cur = v; opts.forEach((o, i) => btns[i].classList.toggle('on', o.v === v)); if (!silent && onChange) onChange(v); }
  };
  return api;
}
function tabs(items, initial, render) {
  const body = h('div');
  const bar = h('div', { class: 'tabs', role: 'tablist' });
  let cl = [];
  const reg = (fn) => cl.push(fn);
  const closeAll = () => { cl.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); cl = []; };
  const btns = items.map((it) => h('button', { type: 'button', role: 'tab', onclick: () => sel(it.id) }, it.label));
  btns.forEach((b) => bar.append(b));
  function sel(id) {
    closeAll();
    items.forEach((it, i) => btns[i].classList.toggle('on', it.id === id));
    clear(body); render(id, body, reg);
  }
  const el = h('div', null, bar, body);
  sel(initial || items[0].id);
  return { el, sel };
}
function tableEl(headers, rows, cls) {
  return h('table', { class: cls || 'tt' },
    h('thead', null, h('tr', null, headers.map((x) => h('th', null, x)))),
    h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => (c && c.nodeType ? h('td', null, c) : h('td', null, c)))))));
}
function field(label, input) { return h('label', { class: 'fld' }, label, input); }
function numInput(value, attrs) { return h('input', Object.assign({ type: 'number', value: String(value), style: { width: '110px' } }, attrs || {})); }
function textInput(value, attrs) { return h('input', Object.assign({ type: 'text', value: String(value), autocomplete: 'off', spellcheck: 'false' }, attrs || {})); }
function selectEl(options, value, onChange) {
  const s = h('select', { onchange: () => onChange && onChange(s.value) }, options.map((o) => {
    const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o;
    return h('option', { value: v, selected: String(v) === String(value) }, l);
  }));
  return s;
}
/* a small console panel: api.set(text) */
function consoleEl(label) {
  const pre = h('pre', { class: 'console-body' });
  const el = h('div', { class: 'console' }, h('div', { class: 'console-h' }, label || 'Output'), pre);
  return { el, set(t) { pre.textContent = t; }, get: () => pre.textContent };
}
