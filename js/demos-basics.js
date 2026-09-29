/* ===================== demos-basics.js : topics 1–3 ===================== */
const DEMOS = {};

/* ---------- shared demo helpers ---------- */
function demoBox(title, sub, ...kids) {
  return h('div', { class: 'demo' }, title ? h('h3', null, title) : null, sub ? h('p', { class: 'sub' }, sub) : null, ...kids);
}
/* a highlighted code block whose lines can be marked: api.mark([lines], cls) */
function codeView(src, opts = {}) {
  const pre = Java.render(src, null, opts);
  if (opts.small) pre.classList.add('small-code');
  const lines = () => Array.from(pre.querySelectorAll('.cl'));
  return {
    el: pre,
    mark(nums, cls = 'cur') { const set = new Set([].concat(nums || [])); lines().forEach((l, i) => l.classList.toggle(cls, set.has(i + 1))); },
    clearAll() { lines().forEach((l) => l.classList.remove('cur', 'prev', 'off', 'ok')); },
    set(src2) { Java.render(src2, pre, opts); }
  };
}
const kv = (k, v, cls) => h('span', { class: 'kv ' + (cls || '') }, h('small', null, k), h('b', null, v));
function stepper(onStep, opts = {}) {
  let timer = null;
  const play = h('button', { type: 'button', class: 'btn sm', onclick: () => (timer ? stop() : start()) }, '▶ Play');
  function start() { play.textContent = '❚❚ Pause'; timer = setInterval(() => { if (!onStep()) stop(); }, opts.ms || 700); }
  function stop() { if (timer) clearInterval(timer); timer = null; play.textContent = '▶ Play'; }
  return { play, stop, start, running: () => !!timer };
}

/* ======================= 1. types, casting, overflow ======================= */
DEMOS.casting = (root) => {
  root.append(demoBox('Type-casting & overflow playground', 'Type any number. The table shows exactly what Java stores when that value is cast to each primitive type — including truncation and wrap-around.',
    tabs([{ id: 'cast', label: 'Casting a value' }, { id: 'ovf', label: 'Integer overflow' }], 'cast', (id, body) => {
      if (id === 'cast') castTab(body); else overflowTab(body);
    }).el));

  function castTab(body) {
    const inp = textInput('300.75', { 'aria-label': 'Value to cast', style: { width: '170px' } });
    const out = h('div', { class: 'scrollx' });
    const ex = h('div', { class: 'row tight' }, ['65', '127', '130', '300.75', '-129', '-3.99', '70000', '3e9', '1e20'].map((v) =>
      h('button', { type: 'button', class: 'btn sm', onclick: () => { inp.value = v; draw(); } }, v)));
    inp.addEventListener('input', draw);
    body.append(h('div', { class: 'row' }, field('double value = ', inp), h('span', { class: 'small muted' }, 'try:'), ex), out);
    function draw() {
      const v = Number(inp.value);
      clear(out);
      if (inp.value.trim() === '' || Number.isNaN(v)) { out.append(h('p', { class: 'bad' }, 'Type a number such as 300.75 or -129.')); return; }
      const i32 = toJavaInt(v), frac = v !== Math.trunc(v);
      const byteV = (i32 << 24) >> 24, shortV = (i32 << 16) >> 16, charV = i32 & 0xFFFF;
      const LMAX = 9223372036854775807n, LMIN = -9223372036854775808n;
      let longV;
      if (Number.isNaN(v)) longV = 0n; else if (v >= 9223372036854775807) longV = LMAX; else if (v <= -9223372036854775808) longV = LMIN; else longV = BigInt(Math.trunc(v));
      const wrapNote = (bits, val, lo, hi) => {
        const base = [];
        if (frac) base.push('fraction dropped');
        if (Math.trunc(v) > 2147483647 || Math.trunc(v) < -2147483648) base.push('clamped to int range first');
        if (i32 !== val) base.push(`wrapped: kept the low ${bits} bits of ${i32}`);
        return base.join('; ') || 'fits — no change';
      };
      const charShow = charV >= 32 && charV < 127 ? `'${String.fromCharCode(charV)}' (code ${charV})` : `'\\u${charV.toString(16).padStart(4, '0').toUpperCase()}' (code ${charV})`;
      const rows = [
        ['byte', '(byte) value', String(byteV), wrapNote(8, byteV)],
        ['short', '(short) value', String(shortV), wrapNote(16, shortV)],
        ['char', '(char) value', charShow, wrapNote(16, charV)],
        ['int', '(int) value', String(i32), (frac ? 'fraction dropped' : '') + (Math.trunc(v) > 2147483647 || Math.trunc(v) < -2147483648 ? (frac ? '; ' : '') + 'clamped to Integer.MAX/MIN_VALUE' : '') || 'fits — no change'],
        ['long', '(long) value', longV.toString(), (frac ? 'fraction dropped' : '') || (Math.abs(v) >= 9.2e18 ? 'clamped to Long range' : 'fits — no change')],
        ['float', '(float) value', javaFloat(v), Math.fround(v) === v ? 'exact' : 'rounded to the nearest float (about 7 significant digits)'],
        ['double', 'value', javaDouble(v), 'the original value']];
      out.append(tableEl(['type', 'Java expression', 'stored value', 'what happened'], rows.map((r) => [h('b', null, r[0]), h('code', null, r[1]), h('span', { class: 'mono' }, r[2]), h('span', { class: 'small' }, r[3])]), 'tt castt'));
    }
    draw();
  }
  function overflowTab(body) {
    const a = textInput('2147483647', { style: { width: '150px' }, 'aria-label': 'a' }), b = textInput('1', { style: { width: '150px' }, 'aria-label': 'b' });
    const op = seg([{ v: '+', l: 'a + b' }, { v: '*', l: 'a * b' }, { v: '-', l: 'a - b' }], '+', draw);
    const out = h('div');
    [a, b].forEach((e) => e.addEventListener('input', draw));
    body.append(h('div', { class: 'row' }, field('int a =', a), field('int b =', b), op.el,
      h('button', { type: 'button', class: 'btn sm', onclick: () => { a.value = '2147483647'; b.value = '1'; op.set('+'); } }, 'MAX_VALUE + 1'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { a.value = '100000'; b.value = '100000'; op.set('*'); } }, '100000 × 100000')), out);
    function draw() {
      clear(out);
      const x = Number(a.value), y = Number(b.value);
      if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 2147483648 || Math.abs(y) > 2147483648) { out.append(h('p', { class: 'bad' }, 'Enter two whole numbers within the int range (−2147483648 … 2147483647).')); return; }
      const X = BigInt(x | 0), Y = BigInt(y | 0), o = op.get();
      const exact = o === '+' ? X + Y : o === '*' ? X * Y : X - Y;
      const asInt = Number(BigInt.asIntN(32, exact)), asLong = BigInt.asIntN(64, exact);
      const over = BigInt(asInt) !== exact;
      out.append(h('div', { class: 'tgrid' },
        h('div', { class: 'tcard' }, h('h4', null, 'int result'), h('div', { class: 'eqbig ' + (over ? 'bad' : 'ok') }, String(asInt)), h('p', { class: 'small' }, over ? `Overflow! The true answer ${exact} does not fit in 32 bits, so Java silently wraps around. No error, no warning.` : 'Fits in an int.')),
        h('div', { class: 'tcard' }, h('h4', null, 'long result: (long) a ' + o + ' b'), h('div', { class: 'eqbig ok' }, asLong.toString()), h('p', { class: 'small' }, 'Casting one operand to long makes the whole calculation 64-bit. ' + (over ? 'Now the answer is correct.' : '')))),
      h('pre', { class: 'code nonum small-code', html: '' }));
      Java.render(`int  r1 = a ${o} b;          // ${asInt}\nlong r2 = (long) a ${o} b;   // ${asLong}\nlong r3 = (long) (a ${o} b); // ${asInt}  (too late: already overflowed)`, out.lastChild, { nums: false });
    }
    draw();
  }
};

DEMOS.operators = (root) => {
  const a = numInput(17, { 'aria-label': 'a' }), b = numInput(5, { 'aria-label': 'b' });
  const out = h('div', { class: 'scrollx' });
  const inc = h('div');
  [a, b].forEach((e) => e.addEventListener('input', draw));
  root.append(demoBox('Operator playground', 'Change the two int values and watch every operator\'s result. Pay attention to integer division, % with negative numbers, and dividing by zero.',
    h('div', { class: 'row' }, field('int a =', a), field('int b =', b),
      ...[[17, 5], [-17, 5], [7, 0], [3, 8]].map(([x, y]) => h('button', { type: 'button', class: 'btn sm', onclick: () => { a.value = x; b.value = y; draw(); } }, `a=${x}, b=${y}`))),
    out, inc));
  function draw() {
    const x = int32(+a.value || 0), y = int32(+b.value || 0);
    const idiv = (p, q) => (q === 0 ? 'throws ArithmeticException' : String(Math.trunc(p / q) | 0));
    const imod = (p, q) => (q === 0 ? 'throws ArithmeticException' : String(p % q));
    const fdiv = (p, q) => javaDouble(p / q);
    const rows = [
      ['Arithmetic', 'a + b', String(int32(x + y))], ['', 'a - b', String(int32(x - y))], ['', 'a * b', String(Math.imul(x, y))],
      ['', 'a / b', idiv(x, y), 'int ÷ int drops the fraction'], ['', 'a % b', imod(x, y), 'remainder takes the sign of a'],
      ['', '(double) a / b', fdiv(x, y), 'cast first → real division'], ['', '(double) (a / b)', y === 0 ? 'throws ArithmeticException' : javaDouble(Math.trunc(x / y)), 'cast after → fraction already lost'],
      ['Relational', 'a > b', String(x > y)], ['', 'a == b', String(x === y)], ['', 'a != b', String(x !== y)],
      ['Logical', 'a > 0 && b > 0', String(x > 0 && y > 0), '&& stops at the first false'], ['', 'a > 0 || b > 0', String(x > 0 || y > 0), '|| stops at the first true'], ['', '!(a > b)', String(!(x > y))],
      ['Ternary', 'a > b ? a : b', String(x > y ? x : y), 'picks the larger'],
      ['Bitwise', 'a & b', String(x & y)], ['', 'a | b', String(x | y)], ['', 'a ^ b', String(x ^ y)], ['', 'a << 1', String(x << 1), 'doubles a'], ['', 'a >> 1', String(x >> 1), 'halves a (rounds down)']];
    clear(out).append(tableEl(['group', 'expression', 'value', 'note'], rows.map((r) => [h('span', { class: 'small muted' }, r[0]), h('code', null, r[1]), h('b', { class: /throws/.test(r[2]) ? 'bad' : 'mono' }, r[2]), h('span', { class: 'small' }, r[3] || '')]), 'tt opt'));
    const p1 = x, q1 = x + 1, p2 = x + 1;
    clear(inc).append(h('div', { class: 'tgrid' },
      h('div', { class: 'tcard' }, h('h4', null, 'Post-increment'), h('pre', { class: 'code nonum small-code' }, `int x = ${x};\nint y = x++;   // y = ${p1}, then x = ${q1}`)),
      h('div', { class: 'tcard' }, h('h4', null, 'Pre-increment'), h('pre', { class: 'code nonum small-code' }, `int x = ${x};\nint y = ++x;   // x = ${p2} first, then y = ${p2}`))));
    Java.highlightAll(inc);
  }
  draw();
};

/* ======================= 2. control flow ======================= */
DEMOS.grades = (root) => {
  const src = `if (marks >= 80)      grade = "A+";
else if (marks >= 75) grade = "A";
else if (marks >= 70) grade = "A-";
else if (marks >= 65) grade = "B+";
else if (marks >= 60) grade = "B";
else if (marks >= 55) grade = "B-";
else if (marks >= 50) grade = "C+";
else if (marks >= 45) grade = "C";
else if (marks >= 40) grade = "D";
else                  grade = "F";
System.out.println("Grade: " + grade);`;
  const cuts = [80, 75, 70, 65, 60, 55, 50, 45, 40], grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];
  const cv = codeView(src);
  const slider = h('input', { type: 'range', min: '0', max: '100', value: '72', 'aria-label': 'marks', oninput: draw, style: { width: '260px' } });
  const val = h('b', { class: 'mono' }), info = h('div', { class: 'small', style: { marginTop: '8px' } }), cons = consoleEl();
  root.append(demoBox('if-else ladder: GUB grading policy', 'Drag the marks. Grey lines were checked and were false; the highlighted line is the first true condition — every line after it is skipped.',
    h('div', { class: 'row' }, h('span', null, 'int marks = '), slider, val), h('div', { class: 'cols' }, cv.el, h('div', null, cons.el, info))));
  function draw() {
    const m = +slider.value; val.textContent = m + ';';
    let k = cuts.findIndex((c) => m >= c); if (k < 0) k = 9;
    const lines = Array.from(cv.el.querySelectorAll('.cl'));
    lines.forEach((l, i) => { l.classList.toggle('off', i < k); l.classList.toggle('cur', i === k); l.classList.toggle('ok', i === 10); });
    cons.set('Grade: ' + grades[k]);
    info.innerHTML = `Conditions evaluated: <b>${Math.min(k + 1, 9)}</b> of 9. ${k === 9 ? 'None was true, so the final <code>else</code> runs.' : `<code>marks &gt;= ${cuts[k]}</code> is the first true condition.`}`;
  }
  draw();
};

DEMOS.switch = (root) => {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const day = selectEl([1, 2, 3, 4, 5, 6, 7, 9].map((d) => ({ v: d, l: 'day = ' + d })), 3, draw);
  const mode = seg([{ v: 'brk', l: 'with break' }, { v: 'nobrk', l: 'break removed' }, { v: 'arrow', l: 'arrow form (Java 14+)' }], 'brk', draw);
  const wrap = h('div'), cons = consoleEl(), note = h('p', { class: 'small' });
  root.append(demoBox('switch and fall-through', 'Pick a day, then remove the break statements and see execution "fall through" into the following cases.',
    h('div', { class: 'row' }, day, mode.el), h('div', { class: 'cols' }, wrap, h('div', null, cons.el, note))));
  function draw() {
    const d = +day.value, m = mode.get();
    let src;
    if (m === 'arrow') src = 'switch (day) {\n' + names.map((n, i) => `    case ${i + 1} -> System.out.println("${n}");`).join('\n') + '\n    default -> System.out.println("Invalid day");\n}';
    else src = 'switch (day) {\n' + names.map((n, i) => `    case ${i + 1}: System.out.println("${n}");${m === 'brk' ? ' break;' : ''}`).join('\n') + '\n    default: System.out.println("Invalid day");\n}';
    const cv = codeView(src, { small: true }); clear(wrap).append(cv.el);
    const start = d >= 1 && d <= 7 ? d : 8;
    let out = [], run = [];
    if (m === 'nobrk') { for (let k = start; k <= 8; k++) { out.push(k <= 7 ? names[k - 1] : 'Invalid day'); run.push(k + 1); } }
    else { out.push(start <= 7 ? names[start - 1] : 'Invalid day'); run.push(start + 1); }
    cv.mark(run);
    cons.set(out.join('\n'));
    note.innerHTML = m === 'nobrk' ? (start <= 7 ? `Execution enters at <code>case ${start}</code> and, with no <code>break</code>, keeps running every statement below it — ${out.length} lines printed.` : 'No case matches, so only default runs.') :
      m === 'arrow' ? 'The arrow form never falls through, so no break is needed. It is the modern, safer syntax.' : '<code>break</code> jumps out of the switch right after the matching case.';
  }
  draw();
};

DEMOS.loops = (root) => {
  const st = numInput(1, { 'aria-label': 'start' }), en = numInput(5, { 'aria-label': 'end' }), stp = numInput(1, { 'aria-label': 'step', min: '1' });
  const kind = seg([{ v: 'for', l: 'for' }, { v: 'while', l: 'while' }, { v: 'do', l: 'do-while' }], 'for', draw);
  const codeWrap = h('div'), table = h('div', { class: 'scrollx' }), cons = consoleEl(), note = h('p', { class: 'small' });
  [st, en, stp].forEach((e) => e.addEventListener('input', draw));
  root.append(demoBox('Loop explorer', 'Set the start, end and step. The same loop is written three ways; the table shows every check of the condition. Try start = 10 with end = 5 to see how do-while differs.',
    h('div', { class: 'row' }, kind.el, field('start', st), field('end', en), field('step', stp)),
    h('div', { class: 'cols' }, codeWrap, h('div', null, table, cons.el, note))));
  function draw() {
    const s = Math.trunc(+st.value || 0), e = Math.trunc(+en.value || 0), p = Math.trunc(+stp.value || 0), k = kind.get();
    const src = k === 'for' ? `for (int i = ${s}; i <= ${e}; i += ${p}) {\n    System.out.print(i + " ");\n}` :
      k === 'while' ? `int i = ${s};\nwhile (i <= ${e}) {\n    System.out.print(i + " ");\n    i += ${p};\n}` :
        `int i = ${s};\ndo {\n    System.out.print(i + " ");\n    i += ${p};\n} while (i <= ${e});`;
    clear(codeWrap).append(codeView(src).el);
    if (p <= 0) { clear(table).append(h('p', { class: 'bad' }, `A step of ${p} never moves i towards the end: this would be an infinite loop.`)); cons.set(''); note.textContent = ''; return; }
    const rows = []; let i = s, out = '', n = 0;
    if (k === 'do') { out += i + ' '; n++; rows.push([n, i, '(body runs first)']); i += p; }
    while (n < 60) { const c = i <= e; rows.push(['check', i, `${i} <= ${e} → ${c}`]); if (!c) break; out += i + ' '; n++; rows.push([n, i, 'body prints ' + i]); i += p; }
    clear(table).append(...[tableEl(['pass', 'i', 'what happens'], rows.slice(0, 40).map((r) => [r[0], r[1], r[2]]), 'tt loopt'), rows.length > 40 ? h('p', { class: 'small muted' }, '… (table truncated)') : null].filter(Boolean));
    cons.set(out.trim());
    note.innerHTML = `The body ran <b>${n}</b> time(s); the condition was checked <b>${rows.filter((r) => r[0] === 'check').length}</b> time(s). ` + (k === 'do' && s > e ? 'A do-while always runs its body once, even though the condition was false from the start.' : '');
  }
  draw();
};

DEMOS.patterns = (root) => {
  const P = {
    tri: { l: 'Right triangle', src: (n) => `for (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= i; j++) {\n        System.out.print("* ");\n    }\n    System.out.println();\n}`, cell: () => '* ', len: (i) => i },
    inv: { l: 'Inverted', src: (n) => `for (int i = ${n}; i >= 1; i--) {\n    for (int j = 1; j <= i; j++) {\n        System.out.print("* ");\n    }\n    System.out.println();\n}`, cell: () => '* ', len: (i, n) => n - i + 1 },
    num: { l: 'Number triangle', src: (n) => `for (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= i; j++) {\n        System.out.print(j + " ");\n    }\n    System.out.println();\n}`, cell: (i, j) => j + ' ', len: (i) => i },
    floyd: { l: "Floyd's triangle", src: (n) => `int k = 1;\nfor (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= i; j++) {\n        System.out.print(k++ + " ");\n    }\n    System.out.println();\n}`, cell: (i, j) => String((i - 1) * i / 2 + j).padEnd(3, ' '), len: (i) => i },
    pyr: { l: 'Pyramid', src: (n) => `for (int i = 1; i <= ${n}; i++) {\n    for (int s = 1; s <= ${n} - i; s++) System.out.print(" ");\n    for (int j = 1; j <= 2 * i - 1; j++) System.out.print("*");\n    System.out.println();\n}`, cell: () => '*', len: (i) => 2 * i - 1, pad: (i, n) => ' '.repeat(n - i) },
    table: { l: 'Times table', src: (n) => `for (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= ${n}; j++) {\n        System.out.printf("%4d", i * j);\n    }\n    System.out.println();\n}`, cell: (i, j) => String(i * j).padStart(4, ' '), len: (i, n) => n }
  };
  let key = 'tri', n = 5, pos = { i: 1, j: 0 }, done = false;
  const pat = seg(Object.keys(P).map((k) => ({ v: k, l: P[k].l })), key, (v) => { key = v; reset(); });
  const nIn = h('input', { type: 'range', min: '1', max: '9', value: '5', 'aria-label': 'rows', oninput: () => { n = +nIn.value; nv.textContent = 'n = ' + n; reset(); } });
  const nv = h('b', { class: 'mono' }, 'n = 5');
  const codeWrap = h('div'), cons = consoleEl(), status = h('div', { class: 'row tight', style: { margin: '8px 0' } });
  const st = stepper(step, { ms: 180 });
  root.append(demoBox('Nested-loop pattern printer', 'The outer loop picks the row (i); the inner loop prints each item in that row (j). Step through to watch i and j change.',
    h('div', { class: 'row' }, pat.el), h('div', { class: 'row' }, nv, nIn,
      h('button', { type: 'button', class: 'btn sm pri', onclick: () => { st.stop(); step(); } }, 'Step'), st.play,
      h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); while (step()); } }, 'Finish'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); reset(); } }, 'Reset')),
    h('div', { class: 'cols' }, codeWrap, h('div', null, status, cons.el))));
  function text(upToI, upToJ) {
    const p = P[key]; let s = '';
    for (let i = 1; i <= n; i++) {
      if (i > upToI) break;
      if (p.pad) s += p.pad(i, n);
      const L = p.len(i, n);
      for (let j = 1; j <= L; j++) { if (i === upToI && j > upToJ) break; s += p.cell(i, j); }
      if (i < upToI || upToJ >= L) s += '\n';
    }
    return s.replace(/ +\n/g, '\n');
  }
  function paint() {
    const L = P[key].len(pos.i, n);
    clear(status).append(...[kv('row i', String(Math.min(pos.i, n))), kv('item j', String(pos.j)), kv('items in this row', String(L)), done ? h('span', { class: 'ok small' }, 'finished') : null].filter(Boolean));
    cons.set(text(pos.i, pos.j));
  }
  function step() {
    if (done) return false;
    const L = P[key].len(pos.i, n);
    if (pos.j < L) pos.j++;
    else if (pos.i < n) { pos.i++; pos.j = 1; }
    else { done = true; }
    if (pos.i === n && pos.j === P[key].len(n, n)) done = true;
    paint(); return !done;
  }
  function reset() { pos = { i: 1, j: 0 }; done = false; clear(codeWrap).append(codeView(P[key].src(n)).el); paint(); }
  reset();
};

/* ======================= 3. arrays ======================= */
DEMOS.sorting = (root) => {
  const SRC = {
    bubble: `for (int pass = 0; pass < n - 1; pass++) {
    for (int j = 0; j < n - 1 - pass; j++) {
        if (a[j] > a[j + 1]) {
            int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
        }
    }
}`,
    selection: `for (int i = 0; i < n - 1; i++) {
    int min = i;
    for (int j = i + 1; j < n; j++) {
        if (a[j] < a[min]) min = j;
    }
    int t = a[i]; a[i] = a[min]; a[min] = t;
}`,
    insertion: `for (int i = 1; i < n; i++) {
    int key = a[i];
    int j = i - 1;
    while (j >= 0 && a[j] > key) {
        a[j + 1] = a[j];
        j--;
    }
    a[j + 1] = key;
}`
  };
  function record(alg, arr) {
    const a = arr.slice(), n = a.length, S = []; let cmp = 0, mov = 0;
    const snap = (line, msg, o) => S.push(Object.assign({ a: a.slice(), line, msg, cmp, mov, sorted: [], hi: [], sw: [] }, o || {}));
    snap(1, 'Start. Press Step or Play.');
    if (alg === 'bubble') {
      for (let pass = 0; pass < n - 1; pass++) {
        let swapped = false;
        for (let j = 0; j < n - 1 - pass; j++) {
          cmp++; const sorted = range(pass).map((k) => n - 1 - k);
          snap(3, `Pass ${pass + 1}: compare a[${j}]=${a[j]} and a[${j + 1}]=${a[j + 1]}.`, { hi: [j, j + 1], sorted });
          if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; mov++; swapped = true; snap(4, `${a[j + 1]} > ${a[j]} → swap.`, { sw: [j, j + 1], sorted }); }
        }
        snap(1, `End of pass ${pass + 1}: the largest remaining value has bubbled to index ${n - 1 - pass}.`, { sorted: range(pass + 1).map((k) => n - 1 - k) });
        if (!swapped) { snap(1, 'No swaps in this pass — an optimised version could stop early here.', { sorted: range(pass + 1).map((k) => n - 1 - k) }); }
      }
    } else if (alg === 'selection') {
      for (let i = 0; i < n - 1; i++) {
        let min = i; const sorted = range(i);
        snap(2, `Pass ${i + 1}: assume a[${i}]=${a[i]} is the minimum.`, { hi: [i], sorted, min });
        for (let j = i + 1; j < n; j++) {
          cmp++;
          if (a[j] < a[min]) { min = j; snap(4, `a[${j}]=${a[j]} is smaller → new minimum at index ${j}.`, { hi: [j], sorted, min }); }
          else snap(4, `a[${j}]=${a[j]} is not smaller than ${a[min]}.`, { hi: [j], sorted, min });
        }
        if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; mov++; }
        snap(6, min !== i ? `Swap the minimum into position ${i}.` : `a[${i}] is already the minimum — no swap needed.`, { sw: min !== i ? [i, min] : [], sorted: range(i + 1) });
      }
    } else {
      for (let i = 1; i < n; i++) {
        const key = a[i]; let j = i - 1;
        snap(2, `Take key = a[${i}] = ${key} and insert it into the sorted part a[0..${i - 1}].`, { hi: [i], sorted: range(i), key });
        while (j >= 0) {
          cmp++;
          if (a[j] > key) { a[j + 1] = a[j]; mov++; snap(5, `a[${j}]=${a[j]} > ${key} → shift it right.`, { sw: [j + 1], sorted: range(i + 1), key }); j--; }
          else { snap(4, `a[${j}]=${a[j]} ≤ ${key} → stop shifting.`, { hi: [j], sorted: range(i + 1), key }); break; }
        }
        a[j + 1] = key;
        snap(8, `Place ${key} at index ${j + 1}.`, { sw: [j + 1], sorted: range(i + 1) });
      }
    }
    snap(1, `Sorted! ${cmp} comparisons, ${mov} ${alg === 'insertion' ? 'shifts' : 'swaps'}.`, { sorted: range(n) });
    return S;
  }
  let alg = 'bubble', base = [], steps = [], k = 0;
  const algSeg = seg([{ v: 'bubble', l: 'Bubble sort' }, { v: 'selection', l: 'Selection sort' }, { v: 'insertion', l: 'Insertion sort' }], alg, (v) => { alg = v; rebuild(); });
  const bars = h('div', { class: 'bars' }), msg = h('div', { class: 'trace-note' }), stats = h('div', { class: 'row tight' }), codeWrap = h('div');
  const st = stepper(() => { if (k >= steps.length - 1) return false; k++; paint(); return true; }, { ms: 650 });
  root.append(demoBox('Sorting visualizer', 'Watch each comparison and swap. Orange bars are being compared, red bars just moved, blue bars are in their final place.',
    h('div', { class: 'row' }, algSeg.el, h('button', { type: 'button', class: 'btn sm', onclick: () => { newArr(); rebuild(); } }, 'New random array'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { base = [9, 8, 7, 6, 5, 4, 3, 2]; rebuild(); } }, 'Worst case'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { base = [1, 2, 3, 4, 5, 6, 7, 8]; rebuild(); } }, 'Already sorted')),
    h('div', { class: 'cols' }, h('div', null, bars, msg, stats), codeWrap),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); k = Math.max(0, k - 1); paint(); } }, '◀ Back'),
      h('button', { type: 'button', class: 'btn sm pri', onclick: () => { st.stop(); k = Math.min(steps.length - 1, k + 1); paint(); } }, 'Step ▶'), st.play,
      h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); k = steps.length - 1; paint(); } }, 'Finish'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); k = 0; paint(); } }, 'Reset'))));
  let cv;
  function newArr() { base = shuffle(range(90).map((x) => x + 10)).slice(0, 8); }
  function rebuild() { st.stop(); steps = record(alg, base); k = 0; cv = codeView(SRC[alg]); clear(codeWrap).append(cv.el); paint(); }
  function paint() {
    const s = steps[k], mx = Math.max(...s.a);
    clear(bars);
    s.a.forEach((v, i) => bars.append(h('div', { class: 'bar' + (s.sorted.includes(i) ? ' done' : '') + (s.hi.includes(i) ? ' cmp' : '') + (s.sw.includes(i) ? ' swp' : '') + (s.min === i ? ' min' : '') },
      h('span', { class: 'bv' }, String(v)), h('i', { style: { height: (18 + (v / mx) * 150) + 'px' } }), h('small', null, String(i)))));
    msg.textContent = s.msg;
    clear(stats).append(...[kv('step', `${k + 1} / ${steps.length}`), kv('comparisons', String(s.cmp)), kv(alg === 'insertion' ? 'shifts' : 'swaps', String(s.mov)), s.key !== undefined ? kv('key', String(s.key)) : null].filter(Boolean));
    cv.mark(s.line);
  }
  newArr(); rebuild();
};

DEMOS.searching = (root) => {
  const arr = [3, 8, 12, 17, 21, 26, 30, 35, 41, 48, 52, 60];
  const SRC = {
    linear: `for (int i = 0; i < a.length; i++) {
    if (a[i] == target) return i;
}
return -1;`,
    binary: `int low = 0, high = a.length - 1;
while (low <= high) {
    int mid = (low + high) / 2;
    if (a[mid] == target) return mid;
    else if (a[mid] < target) low = mid + 1;
    else high = mid - 1;
}
return -1;`
  };
  let alg = 'binary', steps = [], k = 0, cv;
  const tIn = numInput(41, { 'aria-label': 'target' });
  const algSeg = seg([{ v: 'linear', l: 'Linear search' }, { v: 'binary', l: 'Binary search' }], alg, (v) => { alg = v; rebuild(); });
  const cells = h('div', { class: 'cells' }), msg = h('div', { class: 'trace-note' }), stats = h('div', { class: 'row tight' }), codeWrap = h('div');
  tIn.addEventListener('input', rebuild);
  const st = stepper(() => { if (k >= steps.length - 1) return false; k++; paint(); return true; }, { ms: 900 });
  root.append(demoBox('Searching a sorted array', 'Linear search checks every element in turn; binary search halves the remaining range each time — but only works on sorted data.',
    h('div', { class: 'row' }, algSeg.el, field('int target =', tIn), ...[41, 3, 60, 25].map((v) => h('button', { type: 'button', class: 'btn sm', onclick: () => { tIn.value = v; rebuild(); } }, String(v)))),
    cells, h('div', { class: 'cols' }, h('div', null, msg, stats), codeWrap),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm pri', onclick: () => { st.stop(); k = Math.min(steps.length - 1, k + 1); paint(); } }, 'Step ▶'), st.play,
      h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); k = 0; paint(); } }, 'Reset'))));
  function rebuild() {
    st.stop(); const t = Math.trunc(+tIn.value); steps = []; let cmp = 0;
    const S = (o) => steps.push(Object.assign({ cmp }, o));
    S({ msg: `Search for ${t}.`, line: 1, act: [] });
    if (alg === 'linear') {
      let found = -1;
      for (let i = 0; i < arr.length; i++) { cmp++; if (arr[i] === t) { S({ msg: `a[${i}] = ${arr[i]} equals ${t} → found at index ${i}.`, line: 2, act: [i], found: i }); found = i; break; } S({ msg: `a[${i}] = ${arr[i]} ≠ ${t}.`, line: 2, act: [i], seen: range(i + 1) }); }
      if (found < 0) S({ msg: `Checked all ${arr.length} elements — not found, return -1.`, line: 4, act: [], seen: range(arr.length) });
    } else {
      let lo = 0, hi = arr.length - 1, found = -1;
      while (lo <= hi) {
        const mid = Math.trunc((lo + hi) / 2); cmp++;
        S({ msg: `low = ${lo}, high = ${hi} → mid = (${lo} + ${hi}) / 2 = ${mid}; a[mid] = ${arr[mid]}.`, line: 3, act: [mid], lo, hi, mid });
        if (arr[mid] === t) { S({ msg: `${arr[mid]} == ${t} → found at index ${mid}!`, line: 4, act: [mid], lo, hi, mid, found: mid }); found = mid; break; }
        if (arr[mid] < t) { S({ msg: `${arr[mid]} < ${t} → the target can only be to the right: low = ${mid + 1}.`, line: 5, act: [mid], lo: mid + 1, hi, mid }); lo = mid + 1; }
        else { S({ msg: `${arr[mid]} > ${t} → the target can only be to the left: high = ${mid - 1}.`, line: 6, act: [mid], lo, hi: mid - 1, mid }); hi = mid - 1; }
      }
      if (found < 0) S({ msg: `low (${lo}) > high (${hi}): the range is empty — not found, return -1.`, line: 8, act: [], lo, hi });
    }
    k = 0; cv = codeView(SRC[alg]); clear(codeWrap).append(cv.el); paint();
  }
  function paint() {
    const s = steps[k];
    clear(cells);
    arr.forEach((v, i) => {
      const out = s.lo !== undefined && (i < s.lo || i > s.hi);
      cells.append(h('div', { class: 'cell' + (s.act.includes(i) ? ' cmp' : '') + (s.found === i ? ' found' : '') + (out ? ' out' : '') + (s.seen && s.seen.includes(i) && s.found !== i ? ' seen' : '') },
        h('b', null, String(v)), h('small', null, String(i)),
        h('span', { class: 'ptr' }, [s.lo === i ? 'low' : null, s.mid === i ? 'mid' : null, s.hi === i ? 'high' : null].filter(Boolean).join(' '))));
    });
    msg.textContent = s.msg;
    clear(stats).append(kv('step', `${k + 1} / ${steps.length}`), kv('comparisons so far', String(steps.slice(0, k + 1).filter((x) => x.act.length).length)), kv('array size', String(arr.length)));
    cv.mark(s.line);
  }
  rebuild();
};

DEMOS.grid2d = (root) => {
  let R = 3, Cn = 4, jag = false, order = 'row', pos = -1, cells = [];
  const rs = selectEl([2, 3, 4], R, (v) => { R = +v; reset(); }), cs = selectEl([2, 3, 4, 5], Cn, (v) => { Cn = +v; reset(); });
  const jt = tsw('jagged rows', 0, (v) => { jag = !!v; if (jag) { order = 'row'; os.set('row', true); } reset(); });
  const os = seg([{ v: 'row', l: 'row by row' }, { v: 'col', l: 'column by column' }], 'row', (v) => { if (jag && v === 'col') { os.set('row', true); return; } order = v; reset(); });
  const grid = h('div', { class: 'grid2d' }), side = h('div'), codeWrap = h('div'), cons = consoleEl('Running sums');
  const st = stepper(() => step(), { ms: 450 });
  root.append(demoBox('2D array explorer', 'm[i][j]: i picks the row, j the column. Step through the nested loops and watch the traversal order and the running row sums.',
    h('div', { class: 'row' }, field('rows', rs), field('columns', cs), jt.el, os.el,
      h('button', { type: 'button', class: 'btn sm pri', onclick: () => { st.stop(); step(); } }, 'Step'), st.play, h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); reset(); } }, 'Reset')),
    h('div', { class: 'cols' }, h('div', null, grid, side), h('div', null, codeWrap, cons.el))));
  const rowLen = (i) => (jag ? i + 1 : Cn);
  function val(i, j) { return (i + 1) * 10 + j + 1; }
  function reset() {
    pos = -1; cells = [];
    if (order === 'row') for (let i = 0; i < R; i++) for (let j = 0; j < rowLen(i); j++) cells.push([i, j]);
    else for (let j = 0; j < Cn; j++) for (let i = 0; i < R; i++) cells.push([i, j]);
    const decl = jag ? `int[][] m = new int[${R}][];\nfor (int i = 0; i < m.length; i++) m[i] = new int[i + 1];` : `int[][] m = new int[${R}][${Cn}];`;
    const loop = order === 'row' ? `for (int i = 0; i < m.length; i++) {\n    for (int j = 0; j < m[i].length; j++) {\n        sum[i] += m[i][j];\n    }\n}` : `for (int j = 0; j < ${Cn}; j++) {\n    for (int i = 0; i < m.length; i++) {\n        colSum[j] += m[i][j];\n    }\n}`;
    clear(codeWrap).append(codeView(decl + '\n' + loop, { small: true }).el);
    paint();
  }
  function step() { if (pos >= cells.length - 1) return false; pos++; paint(); return pos < cells.length - 1; }
  function paint() {
    clear(grid); grid.style.gridTemplateColumns = `auto repeat(${Cn}, 52px)`;
    grid.append(h('div', { class: 'g2h' }), ...range(Cn).map((j) => h('div', { class: 'g2h' }, 'j=' + j)));
    const visited = new Set(cells.slice(0, pos + 1).map(([i, j]) => i + ',' + j));
    const cur = pos >= 0 ? cells[pos] : null;
    for (let i = 0; i < R; i++) {
      grid.append(h('div', { class: 'g2h' }, 'i=' + i));
      for (let j = 0; j < Cn; j++) {
        if (j >= rowLen(i)) { grid.append(h('div', { class: 'g2c none' }, '')); continue; }
        const isCur = cur && cur[0] === i && cur[1] === j;
        grid.append(h('div', { class: 'g2c' + (visited.has(i + ',' + j) ? ' seen' : '') + (isCur ? ' cur' : ''), title: `m[${i}][${j}]` }, String(val(i, j))));
      }
    }
    grid.style.gridTemplateColumns = `44px repeat(${Cn}, minmax(40px, 58px))`;
    clear(side).append(h('p', { class: 'small', style: { marginTop: '10px' } }, cur ? h('span', null, 'Now reading ', h('code', null, `m[${cur[0]}][${cur[1]}]`), ` = ${val(cur[0], cur[1])}. Visit ${pos + 1} of ${cells.length}.`) : `m.length = ${R} rows${jag ? '; each row has a different length (m[i].length = i + 1)' : `; every m[i].length = ${Cn}`}.`));
    const lines = [];
    if (order === 'row') for (let i = 0; i < R; i++) { let s = 0; cells.slice(0, pos + 1).forEach(([a, b]) => { if (a === i) s += val(a, b); }); lines.push(`sum[${i}] = ${s}`); }
    else for (let j = 0; j < Cn; j++) { let s = 0; cells.slice(0, pos + 1).forEach(([a, b]) => { if (b === j) s += val(a, b); }); lines.push(`colSum[${j}] = ${s}`); }
    cons.set(lines.join('\n'));
  }
  reset();
};
