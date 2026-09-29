/* ===================== annotate.js : slide markup layer ===================== */
/* Lets a teacher draw over the current slide during class: freehand pencil, a
   fading "highlighter" stroke, simple shapes (rectangle/circle/arrow), and an
   eraser. Nothing here touches slide content, the demos, or the quiz/checkers —
   it is a transparent SVG layer stacked on top of the slide, saved separately per
   slide in localStorage so markup survives a reload but never becomes part of the
   lesson itself.

   The tall "Page" button at the left of the toolbar opens a blank scratch page in a
   pop-up window, for quick working and sketches away from the slide. The page scrolls
   in both directions and grows as you draw near its edges; every other button (the
   tools, colours, undo/redo, Clear and the fade time) works on it exactly as on a slide.
   Each topic has its own page, saved like the slide notes. Esc or ✕ closes it.

   Shared by the course sites (CSE-201, CSE-203, CSE-308): the same file works in each.
   Only runs on slide-deck pages (a `.deck` element and the site's topic object:
   window.OOP_TOPIC, DLD_TOPIC or DP_TOPIC). Depends on core.js (h, sv, clear, lsGet, lsSet). */
(function () {
  const deck = document.querySelector('.deck');
  const TOPIC = window.DLD_TOPIC || window.OOP_TOPIC || window.DP_TOPIC;
  if (!deck || !TOPIC) return;
  const PREFIX = window.DLD_TOPIC ? 'dld' : window.OOP_TOPIC ? 'oop' : 'dp';
  const topicId = TOPIC.id || 0;
  const STORE_KEY = PREFIX + '-anno-' + topicId;
  const PAGE = 'page';            // the scratch page's key in the store (slides use their number)

  /* ----- persisted state: { [slideIndex | 'page']: Annotation[] } ----- */
  let store = {};
  try { store = JSON.parse(lsGet(STORE_KEY) || '{}') || {}; } catch (e) { store = {}; }
  let nextId = 1;
  Object.values(store).forEach((list) => list.forEach((a) => { if (a.id >= nextId) nextId = a.id + 1; }));

  function slideIndex() {
    const slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    const i = slides.findIndex((s) => s.classList.contains('active'));
    return i < 0 ? 1 : i + 1;
  }
  let onPage = false;                                  // true while the scratch page is open
  function key() { return onPage ? PAGE : slideIndex(); }
  function listFor(k) { return store[k] || (store[k] = []); }
  function currentList() { return listFor(key()); }
  function persist() { try { lsSet(STORE_KEY, JSON.stringify(store)); } catch (e) {} }

  /* ----- tool state ----- */
  const COLORS = ['#F5A524', '#3B6BB0', '#E0538A', '#39C08C', '#FF6B57', '#FFFFFF'];
  let tool = 'off';       // 'off' | 'select' | 'pencil' | 'highlight' | 'eraser' | 'rect' | 'circle' | 'arrow'
                          // 'off' and 'select' both leave the drawing layer non-interactive, so the slide
                          // (or the page) underneath keeps scrolling/touch/clicks working - 'select' just
                          // also keeps the toolbar open, for switching straight into a drawing tool.
  let drawColor = COLORS[0];
  let fadeSeconds = 4;
  try { fadeSeconds = +lsGet(PREFIX + '-anno-fade') || 4; } catch (e) {}
  let active = null;      // in-progress stroke/shape

  /* ----- undo/redo, kept per slide (and for the page) so undoing on slide 3 never touches slide 1 ----- */
  const undoStack = {}, redoStack = {};
  const MAX_HISTORY = 50;
  function snapshot() {
    const k = key();
    const stack = undoStack[k] || (undoStack[k] = []);
    stack.push(JSON.stringify(currentList()));
    if (stack.length > MAX_HISTORY) stack.shift();
    redoStack[k] = [];
    paintHistory();
  }
  function undo() {
    const k = key(), stack = undoStack[k];
    if (!stack || !stack.length) return;
    (redoStack[k] = redoStack[k] || []).push(JSON.stringify(currentList()));
    store[k] = JSON.parse(stack.pop());
    render(); persist(); paintHistory();
  }
  function redo() {
    const k = key(), stack = redoStack[k];
    if (!stack || !stack.length) return;
    (undoStack[k] = undoStack[k] || []).push(JSON.stringify(currentList()));
    store[k] = JSON.parse(stack.pop());
    render(); persist(); paintHistory();
  }
  function paintHistory() {
    const k = key();
    undoBtn.disabled = !(undoStack[k] && undoStack[k].length);
    redoBtn.disabled = !(redoStack[k] && redoStack[k].length);
  }

  /* ----- slide overlay SVG, stacked above the slides inside .deck ----- */
  const overlay = sv('svg', { id: 'annoOverlay', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
  deck.appendChild(overlay);

  /* Slide points are stored in the slide's own content coordinates, so a drawing stays on the thing it
     marks when the slide scrolls: x and y are both fractions of the deck WIDTH (the slide text
     scales with width, so marks stay near their content after a resize too), and y is measured
     from the top of the slide's scrolled content, not from the top of the screen. */
  function rect() { return deck.getBoundingClientRect(); }
  function activeSlide() { return deck.querySelector('.slide.active'); }
  function scrollY() { const s = activeSlide(); return s ? s.scrollTop : 0; }
  const SLIDE = {
    toPoint(cx, cy) { const r = rect(); return { x: (cx - r.left) / r.width, y: (cy - r.top + scrollY()) / r.width }; },
    local(cx, cy) { const r = rect(); return [cx - r.left, cy - r.top]; },
    px(fx) { return fx * rect().width; },
    py(fy) { return fy * rect().width - scrollY(); }
  };
  // notes saved before scroll-aware drawing used y as a fraction of the deck height, with no scroll offset
  (function migrate() {
    const r = rect(); if (!r.width || !r.height) return;
    let changed = false;
    Object.keys(store).forEach((k) => {
      if (k === PAGE) return;
      store[k].forEach((a) => {
        if (a.v === 2) return;
        a.points = a.points.map((p) => ({ x: p.x, y: p.y * r.height / r.width })); a.v = 2; changed = true;
      });
    });
    if (changed) persist();
  })();

  /* ----- the scratch page: a pop-up window with a large SVG inside a scroller ----- */
  const PAGE_MIN_W = 2400, PAGE_MIN_H = 1600, PAGE_EDGE = 300, PAGE_GROW = 800;
  const pageSvg = sv('svg', { class: 'anno-page-svg', width: PAGE_MIN_W, height: PAGE_MIN_H });
  const pageScroll = h('div', { class: 'anno-page-scroll' }, pageSvg);
  const pageClose = h('button', { type: 'button', class: 'anno-page-close', 'aria-label': 'Close the page', title: 'Close (Esc)' }, '✕');
  const pageWin = h('div', { class: 'anno-page', role: 'dialog', 'aria-label': 'Scratch page' },
    h('div', { class: 'anno-page-head' },
      h('b', null, 'Page'),
      h('span', { class: 'anno-page-hint' }, 'Draw with the tools in the toolbar · scroll or use Select to move around'),
      pageClose),
    pageScroll);
  document.body.appendChild(pageWin);
  let pageW = PAGE_MIN_W, pageH = PAGE_MIN_H;
  function sizePage(w, h2) {
    pageW = Math.max(pageW, Math.ceil(w)); pageH = Math.max(pageH, Math.ceil(h2));
    pageSvg.setAttribute('width', pageW); pageSvg.setAttribute('height', pageH);
  }
  function fitPageToDrawing() {
    let mx = 0, my = 0;
    listFor(PAGE).forEach((a) => a.points.forEach((p) => { mx = Math.max(mx, p.x); my = Math.max(my, p.y); }));
    sizePage(Math.max(PAGE_MIN_W, mx + PAGE_GROW), Math.max(PAGE_MIN_H, my + PAGE_GROW));
  }
  /* page points are plain pixels on the page, which scrolls natively */
  const PAGEC = {
    toPoint(cx, cy) { const r = pageSvg.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top }; },
    local(cx, cy) { const r = pageSvg.getBoundingClientRect(); return [cx - r.left, cy - r.top]; },
    px(v) { return v; },
    py(v) { return v; }
  };
  function coords() { return onPage ? PAGEC : SLIDE; }

  /* ===================== toolbar ===================== */
  const ICONS = {
    pencil: 'M3 21l3.6-.9L18.4 8.3a2 2 0 0 0 0-2.8l-1.9-1.9a2 2 0 0 0-2.8 0L1.9 15.4 1 19l2 2z M14 5l3 3',
    highlight: 'M9 11l6-6 4 4-6 6H9z M5 21l4-4-4-4-2 6z',
    eraser: 'M20 20H8l-5-5a2 2 0 0 1 0-2.8L12.2 3a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L13 18',
    rect: 'M4 5h16v14H4z',
    circle: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
    arrow: 'M4 20L20 4 M20 4h-6 M20 4v6',
    select: 'M4 3l6.5 16 2-6.5 6.5-2z',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
    undo: 'M9 14l-5-5 5-5 M4 9h11a5 5 0 1 1 0 10h-3',
    redo: 'M15 14l5-5-5-5 M20 9H9a5 5 0 1 0 0 10h3',
    page: 'M6 2h8l5 5v15H6z M14 2v5h5 M9 12h7 M9 16h7'
  };
  const icon = (d) => `<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;

  const toggleBtn = h('button', { type: 'button', class: 'anno-toggle', 'aria-pressed': 'false', title: 'Annotate this slide', html: icon(ICONS.pencil) });
  const bar = h('div', { class: 'anno-bar anno-has-page' });

  function toolBtn(name, d, label) {
    return h('button', { type: 'button', class: 'anno-tool', 'data-tool': name, title: label, 'aria-label': label, html: icon(d) });
  }
  const toolButtons = [
    toolBtn('select', ICONS.select, 'Select (leaves the slide itself scrollable/touchable)'),
    toolBtn('pencil', ICONS.pencil, 'Pencil'),
    toolBtn('highlight', ICONS.highlight, 'Highlighter (fades)'),
    toolBtn('rect', ICONS.rect, 'Rectangle'),
    toolBtn('circle', ICONS.circle, 'Circle'),
    toolBtn('arrow', ICONS.arrow, 'Arrow'),
    toolBtn('eraser', ICONS.eraser, 'Eraser')
  ];
  // Clear sits on this first line too, alongside the tools.
  const clearBtn = h('button', { type: 'button', class: 'anno-tool anno-clear', title: 'Clear this slide’s notes', html: icon(ICONS.trash) }, h('span', null, 'Clear'));
  const toolRow = h('div', { class: 'anno-row anno-justify' }, toolButtons.concat([clearBtn]));

  // Colour swatches sit in their own inner wrap so rebuilding them (on every colour pick)
  // never clears the fade control that shares this second line.
  const swatchWrap = h('div', { class: 'anno-swatches' });
  function buildColorRow() {
    clear(swatchWrap);
    COLORS.forEach((c) => {
      const sw = h('button', { type: 'button', class: 'anno-swatch' + (c.toLowerCase() === drawColor.toLowerCase() ? ' on' : ''), style: { '--sw': c }, 'aria-label': 'Colour ' + c, onclick: () => { drawColor = c; buildColorRow(); } });
      swatchWrap.append(sw);
    });
    const custom = h('input', { type: 'color', class: 'anno-swatch-custom', value: drawColor, title: 'Custom colour', oninput: (e) => { drawColor = e.target.value; } });
    swatchWrap.append(custom);
  }
  buildColorRow();

  const fadeInput = h('input', { type: 'number', min: '0.5', max: '30', step: '0.5', value: String(fadeSeconds), class: 'anno-fade-input', 'aria-label': 'Highlighter fade time in seconds', onchange: (e) => { fadeSeconds = Math.max(0.5, Math.min(30, +e.target.value || 4)); try { lsSet(PREFIX + '-anno-fade', String(fadeSeconds)); } catch (er) {} e.target.value = String(fadeSeconds); } });
  const fadeLabel = h('label', { class: 'anno-fade' }, 'Fade ', fadeInput, 's');

  // Undo/redo sit just to the left of the fade control.
  const undoBtn = h('button', { type: 'button', class: 'anno-tool anno-hist', title: 'Undo (⌘Z)', 'aria-label': 'Undo', html: icon(ICONS.undo), onclick: undo });
  const redoBtn = h('button', { type: 'button', class: 'anno-tool anno-hist', title: 'Redo (⌘⇧Z / ⌘Y)', 'aria-label': 'Redo', html: icon(ICONS.redo), onclick: redo });
  const histWrap = h('div', { class: 'anno-hist-wrap' }, undoBtn, redoBtn);

  const colorRow = h('div', { class: 'anno-row anno-justify anno-nowrap anno-colors' }, swatchWrap, histWrap, fadeLabel);

  // The Page button is two rows tall, at the left of both rows.
  const pageBtn = h('button', { type: 'button', class: 'anno-page-btn', 'aria-pressed': 'false', title: 'Open a blank page for quick drawing', 'aria-label': 'Page: open a blank page for quick drawing', html: icon(ICONS.page) + '<span>Page</span>' });
  bar.append(pageBtn, h('div', { class: 'anno-rows' }, toolRow, colorRow));
  const wrap = h('div', { class: 'anno-wrap' }, toggleBtn, bar);
  document.body.appendChild(wrap);

  function paintTool() {
    toolButtons.forEach((b) => b.classList.toggle('on', b.getAttribute('data-tool') === tool));
    const passThrough = tool === 'off' || tool === 'select';
    overlay.style.pointerEvents = passThrough || onPage ? 'none' : 'auto';
    overlay.style.cursor = tool === 'eraser' ? 'cell' : passThrough ? '' : 'crosshair';
    pageSvg.style.pointerEvents = passThrough ? 'none' : 'auto';
    pageSvg.style.cursor = tool === 'eraser' ? 'cell' : passThrough ? '' : 'crosshair';
    document.body.classList.toggle('anno-drawing', !passThrough);
    clearBtn.title = onPage ? 'Clear the page' : 'Clear this slide’s notes';
  }
  function setTool(name) {
    if (name === 'off' && onPage) closePage();
    tool = name;
    wrap.classList.toggle('open', name !== 'off');
    toggleBtn.setAttribute('aria-pressed', String(name !== 'off'));
    paintTool();
  }
  function openPage() {
    active = null;
    onPage = true;
    fitPageToDrawing();
    pageWin.classList.add('open');
    pageBtn.setAttribute('aria-pressed', 'true'); pageBtn.classList.add('on');
    if (tool === 'off' || tool === 'select') setTool('pencil'); else paintTool();   // ready to draw straight away
    render(); paintHistory();
  }
  function closePage() {
    active = null;
    onPage = false;
    pageWin.classList.remove('open');
    pageBtn.setAttribute('aria-pressed', 'false'); pageBtn.classList.remove('on');
    paintTool(); render(); paintHistory();
  }
  pageBtn.addEventListener('click', () => (onPage ? closePage() : openPage()));
  pageClose.addEventListener('click', closePage);
  // Opens straight into Select, not a drawing tool - the slide underneath (scrolling,
  // touch, the demos' own buttons) stays fully usable until a drawing tool is picked.
  toggleBtn.addEventListener('click', () => setTool(tool === 'off' ? 'select' : 'off'));
  toolButtons.forEach((b) => b.addEventListener('click', () => setTool(b.getAttribute('data-tool'))));
  clearBtn.addEventListener('click', () => {
    // Scoped to whatever is on screen right now - the page, or the current slide.
    if (!currentList().length) return;
    if (!window.confirm(onPage ? 'Clear everything on the page?' : 'Clear all notes on this slide?')) return;
    snapshot();
    store[key()] = [];
    persist();
    render();
  });
  // While the page is open, the slide keys (arrows, space, F, M, Home, End) must not move the deck behind it.
  window.addEventListener('keydown', (e) => {
    if (!onPage || e.key === 'Escape' || e.metaKey || e.ctrlKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', ' ', 'Home', 'End', 'f', 'F', 'm', 'M'].indexOf(e.key) >= 0) e.stopPropagation();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && onPage) { closePage(); return; }
    if (e.key === 'Escape' && tool !== 'off') { setTool('off'); return; }
    if (tool === 'off') return; // only steal undo/redo while the annotation toolbar is actually open
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; // don't hijack native undo in a text field
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  });

  /* ===================== drawing / erasing ===================== */
  function distSeg(px0, py0, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px0 - x1) * dx + (py0 - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px0 - (x1 + t * dx), py0 - (y1 + t * dy));
  }
  function shapeDist(a, x, y, C) {
    const [p1, p2] = a.points, x1 = C.px(p1.x), y1 = C.py(p1.y), x2 = C.px(p2.x), y2 = C.py(p2.y);
    if (a.kind === 'arrow') return distSeg(x, y, x1, y1, x2, y2);
    if (a.kind === 'circle') { const r = Math.hypot(x2 - x1, y2 - y1); return Math.abs(Math.hypot(x - x1, y - y1) - r); }
    const rx1 = Math.min(x1, x2), rx2 = Math.max(x1, x2), ry1 = Math.min(y1, y2), ry2 = Math.max(y1, y2);
    return Math.min(distSeg(x, y, rx1, ry1, rx2, ry1), distSeg(x, y, rx2, ry1, rx2, ry2), distSeg(x, y, rx2, ry2, rx1, ry2), distSeg(x, y, rx1, ry2, rx1, ry1));
  }
  function eraseNear(cx, cy) {
    const C = coords(), [x, y] = C.local(cx, cy);
    const list = currentList();
    const before = list.length;
    store[key()] = list.filter((a) => {
      if (a.kind === 'rect' || a.kind === 'circle' || a.kind === 'arrow') return !(shapeDist(a, x, y, C) < 12);
      return !a.points.some((p) => Math.hypot(C.px(p.x) - x, C.py(p.y) - y) < 12);
    });
    if (store[key()].length !== before) { render(); persist(); }
  }

  let erasing = false;
  function onDown(e) {
    if (tool === 'off' || tool === 'select') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'eraser') { snapshot(); erasing = true; eraseNear(e.clientX, e.clientY); return; }
    const f = coords().toPoint(e.clientX, e.clientY);
    snapshot();
    active = { id: nextId++, v: 2, kind: (tool === 'rect' || tool === 'circle' || tool === 'arrow') ? tool : undefined, temp: tool === 'highlight', points: [f, f], color: drawColor, createdAt: Date.now() };
  }
  function onMove(e) {
    if (tool === 'eraser' && erasing) { eraseNear(e.clientX, e.clientY); return; }
    if (!active) return;
    const f = coords().toPoint(e.clientX, e.clientY);
    if (active.kind) active.points[1] = f; else active.points.push(f);
    if (onPage && (f.x > pageW - PAGE_EDGE || f.y > pageH - PAGE_EDGE)) sizePage(f.x > pageW - PAGE_EDGE ? pageW + PAGE_GROW : pageW, f.y > pageH - PAGE_EDGE ? pageH + PAGE_GROW : pageH);
    render();
  }
  function finishGesture() {
    if (active && active.points.length > 1) { active.createdAt = Date.now(); currentList().push(active); persist(); }
    active = null; erasing = false; render();
  }
  [overlay, pageSvg].forEach((el) => {
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', finishGesture);
    el.addEventListener('pointercancel', finishGesture);
  });
  // while a drawing tool is active the overlay sits on top of the slide, so pass the mouse wheel /
  // trackpad scroll through to the slide underneath (the drawings follow via the scroll listener below)
  overlay.addEventListener('wheel', (e) => { const s = activeSlide(); if (s) s.scrollTop += e.deltaY; }, { passive: true });

  /* ===================== render ===================== */
  const FADE_TAIL = 1.2; // seconds - highlighter strokes always fade out over this long
  function draw(svg, list, C) {
    clear(svg);
    list.forEach((a) => {
      if (a.kind === 'rect' || a.kind === 'circle' || a.kind === 'arrow') {
        const [p1, p2] = a.points, x1 = C.px(p1.x), y1 = C.py(p1.y), x2 = C.px(p2.x), y2 = C.py(p2.y);
        if (a.kind === 'rect') svg.append(sv('rect', { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), class: 'anno-shape', stroke: a.color }));
        else if (a.kind === 'circle') svg.append(sv('circle', { cx: x1, cy: y1, r: Math.hypot(x2 - x1, y2 - y1), class: 'anno-shape', stroke: a.color }));
        else {
          const ang = Math.atan2(y2 - y1, x2 - x1), hl = 12, hs = 0.45;
          svg.append(sv('line', { x1, y1, x2, y2, class: 'anno-shape', stroke: a.color }));
          svg.append(sv('polyline', { points: `${x2 - hl * Math.cos(ang - hs)},${y2 - hl * Math.sin(ang - hs)} ${x2},${y2} ${x2 - hl * Math.cos(ang + hs)},${y2 - hl * Math.sin(ang + hs)}`, fill: 'none', class: 'anno-shape', stroke: a.color }));
        }
        return;
      }
      if (a.points.length < 2) return;
      const d = 'M ' + a.points.map((p) => `${C.px(p.x)},${C.py(p.y)}`).join(' L ');
      let opacity = 1;
      if (a.temp && a !== active) {
        const age = (Date.now() - a.createdAt) / 1000;
        const fadeStart = Math.max(0, fadeSeconds - FADE_TAIL);
        if (age > fadeStart) opacity = Math.max(0, 1 - (age - fadeStart) / (fadeSeconds - fadeStart));
      }
      const strokeEl = sv('path', { d, class: 'anno-stroke' + (a.temp ? ' anno-temp' : ''), stroke: a.color, opacity, fill: 'none' });
      if (a.temp) strokeEl.style.setProperty('--glow', a.color);
      svg.append(strokeEl);
    });
  }
  function render() {
    const slideList = listFor(slideIndex());
    draw(overlay, !onPage && active ? slideList.concat([active]) : slideList, SLIDE);
    if (onPage) { const pl = listFor(PAGE); draw(pageSvg, active ? pl.concat([active]) : pl, PAGEC); }
  }

  /* fade ticker for highlighter strokes (on the slide and on the page) */
  setInterval(() => {
    let redraw = !!(active && active.temp);
    [slideIndex(), PAGE].forEach((k) => {
      const list = listFor(k), before = list.length;
      store[k] = list.filter((a) => !a.temp || (Date.now() - a.createdAt) < fadeSeconds * 1000);
      if (store[k].length !== before) { persist(); redraw = true; }
      if (store[k].some((a) => a.temp)) redraw = true;
    });
    if (redraw) render();
  }, 60);

  /* switch slides -> switch which annotation list (and undo/redo stack) is shown */
  let lastSlide = slideIndex();
  new MutationObserver(() => {
    const i = slideIndex();
    if (i !== lastSlide) { lastSlide = i; render(); paintHistory(); }
  }).observe(deck, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.addEventListener('resize', render);
  // scroll events don't bubble, so listen in the capture phase for any slide scrolling inside the deck
  deck.addEventListener('scroll', render, true);

  setTool('off');
  paintHistory();
  render();
})();
