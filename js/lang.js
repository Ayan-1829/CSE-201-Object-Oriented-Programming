/* ===================== lang.js : English / Bengali for slide text =====================
   The same file is used by every course site (CSE-201, CSE-202, CSE-203, CSE-308, CSE-309).
   Load it after slides.js on a deck page. It adds a "বাংলা / English" button to the deck bar
   (keyboard: L). The choice is remembered for all course sites.

   Translations live in js/i18n/bn/<page>.js (one file per deck, loaded only when Bengali is chosen)
   and js/i18n/bn/common.js (buttons and labels shared by the whole site). Each file calls
     I18N_BN_ADD({ "<English HTML>": "<Bengali HTML>", ... })
   The key is a run of text: the text and inline tags (b, i, code, a, sub, …) between two block
   elements, with whitespace collapsed. Code blocks, diagrams, formulas and inputs are never changed.
   Text without a translation stays in English. */
(function () {
  const KEY = 'course-lang';
  const deck = document.querySelector('.deck');
  if (!deck) return;
  const me = document.currentScript && document.currentScript.src || '';
  const BASE = me.replace(/lang\.js(\?.*)?$/, '') + 'i18n/bn/';
  const PAGE = decodeURIComponent((location.pathname.split('/').pop() || '').replace(/\.html?$/, ''));

  const DICT = Object.create(null), PATTERNS = [];
  window.I18N_BN_ADD = (o) => { for (const k in o) DICT[k] = o[k]; };
  /* for text with changing numbers: I18N_BN_PATTERNS([[/^Step (\d+) of (\d+)$/, 'ধাপ $1 / $2'], ...]) */
  window.I18N_BN_PATTERNS = (list) => { list.forEach((p) => PATTERNS.push(p)); };
  const look = (k) => {
    if (DICT[k] != null) return DICT[k];
    for (const [re, to] of PATTERNS) if (re.test(k)) return k.replace(re, to);
    /* a slide split by the layout pass is titled "… (cont.)": translate the title, then the suffix */
    const c = / \(cont\.\)$/.exec(k);
    if (c) { const base = look(k.slice(0, c.index)); if (base != null) return base + ' (চলমান)'; }
    return null;
  };

  const INLINE = new Set(['A', 'ABBR', 'B', 'BR', 'CODE', 'EM', 'I', 'KBD', 'MARK', 'Q', 'S', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'VAR', 'WBR', 'TIME', 'LABEL']);
  const BLOCKISH = 'div,p,ul,ol,li,table,section,figure,pre,svg,h1,h2,h3,h4,h5,h6,details,button,input,select,textarea';
  const SKIP = '#btn-lang,pre,script,style,svg,textarea,input,select,option,noscript,canvas,math,iframe,.console,.console-body,.katex,.tex-page,.uml-out,.topic-art,.tart,.cn,.i18n,[data-no-i18n],.anno-wrap,#annoOverlay';
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
  const ser = (n) => (n.nodeType === 3 ? esc(n.textContent) : n.outerHTML);
  /* a run is worth translating if it has a word outside <code>/<kbd> */
  const hasWords = (html) => /[A-Za-z]{2,}/.test(html.replace(/<(code|kbd)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' '));
  const isInline = (n) => n.nodeType === 3 || (n.nodeType === 1 && INLINE.has(n.tagName) && !n.matches(SKIP) && !n.querySelector(BLOCKISH));

  /* runs of inline content under root: [{nodes, key, parent}] */
  function collect(root, out) {
    out = out || [];
    if (root.nodeType !== 1 || root.matches(SKIP)) return out;
    let run = [];
    const flush = () => {
      if (!run.length) return;
      /* only elements, no text of its own (links, labels, chips side by side): key each element by its content */
      if (!run.some((n) => n.nodeType === 3 && n.textContent.trim())) { const els = run.filter((n) => n.nodeType === 1); run = []; els.forEach((e) => collect(e, out)); return; }
      const key = norm(run.map(ser).join(''));
      if (hasWords(key)) out.push({ nodes: run, key, parent: root });
      run = [];
    };
    for (const c of Array.from(root.childNodes)) {
      if (c.nodeType === 8) continue;
      if (isInline(c)) run.push(c);
      else { flush(); if (c.nodeType === 1) collect(c, out); }
    }
    flush();
    return out;
  }

  /* the Bengali font goes in front of the generic family of whatever font the text already uses */
  const fontCache = new Map();
  function fontFor(el) {
    const ff = getComputedStyle(el.nodeType === 1 ? el : el.parentElement).fontFamily || '';
    if (fontCache.has(ff)) return fontCache.get(ff);
    const serif = /(^|,)\s*serif\s*$/i.test(ff) || /Literata|Georgia|Times/i.test(ff.split(',')[0]);
    const bn = serif ? "'Noto Serif Bengali','Noto Sans Bengali'" : "'Noto Sans Bengali'";
    const m = /,\s*(serif|sans-serif|monospace|system-ui|ui-monospace|cursive)\s*$/i.exec(ff);
    const out = m ? ff.slice(0, m.index) + ', ' + bn + ', ' + m[1] : (ff ? ff + ', ' : '') + bn;
    fontCache.set(ff, out);
    return out;
  }
  const ORIG = new WeakMap();
  function span(html, parent) {
    const s = document.createElement('span');
    s.className = 'i18n'; s.lang = 'bn'; s.innerHTML = html; s.style.fontFamily = fontFor(parent);
    return s;
  }
  function swap(nodes, s) {
    nodes[0].parentNode.insertBefore(s, nodes[0]);
    nodes.forEach((n) => n.remove());
    ORIG.set(s, nodes);
  }
  /* no whole-run translation: try each text node on its own (keeps surrounding markup) */
  function granular(n, parent) {
    if (n.nodeType === 3) {
      const raw = n.textContent, k = norm(esc(raw));
      const t = k && hasWords(k) ? look(k) : null;
      if (t == null) return;
      const s = span(t, parent), lead = /^\s/.test(raw) ? ' ' : '', trail = /\s$/.test(raw) ? ' ' : '';
      const nodes = [n];
      swap(nodes, s);
      if (lead) s.before(document.createTextNode(lead));
      if (trail) s.after(document.createTextNode(trail));
      s.dataset.pad = (lead ? 'l' : '') + (trail ? 't' : '');
    } else if (n.nodeType === 1 && !n.matches(SKIP)) Array.from(n.childNodes).forEach((c) => granular(c, n));
  }
  function translate(root) {
    collect(root).forEach((r) => {
      if (!r.nodes[0].parentNode) return;
      const t = look(r.key);
      if (t != null) swap(r.nodes, span(t, r.parent));
      else r.nodes.forEach((n) => granular(n, r.parent));
    });
  }
  function restore() {
    document.querySelectorAll('span.i18n').forEach((s) => {
      const nodes = ORIG.get(s);
      if (!nodes) return;
      if (s.dataset.pad) {
        if (s.dataset.pad.includes('l') && s.previousSibling && s.previousSibling.nodeType === 3 && s.previousSibling.textContent === ' ') s.previousSibling.remove();
        if (s.dataset.pad.includes('t') && s.nextSibling && s.nextSibling.nodeType === 3 && s.nextSibling.textContent === ' ') s.nextSibling.remove();
      }
      s.replaceWith(...nodes);
    });
  }
  const roots = () => [deck, document.getElementById('slide-menu'), document.querySelector('.deck-bar'), document.querySelector('.deck-foot')].filter(Boolean);

  /* quiz questions and answers come from JSON; their strings are keys too */
  function quizKeys() {
    const out = [];
    document.querySelectorAll('script.quiz-json').forEach((s) => {
      try { JSON.parse(s.textContent).forEach((q) => [q.q, ...(q.o || []), q.w].forEach((x) => { if (typeof x === 'string') { const k = norm(esc(x)); if (hasWords(k)) out.push(k); } })); } catch (e) { /* ignore */ }
    });
    return out;
  }
  /* step-by-step animations (demos-anim.js) show one step at a time: their texts are keys too */
  function animKeys() {
    const out = [];
    const add = (x) => { if (typeof x === 'string') { const k = norm(x); if (hasWords(k)) out.push(k); } };
    if (window.ANIM) Object.keys(window.ANIM).forEach((id) => {
      const a = window.ANIM[id]; add(a.title); add(a.sub);
      (a.steps || []).forEach((st) => { add(st.text); Object.keys(st.vars || {}).forEach((k) => { add(esc(k)); add(esc(String(st.vars[k]))); }); });
    });
    return out;
  }
  /* used by the extraction tool (_tools/i18n): every key on this page */
  window.I18N = { collect: () => { const set = new Set(); roots().forEach((r) => collect(r).forEach((x) => set.add(x.key))); quizKeys().forEach((k) => set.add(k)); animKeys().forEach((k) => set.add(k)); return Array.from(set); }, dict: DICT };

  /* translate what the slides' tools draw later (demos re-render, the quiz moves on) */
  let lang = 'en', busy = false, pending = new Set(), raf = 0;
  const mo = new MutationObserver((list) => {
    if (busy || lang !== 'bn') return;
    list.forEach((m) => { const t = m.type === 'characterData' ? m.target.parentElement : m.target; if (t && !t.closest('.i18n')) pending.add(t); });
    if (!raf) raf = requestAnimationFrame(flushPending);
  });
  function flushPending() {
    raf = 0; busy = true;
    const els = Array.from(pending).filter((el) => el.isConnected); pending = new Set();
    els.filter((el) => !els.some((o) => o !== el && o.contains(el))).forEach(translate);
    mo.takeRecords(); busy = false;
  }

  let loading = null;
  function load() {
    if (loading) return loading;
    if (!document.getElementById('bn-fonts')) {
      const l = document.createElement('link'); l.id = 'bn-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400..700&family=Noto+Serif+Bengali:wght@400..700&display=swap';
      document.head.appendChild(l);
    }
    const one = (src) => new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
    loading = Promise.all([one(BASE + 'common.js'), one(BASE + encodeURIComponent(PAGE) + '.js')]);
    return loading;
  }
  function paint() {
    if (!btn) return;
    btn.querySelector('span').textContent = lang === 'bn' ? 'English' : 'বাংলা';
    btn.setAttribute('aria-pressed', String(lang === 'bn'));
    btn.title = lang === 'bn' ? 'Show the slides in English (L)' : 'স্লাইড বাংলায় দেখুন (L)';
  }
  async function set(next, save) {
    lang = next;
    if (save) { try { localStorage.setItem(KEY, next); } catch (e) { /* storage unavailable */ } }
    paint();
    busy = true;
    if (next === 'bn') {
      await load();
      if (lang !== 'bn') { busy = false; return; }
      roots().forEach(translate);
      document.documentElement.setAttribute('data-lang', 'bn');
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    } else {
      mo.disconnect(); restore();
      document.documentElement.removeAttribute('data-lang');
    }
    mo.takeRecords(); busy = false;
  }

  let btn = null;
  const bar = document.querySelector('.deck-actions');
  if (bar) {
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn sm'; btn.id = 'btn-lang';
    btn.innerHTML = '<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h9M8.5 3v2M6 5c0 4 2.5 7 6 9M11 5c-.5 4-3 7.5-7 9.5"></path><path d="M13 21l4-9 4 9M14.5 18h5"></path></svg><span>বাংলা</span>';
    btn.addEventListener('click', () => set(lang === 'bn' ? 'en' : 'bn', true));
    bar.insertBefore(btn, bar.firstChild);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') && !(e.target && e.target.isContentEditable)) set(lang === 'bn' ? 'en' : 'bn', true);
  });
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  if (/[?&]lang=bn\b/.test(location.search)) saved = 'bn';
  paint();
  if (saved === 'bn') setTimeout(() => set('bn', false), 0);
})();
