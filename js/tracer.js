/* ===================== tracer.js : step-through Java code tracer ===================== */
/* A trace is recorded by running a small JavaScript "shadow" of the Java program against a
   recorder (Rec). Every R.at('label', 'note') call takes a snapshot of the call stack, the heap,
   the static area and the console. Lines in the Java source carry "@@label" markers at the end,
   which are stripped before display and map a label to its line number, so snapshots never
   depend on hard-coded line numbers.
   Threads: R.thread('Worker-1', 'RUNNABLE') switches the recorder to that thread's own stack
   (created on first use; the first stack is "main"). R.tstate(name, state) changes a thread's
   state without switching. With more than one thread the panel shows one stack per thread.
   References are drawn as arrows from each variable or field to the object it points to. */

/* value helpers used inside traces */
const D = (x) => ({ d: x });      // double
const F = (x) => ({ f: x });      // float
const C = (ch) => ({ c: ch });    // char
const U = { u: 1 };               // declared but not yet assigned

function deepClone(o) {
  if (o === null || typeof o !== 'object') return o;
  if (Array.isArray(o)) return o.map(deepClone);
  const r = {}; for (const k in o) r[k] = deepClone(o[k]); return r;
}

class Rec {
  constructor(labels) { this.labels = labels || {}; this.stack = []; this.heap = {}; this.hord = []; this.statics = {}; this.out = ''; this.steps = []; this.n = 0; this.hl = {}; this.thr = null; }
  thread(name, state) {
    if (!this.thr) { this.thr = { main: this.stack }; this.tord = ['main']; this.tst = { main: 'RUNNABLE' }; this.cur = 'main'; }
    if (!(name in this.thr)) { this.thr[name] = []; this.tord.push(name); this.tst[name] = 'NEW'; }
    this.stack = this.thr[name]; this.cur = name;
    if (state) this.tst[name] = state;
    return this;
  }
  tstate(name, state) { if (!this.thr) this.thread('main'); if (!(name in this.thr)) { const c = this.cur; this.thread(name); this.thread(c); } this.tst[name] = state; return this; }
  top() { return this.stack[this.stack.length - 1]; }
  frame(name) { this.stack.push({ name, vars: {}, ord: [] }); return this; }
  ret() { this.stack.pop(); return this; }
  set(k, v) { const f = this.top(); if (!(k in f.vars)) f.ord.push(k); f.vars[k] = v; return this; }
  del(...ks) { const f = this.top(); ks.forEach((k) => { delete f.vars[k]; f.ord = f.ord.filter((x) => x !== k); }); return this; }
  get(k) { return this.top().vars[k]; }
  obj(type, fields) { const id = '#' + (++this.n); this.heap[id] = { type, f: Object.assign({}, fields || {}), ord: Object.keys(fields || {}) }; this.hord.push(id); return { ref: id }; }
  arr(type, values) { const id = '#' + (++this.n); this.heap[id] = { type, a: values.slice() }; this.hord.push(id); return { ref: id }; }
  str(text, where) { const id = '#' + (++this.n); this.heap[id] = { type: 'String', s: text, where: where || 'heap' }; this.hord.push(id); return { ref: id }; }
  setf(r, k, v) { const o = this.heap[r.ref]; if (!(k in o.f)) o.ord.push(k); o.f[k] = v; return this; }
  getf(r, k) { return this.heap[r.ref].f[k]; }
  seti(r, i, v) { this.heap[r.ref].a[i] = v; return this; }
  geti(r, i) { return this.heap[r.ref].a[i]; }
  stat(cls, k, v) { (this.statics[cls] = this.statics[cls] || {})[k] = v; return this; }
  mark(r, idxs) { this.hl[r.ref] = [].concat(idxs); return this; }
  print(s) { this.out += String(s); return this; }
  println(s) { this.out += (s === undefined ? '' : String(s)) + '\n'; return this; }
  at(label, note) {
    const line = typeof label === 'number' ? label : this.labels[label];
    if (!line) throw new Error('Unknown trace label: ' + label);
    const threads = this.thr ? this.tord.map((n) => ({ name: n, state: this.tst[n], stack: deepClone(this.thr[n]) })) : null;
    this.steps.push({ line, note: note || '', stack: deepClone(this.stack), threads, active: this.cur, heap: deepClone(this.heap), hord: this.hord.slice(), statics: deepClone(this.statics), out: this.out, hl: this.hl });
    this.hl = {};
    return this;
  }
}

const Tracer = (() => {
  function parseCode(src) {
    const labels = {}, lines = src.replace(/^\n+|\s+$/g, '').split('\n').map((ln, i) => {
      const m = /\s*@@(\w+)\s*$/.exec(ln);
      if (m) { labels[m[1]] = i + 1; return ln.slice(0, m.index); }
      return ln;
    });
    return { labels, code: lines.join('\n') };
  }
  const refNum = (r) => +String(r).slice(1);
  function fmt(v) {
    if (v === undefined) return { t: '—', c: 'v-none' };
    if (v === null) return { t: 'null', c: 'v-null' };
    if (typeof v === 'number') return { t: String(v), c: 'v-num' };
    if (typeof v === 'boolean') return { t: String(v), c: 'v-bool' };
    if (typeof v === 'string') return { t: '"' + v + '"', c: 'v-str' };
    if (v.u) return { t: '?', c: 'v-none', title: 'declared, not yet assigned' };
    if ('d' in v) return { t: javaDouble(v.d), c: 'v-num' };
    if ('f' in v) return { t: javaFloat(v.f), c: 'v-num' };
    if ('c' in v) return { t: "'" + v.c + "'", c: 'v-str' };
    if ('ref' in v) return { ref: v.ref };
    return { t: JSON.stringify(v), c: '' };
  }
  function valEl(v, key) {
    const f = fmt(v);
    if (f.ref) return h('span', { class: 'v-ref rc' + (refNum(f.ref) % 6), title: 'reference to object ' + f.ref, 'data-ref': f.ref, 'data-key': key || null }, '→ ' + f.ref);
    return h('span', { class: 'v ' + f.c, title: f.title || null }, f.t);
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function reachable(step) {
    const seen = new Set(), todo = [];
    const add = (v) => { if (v && typeof v === 'object' && v.ref && !seen.has(v.ref)) { seen.add(v.ref); todo.push(v.ref); } };
    (step.threads ? step.threads.flatMap((t) => t.stack) : step.stack).forEach((f) => Object.values(f.vars).forEach(add));
    Object.keys(step.heap).forEach((id) => { if (step.heap[id].where === 'pool') add({ ref: id }); });   // the string pool keeps literals alive
    Object.values(step.statics).forEach((o) => Object.values(o).forEach(add));
    while (todo.length) {
      const o = step.heap[todo.pop()]; if (!o) continue;
      if (o.f) Object.values(o.f).forEach(add);
      if (o.a) o.a.forEach(add);
    }
    return seen;
  }

  function frameEl(f, prevF, isTop, kp, topLabel) {
    const rows = f.ord.map((k) => {
      const chg = !prevF || !(k in prevF.vars) || !same(prevF.vars[k], f.vars[k]);
      return h('tr', { class: chg ? 'chg' : '' }, h('td', { class: 'vn' }, k), h('td', null, valEl(f.vars[k], kp + k)));
    });
    return h('div', { class: 'frame' + (isTop ? ' top' : '') + (prevF ? '' : ' fresh') },
      h('div', { class: 'frame-h' }, h('span', null, f.name), isTop && topLabel !== '' ? h('small', null, topLabel || 'running') : null),
      rows.length ? h('table', { class: 'vars' }, h('tbody', null, rows)) : h('div', { class: 'frame-empty' }, 'no local variables yet'));
  }
  function objEl(id, o, prevO, live, hl) {
    const head = h('div', { class: 'obj-h rc' + (refNum(id) % 6) }, h('b', null, id), ' ', o.type, o.s !== undefined && o.where === 'pool' ? h('small', null, 'string pool') : null);
    let body;
    if (o.a) {
      const idx = o.a.map((_, i) => h('th', { class: hl && hl.includes(i) ? 'hl' : '' }, String(i)));
      const cells = o.a.map((v, i) => {
        const chg = prevO && prevO.a && !same(prevO.a[i], v);
        return h('td', { class: (chg ? 'chg ' : '') + (hl && hl.includes(i) ? 'hl' : '') }, valEl(v, 'h' + id + '[' + i));
      });
      body = h('div', { class: 'scrollx' }, h('table', { class: 'arr' }, h('tr', null, idx), h('tr', null, cells)), h('div', { class: 'arr-len' }, 'length = ' + o.a.length));
    } else if (o.s !== undefined) {
      body = h('div', { class: 'obj-str' }, h('span', { class: 'v v-str' }, '"' + o.s + '"'));
    } else {
      body = o.ord.length ? h('table', { class: 'vars' }, h('tbody', null, o.ord.map((k) => {
        const chg = !prevO || !prevO.f || !same(prevO.f[k], o.f[k]);
        return h('tr', { class: chg ? 'chg' : '' }, h('td', { class: 'vn' }, k), h('td', null, valEl(o.f[k], 'h' + id + '.' + k)));
      }))) : h('div', { class: 'frame-empty' }, 'no fields');
    }
    const changed = prevO && !same(prevO, o);
    return h('div', { class: 'obj' + (live ? '' : ' garbage') + (prevO ? '' : ' fresh') + (changed ? ' changed' : ''), 'data-id': id }, head, body, live ? null : h('div', { class: 'gc-tag' }, 'no reference left → eligible for garbage collection'));
  }
  function noteEl(text) {
    const html = esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return html;
  }

  function build(def, opts = {}) {
    const { labels, code } = parseCode(def.code);
    const scen = def.scenarios || [{ label: 'Run', run: def.run }];
    const record = (s) => { const R = new Rec(labels); s.run(R); return R.steps; };
    let steps = record(scen[0]), cur = 0, timer = null;
    const usesHeap = scen.some((s) => { const R = new Rec(labels); s.run(R); return R.hord.length > 0; }) && !def.noHeap;
    const usesStatic = scen.some((s) => { const R = new Rec(labels); s.run(R); return Object.keys(R.statics).length > 0; });
    const usesThreads = scen.some((s) => { const R = new Rec(labels); s.run(R); return !!R.thr; });

    const pre = h('pre', { class: 'code trace-code' });
    const codeEl = h('code', { class: 'language-java' });
    const lineEls = Java.lines(code).map((toks, k) => Java.lineEl(toks, k + 1, {}));
    lineEls.forEach((l) => codeEl.append(l)); pre.append(codeEl); pre.setAttribute('data-hl', '1');

    const stackBox = h('div', { class: usesThreads ? 'threads' : 'stack' }), heapBox = h('div', { class: 'heap' }), statBox = h('div', { class: 'statics' });
    const arrows = sv('svg', { class: 'trace-arrows', 'aria-hidden': 'true' });
    const arrowsBack = sv('svg', { class: 'trace-arrows back', 'aria-hidden': 'true' });   /* from heap fields: drawn behind the objects */
    const side = h('div', { class: 'trace-state' }, arrowsBack, arrows,
      h('div', { class: 'mem-sec' }, usesThreads ? h('h5', null, 'Threads', h('small', null, 'each thread has its own call stack')) : h('h5', null, 'Call stack', h('small', null, 'local variables, newest frame on top')), stackBox),
      usesStatic ? h('div', { class: 'mem-sec' }, h('h5', null, 'Static area', h('small', null, 'one copy per class')), statBox) : null,
      usesHeap ? h('div', { class: 'mem-sec' }, h('h5', null, 'Heap', h('small', null, 'objects and arrays')), heapBox) : null);
    const note = h('div', { class: 'trace-note', role: 'status', 'aria-live': 'polite' });
    const cons = consoleEl('Console output');
    const counter = h('span', { class: 'trace-count' });
    const slider = h('input', { type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'Step', oninput: () => { stop(); show(+slider.value); } });
    const playBtn = h('button', { type: 'button', class: 'btn sm', onclick: () => (timer ? stop() : play()) }, '▶ Play');
    const SPEEDS = [1, 1.5, 2, 0.5]; let speed = 0;
    const speedBtn = h('button', { type: 'button', class: 'btn sm speed', title: 'Playback speed', 'aria-label': 'Playback speed', onclick: () => { speed = (speed + 1) % SPEEDS.length; speedBtn.textContent = SPEEDS[speed] + '×'; if (timer) { stop(); play(true); } } }, '1×');
    const ctl = h('div', { class: 'trace-ctl' },
      h('button', { type: 'button', class: 'btn sm', title: 'First step', onclick: () => { stop(); show(0); } }, '⏮'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { stop(); show(cur - 1); } }, '◀ Back'),
      h('button', { type: 'button', class: 'btn sm pri', onclick: () => { stop(); show(cur + 1); } }, 'Next ▶'),
      h('button', { type: 'button', class: 'btn sm', title: 'Last step', onclick: () => { stop(); show(steps.length - 1); } }, '⏭'),
      playBtn, speedBtn, counter, slider);

    let scenBar = null;
    if (scen.length > 1) {
      scenBar = h('div', { class: 'trace-scen' }, h('span', { class: 'small muted' }, def.scenarioLabel || 'Scenario:'),
        seg(scen.map((s, i) => ({ v: i, l: s.label })), 0, (i) => { stop(); steps = record(scen[i]); slider.max = String(steps.length - 1); show(0); }).el);
    }

    function show(i) {
      if (!steps.length) return;
      cur = Math.max(0, Math.min(steps.length - 1, Math.round(i) || 0));
      const st = steps[cur], pv = cur > 0 ? steps[cur - 1] : null;
      lineEls.forEach((l, k) => { l.classList.toggle('cur', k + 1 === st.line); l.classList.toggle('prev', !!pv && k + 1 === pv.line && pv.line !== st.line); });
      const curEl = lineEls[st.line - 1];
      if (curEl) { const top = curEl.offsetTop - pre.clientHeight / 2 + 12; pre.scrollTop = Math.max(0, top); }
      clear(stackBox);
      const stackEls = (stk, pstk, box, kp, isActive, label) => {
        stk.slice().reverse().forEach((f, ri) => {
          const idx = stk.length - 1 - ri, pf = pstk && pstk[idx] && pstk[idx].name === f.name ? pstk[idx] : null;
          box.append(frameEl(f, pf, ri === 0 && isActive, kp + idx + ':', isActive ? label || 'running' : ''));
        });
      };
      if (usesThreads) {
        const ths = st.threads || [{ name: 'main', state: st.stack.length ? 'RUNNABLE' : 'TERMINATED', stack: st.stack }];
        ths.forEach((t) => {
          const pt = pv && (pv.threads || []).find((x) => x.name === t.name);
          const act = (st.active || 'main') === t.name && t.stack.length > 0;
          const col = h('div', { class: 'stack' });
          stackEls(t.stack, pt ? pt.stack : null, col, 't' + t.name + ':', act, !t.state || t.state === 'RUNNABLE' ? 'running' : 'stopped here');
          const empty = !t.stack.length;
          const stCls = 'ts ts-' + String(t.state || '').toLowerCase().replace(/[^a-z]/g, '');
          stackBox.append(h('div', { class: 'thread' + (act ? ' active' : '') + (empty ? ' empty' : '') + (pt && pt.state !== t.state ? ' chg' : '') },
            h('div', { class: 'thread-h' }, h('b', null, t.name), h('span', { class: stCls }, t.state || ''),
              empty ? h('span', { class: 'tnote' }, t.state === 'NEW' ? 'not started: no stack yet' : t.state === 'TERMINATED' ? 'finished: its stack is gone' : 'started, waiting for its first turn') : null),
            empty ? null : col));
        });
      } else {
        stackEls(st.stack, pv && pv.stack, stackBox, 's', true);
        if (!st.stack.length) stackBox.append(h('div', { class: 'frame-empty' }, 'program finished — the stack is empty'));
      }
      if (usesStatic) {
        clear(statBox);
        const ks = Object.keys(st.statics);
        if (!ks.length) statBox.append(h('div', { class: 'frame-empty' }, 'class not loaded yet'));
        ks.forEach((cls) => {
          const o = st.statics[cls], po = pv && pv.statics[cls];
          statBox.append(h('div', { class: 'frame static' }, h('div', { class: 'frame-h' }, h('span', null, cls + ' (static)')),
            h('table', { class: 'vars' }, h('tbody', null, Object.keys(o).map((k) => h('tr', { class: !po || !same(po[k], o[k]) ? 'chg' : '' }, h('td', { class: 'vn' }, k), h('td', null, valEl(o[k], 'c' + cls + '.' + k))))))));
        });
      }
      if (usesHeap) {
        clear(heapBox);
        const live = reachable(st);
        const ids = st.hord.filter((id) => st.heap[id]);
        if (!ids.length) heapBox.append(h('div', { class: 'frame-empty' }, 'no objects created yet'));
        ids.forEach((id) => heapBox.append(objEl(id, st.heap[id], pv ? pv.heap[id] : null, live.has(id), st.hl[id])));
      }
      note.innerHTML = st.note ? noteEl(st.note) : '<span class="muted">Press <b>Next ▶</b> to run the next line.</span>';
      cons.set(st.out);
      if (pv && st.out !== pv.out) { cons.el.classList.remove('flash'); void cons.el.offsetWidth; cons.el.classList.add('flash'); }
      if (curEl && pv && pv.line !== st.line) { curEl.classList.remove('arrive'); void curEl.offsetWidth; curEl.classList.add('arrive'); }
      counter.textContent = `Step ${cur + 1} of ${steps.length}`;
      slider.value = String(cur);
      drawArrows(pv ? prevKeys : null);
    }

    /* ---- reference arrows: a curve from every reference value to the object it points to ---- */
    let prevKeys = {}, raf = 0;
    function drawArrows(old) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        clear(arrows); clear(arrowsBack);
        const box = side.getBoundingClientRect();
        if (!box.width || def.noArrows) return;
        [arrows, arrowsBack].forEach((a) => { a.setAttribute('width', box.width); a.setAttribute('height', box.height); a.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`); });
        const keys = {}; let lane = 0;
        side.querySelectorAll('.v-ref[data-ref]').forEach((chip) => {
          const id = chip.getAttribute('data-ref'), key = chip.getAttribute('data-key') || '';
          keys[key] = id;
          const tgt = heapBox.querySelector(`.obj[data-id="${id}"]`);
          if (!tgt) return;
          const a = chip.getBoundingClientRect(), b = tgt.getBoundingClientRect();
          if (!a.width || !b.width) return;
          const x1 = a.right - box.left + 3, y1 = a.top + a.height / 2 - box.top;
          const bl = b.left - box.left, br = b.right - box.left, bt = b.top - box.top;
          /* right to a lane at the panel edge, along it to the gap just above the object, then down into its top */
          const k = lane++ % 4, lx = box.width - 6 - k * 5, gy = bt - 5 - (k % 2) * 3;
          const x2 = Math.max(bl + 10, Math.min(bl + 22 + k * 8, br - 10)), y2 = bt - 1, ux = 0, uy = 1;
          const dir = gy >= y1 ? 1 : -1, r = Math.max(0, Math.min(7, (lx - x1) / 2, Math.abs(gy - y1) / 2));
          const d = `M${x1},${y1} H${lx - r} Q${lx},${y1} ${lx},${y1 + dir * r} V${gy - dir * r} Q${lx},${gy} ${lx - r},${gy} H${x2 + 6} Q${x2},${gy} ${x2},${gy + 5} V${y2 - 4}`;
          const s = 7;
          const cls = 'arw rc' + (refNum(id) % 6) + (tgt.classList.contains('garbage') ? ' dim' : '') + (old && old[key] !== id ? ' draw' : '');
          const g = sv('g', { class: cls },
            sv('path', { pathLength: '1', d }),
            sv('polygon', { points: `${x2},${y2} ${x2 - ux * s - uy * s * 0.55},${y2 - uy * s + ux * s * 0.55} ${x2 - ux * s + uy * s * 0.55},${y2 - uy * s - ux * s * 0.55}` }),
            sv('circle', { cx: x1 - 1, cy: y1, r: 2.6 }));
          (heapBox.contains(chip) ? arrowsBack : arrows).append(g);
        });
        prevKeys = keys;
      });
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => drawArrows(null)).observe(side);

    function play(keep) {
      if (!keep && cur >= steps.length - 1) show(0);
      playBtn.textContent = '❚❚ Pause';
      timer = setInterval(() => { if (cur >= steps.length - 1) stop(); else show(cur + 1); }, (opts.speed || 1100) / SPEEDS[speed]);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; playBtn.textContent = '▶ Play'; }

    slider.max = String(steps.length - 1);
    const el = h('div', { class: 'trace' + (usesHeap || usesStatic ? ' has-arrows' : ' no-heap') },
      def.title ? h('div', { class: 'trace-title' }, def.title) : null,
      scenBar,
      h('div', { class: 'trace-body' }, h('div', { class: 'trace-left' }, pre, note), side),
      h('div', { class: 'trace-bottom' }, cons.el, ctl));
    setTimeout(() => show(opts.start === 'last' ? steps.length - 1 : 0), 0);
    show(opts.start === 'last' ? steps.length - 1 : 0);
    return el;
  }
  return { build, parseCode, valEl };
})();
