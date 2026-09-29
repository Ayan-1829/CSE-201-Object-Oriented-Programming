/* ===================== annotate.js : slide markup layer ===================== */
/* Lets a teacher draw over the current slide during class: freehand pencil, a
   fading "highlighter" stroke, simple shapes (rectangle/circle/arrow), and an
   eraser. Nothing here touches slide content, the demos, or the quiz/checkers —
   it is a transparent SVG layer stacked on top of the slide, saved separately per
   slide in localStorage so markup survives a reload but never becomes part of the
   lesson itself.

   Only runs on slide-deck pages (anything with a `.deck` element and a
   `window.OOP_TOPIC`). Depends on core.js having already run (h, sv, lsGet, lsSet). */
(function () {
  const deck = document.querySelector('.deck');
  if (!deck || !window.OOP_TOPIC) return;
  const topicId = OOP_TOPIC.id || 0;
  const STORE_KEY = 'oop-anno-' + topicId;

  /* ----- persisted state: { [slideIndex]: Annotation[] } ----- */
  let store = {};
  try { store = JSON.parse(lsGet(STORE_KEY) || '{}') || {}; } catch (e) { store = {}; }
  let nextId = 1;
  Object.values(store).forEach((list) => list.forEach((a) => { if (a.id >= nextId) nextId = a.id + 1; }));

  function slideIndex() {
    const slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    const i = slides.findIndex((s) => s.classList.contains('active'));
    return i < 0 ? 1 : i + 1;
  }
  function currentList() { const k = slideIndex(); return store[k] || (store[k] = []); }
  function persist() { try { lsSet(STORE_KEY, JSON.stringify(store)); } catch (e) {} }

  /* ----- tool state ----- */
  const COLORS = ['#F5A524', '#3B6BB0', '#E0538A', '#39C08C', '#FF6B57', '#FFFFFF'];
  let tool = 'off';       // 'off' | 'select' | 'pencil' | 'highlight' | 'eraser' | 'rect' | 'circle' | 'arrow'
                          // 'off' and 'select' both leave the overlay non-interactive, so the slide
                          // underneath keeps scrolling/touch/clicks working - 'select' just also keeps
                          // the toolbar open, for switching straight into a drawing tool.
  let drawColor = COLORS[0];
  let fadeSeconds = 4;
  try { fadeSeconds = +lsGet('oop-anno-fade') || 4; } catch (e) {}
  let active = null;      // in-progress stroke/shape

  /* ----- undo/redo, kept per slide so undoing on slide 3 never touches slide 1 ----- */
  const undoStack = {}, redoStack = {}; // slideIndex -> array of JSON snapshots of that slide's list
  const MAX_HISTORY = 50;
  function snapshot() {
    const k = slideIndex();
    const stack = undoStack[k] || (undoStack[k] = []);
    stack.push(JSON.stringify(currentList()));
    if (stack.length > MAX_HISTORY) stack.shift();
    redoStack[k] = [];
    paintHistory();
  }
  function undo() {
    const k = slideIndex(), stack = undoStack[k];
    if (!stack || !stack.length) return;
    (redoStack[k] = redoStack[k] || []).push(JSON.stringify(currentList()));
    store[k] = JSON.parse(stack.pop());
    render(); persist(); paintHistory();
  }
  function redo() {
    const k = slideIndex(), stack = redoStack[k];
    if (!stack || !stack.length) return;
    (undoStack[k] = undoStack[k] || []).push(JSON.stringify(currentList()));
    store[k] = JSON.parse(stack.pop());
    render(); persist(); paintHistory();
  }
  function paintHistory() {
    const k = slideIndex();
    undoBtn.disabled = !(undoStack[k] && undoStack[k].length);
    redoBtn.disabled = !(redoStack[k] && redoStack[k].length);
  }

  /* ----- overlay SVG, stacked above the slides inside .deck ----- */
  const overlay = sv('svg', { id: 'annoOverlay', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
  deck.appendChild(overlay);

  function rect() { return deck.getBoundingClientRect(); }
  function toFrac(clientX, clientY) { const r = rect(); return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height }; }
  function px(fx) { return fx * rect().width; }
  function py(fy) { return fy * rect().height; }

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
    redo: 'M15 14l5-5-5-5 M20 9H9a5 5 0 1 0 0 10h3'
  };
  const icon = (d) => `<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;

  const toggleBtn = h('button', { type: 'button', class: 'anno-toggle', 'aria-pressed': 'false', title: 'Annotate this slide', html: icon(ICONS.pencil) });
  const bar = h('div', { class: 'anno-bar' });

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
      const sw = h('button', { type: 'button', class: 'anno-swatch' + (c.toLowerCase() === drawColor.toLowerCase() ? ' on' : ''), style: { '--sw': c }, onclick: () => { drawColor = c; buildColorRow(); } });
      swatchWrap.append(sw);
    });
    const custom = h('input', { type: 'color', class: 'anno-swatch-custom', value: drawColor, title: 'Custom colour', oninput: (e) => { drawColor = e.target.value; } });
    swatchWrap.append(custom);
  }
  buildColorRow();

  const fadeInput = h('input', { type: 'number', min: '0.5', max: '30', step: '0.5', value: String(fadeSeconds), class: 'anno-fade-input', 'aria-label': 'Highlighter fade time in seconds', onchange: (e) => { fadeSeconds = Math.max(0.5, Math.min(30, +e.target.value || 4)); try { lsSet('oop-anno-fade', String(fadeSeconds)); } catch (er) {} e.target.value = String(fadeSeconds); } });
  const fadeLabel = h('label', { class: 'anno-fade' }, 'Fade ', fadeInput, 's');

  // Undo/redo sit just to the left of the fade control.
  const undoBtn = h('button', { type: 'button', class: 'anno-tool anno-hist', title: 'Undo (⌘Z)', 'aria-label': 'Undo', html: icon(ICONS.undo), onclick: undo });
  const redoBtn = h('button', { type: 'button', class: 'anno-tool anno-hist', title: 'Redo (⌘⇧Z / ⌘Y)', 'aria-label': 'Redo', html: icon(ICONS.redo), onclick: redo });
  const histWrap = h('div', { class: 'anno-hist-wrap' }, undoBtn, redoBtn);

  const colorRow = h('div', { class: 'anno-row anno-justify anno-nowrap anno-colors' }, swatchWrap, histWrap, fadeLabel);

  bar.append(toolRow, colorRow);
  const wrap = h('div', { class: 'anno-wrap' }, toggleBtn, bar);
  document.body.appendChild(wrap);

  function paintTool() {
    toolButtons.forEach((b) => b.classList.toggle('on', b.getAttribute('data-tool') === tool));
    const passThrough = tool === 'off' || tool === 'select';
    overlay.style.pointerEvents = passThrough ? 'none' : 'auto';
    overlay.style.cursor = tool === 'eraser' ? 'cell' : passThrough ? '' : 'crosshair';
    document.body.classList.toggle('anno-drawing', !passThrough);
  }
  function setTool(name) {
    tool = name;
    wrap.classList.toggle('open', name !== 'off');
    toggleBtn.setAttribute('aria-pressed', String(name !== 'off'));
    paintTool();
  }
  // Opens straight into Select, not a drawing tool - the slide underneath (scrolling,
  // touch, the demos' own buttons) stays fully usable until a drawing tool is picked.
  toggleBtn.addEventListener('click', () => setTool(tool === 'off' ? 'select' : 'off'));
  toolButtons.forEach((b) => b.addEventListener('click', () => setTool(b.getAttribute('data-tool'))));
  clearBtn.addEventListener('click', () => {
    // Scoped to whichever slide is on screen right now - other slides' notes are untouched.
    if (!currentList().length) return;
    if (!window.confirm('Clear all notes on this slide?')) return;
    snapshot();
    store[slideIndex()] = [];
    persist();
    render();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tool !== 'off') { setTool('off'); return; }
    if (tool === 'off') return; // only steal undo/redo while the annotation toolbar is actually open
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; // don't hijack native undo in a text field
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  });

  /* ===================== drawing / erasing / dragging ===================== */
  function distSeg(px0, py0, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px0 - x1) * dx + (py0 - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px0 - (x1 + t * dx), py0 - (y1 + t * dy));
  }
  function shapeDist(a, x, y) {
    const [p1, p2] = a.points, x1 = px(p1.x), y1 = py(p1.y), x2 = px(p2.x), y2 = py(p2.y);
    if (a.kind === 'arrow') return distSeg(x, y, x1, y1, x2, y2);
    if (a.kind === 'circle') { const r = Math.hypot(x2 - x1, y2 - y1); return Math.abs(Math.hypot(x - x1, y - y1) - r); }
    const rx1 = Math.min(x1, x2), rx2 = Math.max(x1, x2), ry1 = Math.min(y1, y2), ry2 = Math.max(y1, y2);
    return Math.min(distSeg(x, y, rx1, ry1, rx2, ry1), distSeg(x, y, rx2, ry1, rx2, ry2), distSeg(x, y, rx2, ry2, rx1, ry2), distSeg(x, y, rx1, ry2, rx1, ry1));
  }
  function eraseNear(x, y) {
    const list = currentList();
    const before = list.length;
    store[slideIndex()] = list.filter((a) => {
      if (a.kind === 'rect' || a.kind === 'circle' || a.kind === 'arrow') return !(shapeDist(a, x, y) < 12);
      return !a.points.some((p) => Math.hypot(px(p.x) - x, py(p.y) - y) < 12);
    });
    if (store[slideIndex()].length !== before) { render(); persist(); }
  }

  let erasing = false;
  overlay.addEventListener('pointerdown', (e) => {
    if (tool === 'off' || tool === 'select') return;
    overlay.setPointerCapture(e.pointerId);
    const f = toFrac(e.clientX, e.clientY);
    if (tool === 'eraser') { snapshot(); erasing = true; eraseNear(e.clientX - rect().left, e.clientY - rect().top); return; }
    snapshot();
    active = { id: nextId++, kind: (tool === 'rect' || tool === 'circle' || tool === 'arrow') ? tool : undefined, temp: tool === 'highlight', points: [f, f], color: drawColor, createdAt: Date.now() };
  });
  overlay.addEventListener('pointermove', (e) => {
    if (tool === 'eraser' && erasing) { eraseNear(e.clientX - rect().left, e.clientY - rect().top); return; }
    if (active) {
      const f = toFrac(e.clientX, e.clientY);
      if (active.kind) active.points[1] = f; else active.points.push(f);
      render();
    }
  });
  function finishGesture() {
    if (active && active.points.length > 1) { active.createdAt = Date.now(); currentList().push(active); persist(); }
    active = null; erasing = false; render();
  }
  overlay.addEventListener('pointerup', finishGesture);
  overlay.addEventListener('pointercancel', finishGesture);

  /* ===================== render ===================== */
  const FADE_TAIL = 1.2; // seconds - highlighter strokes always fade out over this long
  function render() {
    clear(overlay);
    const list = active ? currentList().concat([active]) : currentList();
    list.forEach((a) => {
      if (a.kind === 'rect' || a.kind === 'circle' || a.kind === 'arrow') {
        const [p1, p2] = a.points, x1 = px(p1.x), y1 = py(p1.y), x2 = px(p2.x), y2 = py(p2.y);
        if (a.kind === 'rect') overlay.append(sv('rect', { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), class: 'anno-shape', stroke: a.color }));
        else if (a.kind === 'circle') overlay.append(sv('circle', { cx: x1, cy: y1, r: Math.hypot(x2 - x1, y2 - y1), class: 'anno-shape', stroke: a.color }));
        else {
          const ang = Math.atan2(y2 - y1, x2 - x1), hl = 12, hs = 0.45;
          overlay.append(sv('line', { x1, y1, x2, y2, class: 'anno-shape', stroke: a.color }));
          overlay.append(sv('polyline', { points: `${x2 - hl * Math.cos(ang - hs)},${y2 - hl * Math.sin(ang - hs)} ${x2},${y2} ${x2 - hl * Math.cos(ang + hs)},${y2 - hl * Math.sin(ang + hs)}`, fill: 'none', class: 'anno-shape', stroke: a.color }));
        }
        return;
      }
      if (a.points.length < 2) return;
      const d = 'M ' + a.points.map((p) => `${px(p.x)},${py(p.y)}`).join(' L ');
      let opacity = 1;
      if (a.temp && a !== active) {
        const age = (Date.now() - a.createdAt) / 1000;
        const fadeStart = Math.max(0, fadeSeconds - FADE_TAIL);
        if (age > fadeStart) opacity = Math.max(0, 1 - (age - fadeStart) / (fadeSeconds - fadeStart));
      }
      const strokeEl = sv('path', { d, class: 'anno-stroke' + (a.temp ? ' anno-temp' : ''), stroke: a.color, opacity, fill: 'none' });
      if (a.temp) strokeEl.style.setProperty('--glow', a.color);
      overlay.append(strokeEl);
    });
  }

  /* fade ticker for highlighter strokes */
  setInterval(() => {
    const list = currentList();
    const before = list.length;
    store[slideIndex()] = list.filter((a) => !a.temp || (Date.now() - a.createdAt) < fadeSeconds * 1000);
    const changed = store[slideIndex()].length !== before;
    const hasTemp = store[slideIndex()].some((a) => a.temp) || (active && active.temp);
    if (changed || hasTemp) render();
    if (changed) persist();
  }, 60);

  /* switch slides -> switch which annotation list (and undo/redo stack) is shown */
  let lastSlide = slideIndex();
  new MutationObserver(() => {
    const i = slideIndex();
    if (i !== lastSlide) { lastSlide = i; render(); paintHistory(); }
  }).observe(deck, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.addEventListener('resize', render);

  setTool('off');
  paintHistory();
  render();
})();
