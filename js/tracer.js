/* ===================== tracer.js : step-through Java code tracer ===================== */
/* A trace is recorded by running a small JavaScript "shadow" of the Java program against a
   recorder (Rec). Every R.at('label', 'note') call takes a snapshot of the call stack, the heap,
   the static area and the console. Lines in the Java source carry "@@label" markers at the end,
   which are stripped before display and map a label to its line number, so snapshots never
   depend on hard-coded line numbers. */

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
  constructor(labels) { this.labels = labels || {}; this.stack = []; this.heap = {}; this.hord = []; this.statics = {}; this.out = ''; this.steps = []; this.n = 0; this.hl = {}; }
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
    this.steps.push({ line, note: note || '', stack: deepClone(this.stack), heap: deepClone(this.heap), hord: this.hord.slice(), statics: deepClone(this.statics), out: this.out, hl: this.hl });
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
  function valEl(v) {
    const f = fmt(v);
    if (f.ref) return h('span', { class: 'v-ref rc' + (refNum(f.ref) % 6), title: 'reference to object ' + f.ref }, '→ ' + f.ref);
    return h('span', { class: 'v ' + f.c, title: f.title || null }, f.t);
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function reachable(step) {
    const seen = new Set(), todo = [];
    const add = (v) => { if (v && typeof v === 'object' && v.ref && !seen.has(v.ref)) { seen.add(v.ref); todo.push(v.ref); } };
    step.stack.forEach((f) => Object.values(f.vars).forEach(add));
    Object.keys(step.heap).forEach((id) => { if (step.heap[id].where === 'pool') add({ ref: id }); });   // the string pool keeps literals alive
    Object.values(step.statics).forEach((o) => Object.values(o).forEach(add));
    while (todo.length) {
      const o = step.heap[todo.pop()]; if (!o) continue;
      if (o.f) Object.values(o.f).forEach(add);
      if (o.a) o.a.forEach(add);
    }
    return seen;
  }

  function frameEl(f, prevF, isTop) {
    const rows = f.ord.map((k) => {
      const chg = !prevF || !(k in prevF.vars) || !same(prevF.vars[k], f.vars[k]);
      return h('tr', { class: chg ? 'chg' : '' }, h('td', { class: 'vn' }, k), h('td', null, valEl(f.vars[k])));
    });
    return h('div', { class: 'frame' + (isTop ? ' top' : '') },
      h('div', { class: 'frame-h' }, h('span', null, f.name), isTop ? h('small', null, 'running') : null),
      rows.length ? h('table', { class: 'vars' }, h('tbody', null, rows)) : h('div', { class: 'frame-empty' }, 'no local variables yet'));
  }
  function objEl(id, o, prevO, live, hl) {
    const head = h('div', { class: 'obj-h rc' + (refNum(id) % 6) }, h('b', null, id), ' ', o.type, o.s !== undefined && o.where === 'pool' ? h('small', null, 'string pool') : null);
    let body;
    if (o.a) {
      const idx = o.a.map((_, i) => h('th', { class: hl && hl.includes(i) ? 'hl' : '' }, String(i)));
      const cells = o.a.map((v, i) => {
        const chg = prevO && prevO.a && !same(prevO.a[i], v);
        return h('td', { class: (chg ? 'chg ' : '') + (hl && hl.includes(i) ? 'hl' : '') }, valEl(v));
      });
      body = h('div', { class: 'scrollx' }, h('table', { class: 'arr' }, h('tr', null, idx), h('tr', null, cells)), h('div', { class: 'arr-len' }, 'length = ' + o.a.length));
    } else if (o.s !== undefined) {
      body = h('div', { class: 'obj-str' }, h('span', { class: 'v v-str' }, '"' + o.s + '"'));
    } else {
      body = o.ord.length ? h('table', { class: 'vars' }, h('tbody', null, o.ord.map((k) => {
        const chg = !prevO || !prevO.f || !same(prevO.f[k], o.f[k]);
        return h('tr', { class: chg ? 'chg' : '' }, h('td', { class: 'vn' }, k), h('td', null, valEl(o.f[k])));
      }))) : h('div', { class: 'frame-empty' }, 'no fields');
    }
    return h('div', { class: 'obj' + (live ? '' : ' garbage') + (prevO ? '' : ' fresh') }, head, body, live ? null : h('div', { class: 'gc-tag' }, 'no reference left → eligible for garbage collection'));
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

    const pre = h('pre', { class: 'code trace-code' });
    const codeEl = h('code', { class: 'language-java' });
    const lineEls = Java.lines(code).map((toks, k) => Java.lineEl(toks, k + 1, {}));
    lineEls.forEach((l) => codeEl.append(l)); pre.append(codeEl); pre.setAttribute('data-hl', '1');

    const stackBox = h('div', { class: 'stack' }), heapBox = h('div', { class: 'heap' }), statBox = h('div', { class: 'statics' });
    const side = h('div', { class: 'trace-state' },
      h('div', { class: 'mem-sec' }, h('h5', null, 'Call stack', h('small', null, 'local variables, newest frame on top')), stackBox),
      usesStatic ? h('div', { class: 'mem-sec' }, h('h5', null, 'Static area', h('small', null, 'one copy per class')), statBox) : null,
      usesHeap ? h('div', { class: 'mem-sec' }, h('h5', null, 'Heap', h('small', null, 'objects and arrays')), heapBox) : null);
    const note = h('div', { class: 'trace-note', role: 'status', 'aria-live': 'polite' });
    const cons = consoleEl('Console output');
    const counter = h('span', { class: 'trace-count' });
    const slider = h('input', { type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'Step', oninput: () => { stop(); show(+slider.value); } });
    const playBtn = h('button', { type: 'button', class: 'btn sm', onclick: () => (timer ? stop() : play()) }, '▶ Play');
    const ctl = h('div', { class: 'trace-ctl' },
      h('button', { type: 'button', class: 'btn sm', title: 'First step', onclick: () => { stop(); show(0); } }, '⏮'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { stop(); show(cur - 1); } }, '◀ Back'),
      h('button', { type: 'button', class: 'btn sm pri', onclick: () => { stop(); show(cur + 1); } }, 'Next ▶'),
      h('button', { type: 'button', class: 'btn sm', title: 'Last step', onclick: () => { stop(); show(steps.length - 1); } }, '⏭'),
      playBtn, counter, slider);

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
      st.stack.slice().reverse().forEach((f, ri) => {
        const idx = st.stack.length - 1 - ri, pf = pv && pv.stack[idx] && pv.stack[idx].name === f.name ? pv.stack[idx] : null;
        stackBox.append(frameEl(f, pf, ri === 0));
      });
      if (!st.stack.length) stackBox.append(h('div', { class: 'frame-empty' }, 'program finished — the stack is empty'));
      if (usesStatic) {
        clear(statBox);
        const ks = Object.keys(st.statics);
        if (!ks.length) statBox.append(h('div', { class: 'frame-empty' }, 'class not loaded yet'));
        ks.forEach((cls) => {
          const o = st.statics[cls], po = pv && pv.statics[cls];
          statBox.append(h('div', { class: 'frame static' }, h('div', { class: 'frame-h' }, h('span', null, cls + ' (static)')),
            h('table', { class: 'vars' }, h('tbody', null, Object.keys(o).map((k) => h('tr', { class: !po || !same(po[k], o[k]) ? 'chg' : '' }, h('td', { class: 'vn' }, k), h('td', null, valEl(o[k]))))))));
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
      counter.textContent = `Step ${cur + 1} of ${steps.length}`;
      slider.value = String(cur);
    }
    function play() {
      if (cur >= steps.length - 1) show(0);
      playBtn.textContent = '❚❚ Pause';
      timer = setInterval(() => { if (cur >= steps.length - 1) stop(); else show(cur + 1); }, opts.speed || 1100);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; playBtn.textContent = '▶ Play'; }

    slider.max = String(steps.length - 1);
    const el = h('div', { class: 'trace' + (usesHeap || usesStatic ? '' : ' no-heap') },
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
