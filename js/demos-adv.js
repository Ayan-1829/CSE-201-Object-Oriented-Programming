/* ===================== demos-adv.js : topics 10–13 ===================== */

/* ======================= 10. catch-clause matcher ======================= */
DEMOS.exmatch = (root) => {
  const P = { Throwable: null, Exception: 'Throwable', RuntimeException: 'Exception', ArithmeticException: 'RuntimeException', IllegalArgumentException: 'RuntimeException', NumberFormatException: 'IllegalArgumentException', IndexOutOfBoundsException: 'RuntimeException', ArrayIndexOutOfBoundsException: 'IndexOutOfBoundsException', NullPointerException: 'RuntimeException', IOException: 'Exception', FileNotFoundException: 'IOException' };
  const isA = (c, p) => { while (c) { if (c === p) return true; c = P[c]; } return false; };
  const checked = (c) => isA(c, 'Exception') && !isA(c, 'RuntimeException');
  const BODY = {
    none: ['int q = 10 / 2;', null, ''], ArithmeticException: ['int q = 10 / 0;', 'ArithmeticException', '/ by zero'],
    NumberFormatException: ['int n = Integer.parseInt("x");', 'NumberFormatException', 'For input string: "x"'],
    ArrayIndexOutOfBoundsException: ['int[] a = new int[3];  a[5] = 1;', 'ArrayIndexOutOfBoundsException', 'Index 5 out of bounds for length 3'],
    NullPointerException: ['String s = null;  int n = s.length();', 'NullPointerException', 'Cannot invoke "String.length()" because "s" is null'],
    FileNotFoundException: ['FileReader r = new FileReader("data.txt");', 'FileNotFoundException', 'data.txt (No such file or directory)']
  };
  let body = 'ArithmeticException', catches = ['ArithmeticException', 'Exception'], fin = 1;
  const bSel = selectEl(Object.keys(BODY).map((k) => ({ v: k, l: k === 'none' ? 'no exception' : k })), body, (v) => { body = v; draw(); });
  const addSel = selectEl(['ArithmeticException', 'NumberFormatException', 'IllegalArgumentException', 'ArrayIndexOutOfBoundsException', 'NullPointerException', 'RuntimeException', 'FileNotFoundException', 'IOException', 'Exception'], 'RuntimeException');
  const finT = tsw('finally block', fin, (v) => { fin = v; draw(); });
  const chips = h('div', { class: 'chips' }), codeWrap = h('div'), res = h('div'), cons = consoleEl();
  root.append(demoBox('Catch-clause matcher', 'Choose what the try block throws and build the list of catch clauses. Catches are tried top to bottom; the first one whose type IS-A match wins.',
    h('div', { class: 'row tight' }, h('span', { class: 'small muted' }, 'try block throws:'), bSel, finT.el),
    h('div', { class: 'row tight', style: { marginTop: '8px' } }, h('span', { class: 'small muted' }, 'catch clauses:'), chips, addSel,
      h('button', { type: 'button', class: 'btn sm', onclick: () => { if (catches.length < 5) catches.push(addSel.value); draw(); } }, '+ add catch')),
    h('div', { class: 'cols' }, codeWrap, h('div', null, res, cons.el))));
  function draw() {
    clear(chips);
    catches.forEach((c, i) => chips.append(h('span', { class: 'chip' }, c,
      h('button', { type: 'button', title: 'move up', onclick: () => { if (i) { [catches[i - 1], catches[i]] = [catches[i], catches[i - 1]]; draw(); } } }, '↑'),
      h('button', { type: 'button', title: 'remove', onclick: () => { catches.splice(i, 1); draw(); } }, '✕'))));
    const [stmt, thrown, msg] = BODY[body];
    const lines = ['try {', '    ' + stmt, '    System.out.println("try finished");'];
    catches.forEach((c) => lines.push(`} catch (${c} e) {`, `    System.out.println("caught by ${c}");`));
    if (fin) lines.push('} finally {', '    System.out.println("finally");');
    lines.push('}', 'System.out.println("after try");');
    const cv = codeView(lines.join('\n'), { small: true }); clear(codeWrap).append(cv.el);
    clear(res);
    /* compile checks */
    for (let i = 0; i < catches.length; i++) for (let j = 0; j < i; j++) if (isA(catches[i], catches[j])) {
      res.append(h('div', { class: 'verdict bad' }, `✗ Compile error: exception ${catches[i]} has already been caught`), h('p', { class: 'small' }, `${catches[j]} is listed first and already covers ${catches[i]}, so that clause could never run. Put the more specific type first.`));
      cons.set(''); return;
    }
    const bad = catches.find((c) => checked(c) && c !== 'Exception' && !(thrown && checked(thrown) && (isA(thrown, c) || isA(c, thrown))));
    if (bad) { res.append(h('div', { class: 'verdict bad' }, `✗ Compile error: exception ${bad} is never thrown in body of corresponding try statement`), h('p', { class: 'small' }, 'You may only catch a checked exception if the try block can actually throw it.')); cons.set(''); return; }
    if (thrown && checked(thrown) && !catches.some((c) => isA(thrown, c))) { res.append(h('div', { class: 'verdict bad' }, `✗ Compile error: unreported exception ${thrown}; must be caught or declared to be thrown`), h('p', { class: 'small' }, 'FileNotFoundException is checked: the compiler forces you to handle it (catch FileNotFoundException, IOException or Exception) or add throws to the method.')); cons.set(''); return; }
    /* run */
    const out = []; const run = [1, 2];
    const hi = thrown ? catches.findIndex((c) => isA(thrown, c)) : -1;
    if (!thrown) { out.push('try finished'); run.push(3); }
    if (hi >= 0) { out.push('caught by ' + catches[hi]); run.push(4 + hi * 2, 5 + hi * 2); }
    const finLine = 4 + catches.length * 2;
    if (fin) { out.push('finally'); run.push(finLine, finLine + 1); }
    const afterLine = finLine + (fin ? 3 : 1);
    if (!thrown || hi >= 0) { out.push('after try'); run.push(afterLine); }
    else out.push(`Exception in thread "main" java.lang.${thrown === 'FileNotFoundException' ? 'io.' : ''}${thrown}: ${msg}\n\tat Main.main(Main.java:2)`);
    cv.mark(run, 'cur');
    res.append(!thrown ? h('div', { class: 'verdict ok' }, '✓ No exception: every catch is skipped.') : hi >= 0 ? h('div', { class: 'verdict ok' }, `✓ ${thrown} is caught by catch (${catches[hi]}), because ${thrown} IS-A ${catches[hi]}.`) :
      h('div', { class: 'verdict bad' }, `✗ No catch matches ${thrown}. ${fin ? 'finally still runs, then the' : 'The'} exception propagates out of main and the program crashes.`));
    cons.set(out.join('\n'));
  }
  draw();
};

/* ======================= 11. threads ======================= */
DEMOS.interleave = (root) => {
  let join = 1, useRun = 0;
  const joinT = tsw('join() both threads before "main done"', join, (v) => { join = v; go(); });
  const runT = tsw('call run() instead of start()', useRun, (v) => { useRun = v; go(); });
  const codeWrap = h('div'), outBox = h('div', { class: 'tlog' }), note = h('p', { class: 'small' });
  root.append(demoBox('Two threads, many possible outputs', 'The scheduler decides when each thread runs, so every run can interleave differently. Each thread keeps its own order, though.',
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm pri', onclick: go }, '↻ Run the program again'), joinT.el, runT.el),
    h('div', { class: 'cols' }, codeWrap, h('div', null, outBox, note))));
  function go() {
    clear(codeWrap).append(codeView(`Runnable job = () -> {
    for (int i = 1; i <= 3; i++)
        System.out.println(Thread.currentThread().getName() + " " + i);
};
Thread a = new Thread(job, "A");
Thread b = new Thread(job, "B");
a.${useRun ? 'run' : 'start'}();
b.${useRun ? 'run' : 'start'}();
${join ? 'a.join();\nb.join();\n' : ''}System.out.println("main done");`, { small: true }).el);
    let out = [];
    if (useRun) out = [['main', 'main 1'], ['main', 'main 2'], ['main', 'main 3'], ['main', 'main 1'], ['main', 'main 2'], ['main', 'main 3'], ['main', 'main done']];
    else {
      const qa = [1, 2, 3].map((i) => ['A', 'A ' + i]), qb = [1, 2, 3].map((i) => ['B', 'B ' + i]);
      let mainDone = false;
      while (qa.length || qb.length || !mainDone) {
        const opts = []; if (qa.length) opts.push('a'); if (qb.length) opts.push('b'); if (!mainDone && (!join || (!qa.length && !qb.length))) opts.push('m');
        const c = pick(opts);
        if (c === 'a') out.push(qa.shift()); else if (c === 'b') out.push(qb.shift()); else { out.push(['main', 'main done']); mainDone = true; }
      }
    }
    clear(outBox).append(...out.map(([t, s]) => h('div', { class: 'tl-' + t }, s)));
    note.innerHTML = useRun ? '<b>run()</b> is just an ordinary method call: everything executes in the <b>main</b> thread, one after the other. Only <b>start()</b> creates a new thread.' :
      join ? 'A and B interleave unpredictably, but <code>join()</code> makes main wait for both, so "main done" is always last.' : 'Without join(), main keeps going: "main done" can appear before, between or after the other lines.';
  }
  go();
};

DEMOS.race = (root) => {
  const N = 2;
  let S;
  const syncT = tsw('synchronized', 0, () => reset());
  const lanes = h('div', { class: 'lanes' }), shared = h('div', { class: 'shared' }), logBox = h('div', { class: 'tlog small' }), result = h('div');
  root.append(demoBox('Race-condition lab', 'count++ is really three steps: read, add, write. Step the two threads by hand. Can you make them lose an update? Then switch synchronized on and try again.',
    h('div', { class: 'row' }, syncT.el, h('button', { type: 'button', class: 'btn sm pri', onclick: () => step(0) }, 'Step T1'), h('button', { type: 'button', class: 'btn sm pri', onclick: () => step(1) }, 'Step T2'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => step(rnd(2)) }, 'Random step'), h('button', { type: 'button', class: 'btn sm', onclick: badSchedule }, 'Show a bad schedule'), h('button', { type: 'button', class: 'btn sm', onclick: reset }, 'Reset')),
    shared, lanes, result, logBox));
  const OPS = ['tmp = count;', 'tmp = tmp + 1;', 'count = tmp;'];
  function reset() { S = { count: 0, lock: null, t: [0, 1].map(() => ({ left: N, ph: 0, tmp: null, state: 'RUNNABLE' })), log: [] }; paint(); }
  function step(k) {
    const T = S.t[k], name = 'T' + (k + 1), sync = syncT.get();
    if (!T.left) { S.log.push(`${name} has already finished.`); return paint(); }
    if (sync && T.ph === 0) {
      if (S.lock !== null && S.lock !== k) { T.state = 'BLOCKED'; S.log.push(`${name} tries to enter the synchronized block but T${S.lock + 1} holds the lock → ${name} is BLOCKED.`); return paint(); }
      S.lock = k; T.state = 'RUNNABLE';
    }
    if (T.ph === 0) { T.tmp = S.count; S.log.push(`${name}: read count (${S.count}) into its own tmp.`); }
    else if (T.ph === 1) { T.tmp++; S.log.push(`${name}: tmp + 1 = ${T.tmp} (only in ${name}'s stack).`); }
    else { S.count = T.tmp; S.log.push(`${name}: write ${T.tmp} back to the shared count.`); T.left--; if (sync) { S.lock = null; S.log.push(`${name} leaves the synchronized block and releases the lock.`); S.t.forEach((o) => { if (o.state === 'BLOCKED') o.state = 'RUNNABLE'; }); } }
    T.ph = (T.ph + 1) % 3;
    if (!T.left) T.state = 'TERMINATED';
    paint();
  }
  function badSchedule() { reset(); if (syncT.get()) syncT.set(0, true); [0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1].forEach((k) => step(k)); }
  function paint() {
    clear(shared).append(...[h('div', { class: 'shared-box' }, h('small', null, 'shared heap'), h('b', null, 'count = ' + S.count)), syncT.get() ? h('div', { class: 'shared-box lock' }, h('small', null, 'lock'), h('b', null, S.lock === null ? 'free' : 'held by T' + (S.lock + 1))) : null].filter(Boolean));
    clear(lanes);
    S.t.forEach((T, k) => {
      const code = h('div', { class: 'lane-code' }, syncT.get() ? h('div', { class: 'mono small muted' }, 'synchronized (this) {') : null,
        ...OPS.map((op, i) => h('div', { class: 'mono lane-op' + (T.left && T.ph === i ? ' next' : '') }, (syncT.get() ? '    ' : '') + op)), syncT.get() ? h('div', { class: 'mono small muted' }, '}') : null);
      lanes.append(h('div', { class: 'lane' + (T.state === 'BLOCKED' ? ' blocked' : '') + (T.state === 'TERMINATED' ? ' done' : '') },
        h('div', { class: 'lane-h' }, h('b', null, 'T' + (k + 1)), h('span', { class: 'pill' }, T.state)),
        code, h('div', { class: 'row tight' }, kv('tmp', T.tmp === null ? '—' : String(T.tmp)), kv('increments left', String(T.left)))));
    });
    clear(logBox).append(...S.log.slice(-8).map((l) => h('div', null, l)));
    const fin = S.t.every((T) => !T.left);
    clear(result);
    if (fin) result.append(S.count === 2 * N ? h('div', { class: 'verdict ok' }, `✓ count = ${S.count}: both threads' updates survived.`) : h('div', { class: 'verdict bad' }, `✗ count = ${S.count}, expected ${2 * N}: an update was lost because both threads read the same old value.`));
  }
  reset();
};

DEMOS.prodcons = (root) => {
  const CAP = 3;
  let S;
  const src = `synchronized void put(int item) throws InterruptedException {
    while (queue.size() == CAPACITY) wait();   // full → producer waits
    queue.add(item);
    notifyAll();                               // wake a waiting consumer
}
synchronized int take() throws InterruptedException {
    while (queue.isEmpty()) wait();            // empty → consumer waits
    int item = queue.remove();
    notifyAll();                               // wake a waiting producer
    return item;
}`;
  const cv = codeView(src, { small: true });
  const bufBox = h('div', { class: 'buffer' }), states = h('div', { class: 'row tight' }), logBox = h('div', { class: 'tlog small' });
  root.append(demoBox('Producer–consumer with wait() and notifyAll()', `A bounded buffer holds ${CAP} items. Press the buttons to let each thread try its next operation. A waiting thread can only continue after the other thread calls notifyAll().`,
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm pri', onclick: () => act('p') }, 'Producer: put()'), h('button', { type: 'button', class: 'btn sm pri', onclick: () => act('c') }, 'Consumer: take()'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => act(pick(['p', 'c'])) }, 'Random'), h('button', { type: 'button', class: 'btn sm', onclick: reset }, 'Reset')),
    h('div', { class: 'cols' }, h('div', null, bufBox, states, logBox), cv.el)));
  function reset() { S = { q: [], next: 1, p: 'RUNNABLE', c: 'RUNNABLE', log: ['Both threads are ready.'] }; cv.mark([]); paint(); }
  function wake(who) { if (S[who] === 'WAITING') { S[who] = 'RUNNABLE'; S.log.push(`notifyAll() wakes the ${who === 'p' ? 'producer' : 'consumer'}; it will re-check its condition.`); } }
  function act(who) {
    if (S[who] === 'WAITING') { S.log.push(`The ${who === 'p' ? 'producer' : 'consumer'} is WAITING — it cannot run until the other thread calls notifyAll().`); return paint(); }
    if (who === 'p') {
      if (S.q.length === CAP) { S.p = 'WAITING'; S.log.push('Buffer full → producer calls wait() and releases the lock.'); cv.mark([2]); }
      else { const it = S.next++; S.q.push(it); S.log.push(`Producer put item ${it}.`); cv.mark([3, 4]); wake('c'); }
    } else {
      if (!S.q.length) { S.c = 'WAITING'; S.log.push('Buffer empty → consumer calls wait() and releases the lock.'); cv.mark([7]); }
      else { const it = S.q.shift(); S.log.push(`Consumer took item ${it}.`); cv.mark([8, 9, 10]); wake('p'); }
    }
    paint();
  }
  function paint() {
    clear(bufBox).append(...range(CAP).map((i) => h('div', { class: 'slot' + (S.q[i] !== undefined ? ' full' : '') }, S.q[i] !== undefined ? String(S.q[i]) : '')));
    clear(states).append(kv('producer', S.p, S.p === 'WAITING' ? 'warn' : ''), kv('consumer', S.c, S.c === 'WAITING' ? 'warn' : ''), kv('items in buffer', `${S.q.length} / ${CAP}`));
    clear(logBox).append(...S.log.slice(-7).map((l) => h('div', null, l)));
  }
  reset();
};

/* ======================= 12. strings ======================= */
DEMOS.strings = (root) => {
  const M = [
    ['length()', 0], ['charAt(i)', 1, 'int'], ['indexOf(str)', 1, 'str'], ['lastIndexOf(str)', 1, 'str'], ['substring(a)', 1, 'int'], ['substring(a, b)', 2, 'int'],
    ['toUpperCase()', 0], ['toLowerCase()', 0], ['trim()', 0], ['replace(a, b)', 2, 'str'], ['contains(str)', 1, 'str'], ['startsWith(str)', 1, 'str'], ['endsWith(str)', 1, 'str'],
    ['equals(str)', 1, 'str'], ['equalsIgnoreCase(str)', 1, 'str'], ['compareTo(str)', 1, 'str'], ['split(regex)', 1, 'str'], ['concat(str)', 1, 'str'], ['repeat(n)', 1, 'int'], ['isEmpty()', 0]];
  const sIn = textInput('Object Oriented', { style: { width: '240px' }, 'aria-label': 'string s' });
  const mSel = selectEl(M.map((m) => m[0]), 'substring(a, b)', setup);
  const a1 = textInput('0'), a2 = textInput('6');
  const argBox = h('span', { class: 'row tight' }), ruler = h('div', { class: 'ruler' }), res = h('div');
  [sIn, a1, a2].forEach((e) => e.addEventListener('input', draw));
  root.append(demoBox('String method playground', 'Every call returns a NEW value — the original string never changes. Index positions are shown under each character.',
    h('div', { class: 'row' }, field('String s =', sIn), field('method', mSel), argBox), ruler, res));
  function setup() {
    const m = M.find((x) => x[0] === mSel.value);
    const def = { 'charAt(i)': ['4'], 'indexOf(str)': ['e'], 'lastIndexOf(str)': ['e'], 'substring(a)': ['7'], 'substring(a, b)': ['0', '6'], 'replace(a, b)': ['e', '3'], 'contains(str)': ['Orient'], 'startsWith(str)': ['Obj'], 'endsWith(str)': ['ted'], 'equals(str)': ['object oriented'], 'equalsIgnoreCase(str)': ['object oriented'], 'compareTo(str)': ['Object'], 'split(regex)': [' '], 'concat(str)': ['!'], 'repeat(n)': ['2'] }[m[0]] || [];
    a1.value = def[0] || ''; a2.value = def[1] || '';
    clear(argBox); if (m[1] >= 1) argBox.append(field(m[1] === 2 ? (m[2] === 'int' ? 'a' : 'target') : 'argument', a1)); if (m[1] === 2) argBox.append(field(m[2] === 'int' ? 'b' : 'replacement', a2));
    a1.style.width = a2.style.width = '90px';
    draw();
  }
  const q = (x) => '"' + x + '"';
  function javaTrim(s) { let a = 0, b = s.length; while (a < b && s.charCodeAt(a) <= 32) a++; while (b > a && s.charCodeAt(b - 1) <= 32) b--; return s.slice(a, b); }
  function draw() {
    const s = sIn.value, name = mSel.value, x = a1.value, y = a2.value;
    let hl = [], out, type = 'String', err = null, expr;
    const I = (v) => { if (!/^-?\d+$/.test(v.trim())) throw new Error('an int is needed'); return +v; };
    const oob = (msg) => { err = 'StringIndexOutOfBoundsException: ' + msg; };
    try {
      switch (name) {
        case 'length()': out = s.length; type = 'int'; expr = 's.length()'; break;
        case 'charAt(i)': { const i = I(x); expr = `s.charAt(${i})`; if (i < 0 || i >= s.length) oob(`index ${i}, length ${s.length}`); else { out = "'" + s[i] + "'"; type = 'char'; hl = [i]; } break; }
        case 'indexOf(str)': out = s.indexOf(x); type = 'int'; expr = `s.indexOf(${q(x)})`; if (out >= 0) hl = range(x.length).map((k) => out + k); break;
        case 'lastIndexOf(str)': out = s.lastIndexOf(x); type = 'int'; expr = `s.lastIndexOf(${q(x)})`; if (out >= 0) hl = range(x.length).map((k) => out + k); break;
        case 'substring(a)': { const a = I(x); expr = `s.substring(${a})`; if (a < 0 || a > s.length) oob(`begin ${a}, end ${s.length}, length ${s.length}`); else { out = q(s.slice(a)); hl = range(s.length - a).map((k) => a + k); } break; }
        case 'substring(a, b)': { const a = I(x), b = I(y); expr = `s.substring(${a}, ${b})`; if (a < 0 || b > s.length || a > b) oob(`begin ${a}, end ${b}, length ${s.length}`); else { out = q(s.slice(a, b)); hl = range(b - a).map((k) => a + k); } break; }
        case 'toUpperCase()': out = q(s.toUpperCase()); expr = 's.toUpperCase()'; break;
        case 'toLowerCase()': out = q(s.toLowerCase()); expr = 's.toLowerCase()'; break;
        case 'trim()': out = q(javaTrim(s)); expr = 's.trim()'; break;
        case 'replace(a, b)': out = q(x === '' ? s.split('').join(y).replace(/^/, y) + y : s.split(x).join(y)); expr = `s.replace(${q(x)}, ${q(y)})`; break;
        case 'contains(str)': out = s.includes(x); type = 'boolean'; expr = `s.contains(${q(x)})`; break;
        case 'startsWith(str)': out = s.startsWith(x); type = 'boolean'; expr = `s.startsWith(${q(x)})`; break;
        case 'endsWith(str)': out = s.endsWith(x); type = 'boolean'; expr = `s.endsWith(${q(x)})`; break;
        case 'equals(str)': out = s === x; type = 'boolean'; expr = `s.equals(${q(x)})`; break;
        case 'equalsIgnoreCase(str)': out = s.toLowerCase() === x.toLowerCase(); type = 'boolean'; expr = `s.equalsIgnoreCase(${q(x)})`; break;
        case 'compareTo(str)': {
          type = 'int'; expr = `s.compareTo(${q(x)})`; const n = Math.min(s.length, x.length); out = s.length - x.length;
          for (let k = 0; k < n; k++) if (s[k] !== x[k]) { out = s.charCodeAt(k) - x.charCodeAt(k); hl = [k]; break; }
          break;
        }
        case 'split(regex)': {
          expr = `s.split(${q(x)})`; type = 'String[]';
          let parts = x === '' ? s.split('') : s.split(new RegExp(x));
          while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
          out = '{' + parts.map(q).join(', ') + '}   (length ' + parts.length + ')'; break;
        }
        case 'concat(str)': out = q(s + x); expr = `s.concat(${q(x)})`; break;
        case 'repeat(n)': { const n = I(x); expr = `s.repeat(${n})`; if (n < 0) err = 'IllegalArgumentException: count is negative: ' + n; else out = q(s.repeat(Math.min(n, 20))); break; }
        case 'isEmpty()': out = s.length === 0; type = 'boolean'; expr = 's.isEmpty()'; break;
      }
    } catch (e) { err = 'argument: ' + e.message; }
    clear(ruler);
    s.split('').forEach((ch, i) => ruler.append(h('div', { class: 'rc' + (hl.includes(i) ? ' hl' : '') }, h('b', null, ch === ' ' ? '␣' : ch), h('small', null, String(i)))));
    if (!s.length) ruler.append(h('span', { class: 'small muted' }, '(empty string, length 0)'));
    clear(res).append(err ? h('div', { class: 'verdict bad' }, h('code', null, expr || name), ' throws ', err) :
      h('div', { class: 'verdict ok' }, h('code', null, expr), ' → ', h('b', { class: 'mono' }, String(out)), h('span', { class: 'small muted' }, '   (' + type + ')')),
    h('p', { class: 'small muted' }, `s is still "${s}" — Strings are immutable.`));
  }
  setup();
};

DEMOS.bigadd = (root) => {
  const aIn = textInput('99999999999999999999', { style: { width: '260px' }, 'aria-label': 'first number' }), bIn = textInput('12345678901234567890', { style: { width: '260px' }, 'aria-label': 'second number' });
  const view = h('div', { class: 'bigadd' }), msg = h('div', { class: 'trace-note' }), codeWrap = h('div');
  let A, B, n, col, carry, digits, done;
  const st = stepper(() => step(), { ms: 500 });
  [aIn, bIn].forEach((e) => e.addEventListener('input', reset));
  root.append(demoBox('Adding numbers too big for long', 'long stops at 9 223 372 036 854 775 807. Stored as Strings, numbers can have any number of digits: add them column by column, right to left, exactly like on paper.',
    h('div', { class: 'row' }, field('String a =', aIn), field('String b =', bIn)),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm pri', onclick: () => { st.stop(); step(); } }, 'Next column'), st.play, h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); while (step()); } }, 'Finish'), h('button', { type: 'button', class: 'btn sm', onclick: () => { st.stop(); reset(); } }, 'Reset')),
    h('div', { class: 'cols' }, h('div', null, view, msg), codeWrap)));
  clear(codeWrap).append(codeView(`static String add(String a, String b) {
    StringBuilder sb = new StringBuilder();
    int i = a.length() - 1, j = b.length() - 1, carry = 0;
    while (i >= 0 || j >= 0 || carry > 0) {
        int d1 = i >= 0 ? a.charAt(i--) - '0' : 0;
        int d2 = j >= 0 ? b.charAt(j--) - '0' : 0;
        int sum = d1 + d2 + carry;
        sb.append(sum % 10);
        carry = sum / 10;
    }
    return sb.reverse().toString();
}`, { small: true }).el);
  function reset() {
    const a = aIn.value.trim(), b = bIn.value.trim();
    if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) { clear(view); msg.textContent = 'Type two non-negative whole numbers (digits only).'; done = true; return; }
    A = a; B = b; n = Math.max(A.length, B.length); col = 0; carry = 0; digits = []; done = false; paint('Press "Next column" to add the rightmost digits.');
  }
  function step() {
    if (done) return false;
    const i = A.length - 1 - col, j = B.length - 1 - col;
    if (i < 0 && j < 0 && !carry) { done = true; paint('Done! Reverse the collected digits to get the answer.'); return false; }
    const d1 = i >= 0 ? +A[i] : 0, d2 = j >= 0 ? +B[j] : 0, s = d1 + d2 + carry, c0 = carry;
    digits.unshift(s % 10); carry = Math.floor(s / 10); col++;
    paint(`Column ${col}: ${d1} + ${d2} + carry ${c0} = ${s} → write ${s % 10}, carry ${carry}.`);
    return true;
  }
  function paint(m) {
    const W = n + 1, cur = W - col;
    const row = (t, cls) => h('div', { class: 'brow ' + (cls || '') }, ...t.padStart(W, ' ').split('').map((ch, k) => h('span', { class: col > 0 && k === cur && !done ? 'hl' : '' }, ch === ' ' ? '\u00a0' : ch)));
    clear(view).append(row(A), row('+' + B.padStart(W - 1, ' ')), h('div', { class: 'bline' }), row(digits.join(''), 'bres'), h('div', { class: 'small muted' }, `carry = ${carry}`));
    msg.textContent = m;
    if (done) { let big = ''; try { big = (BigInt(A) + BigInt(B)).toString(); } catch (e) { big = ''; } if (big && big === digits.join('')) msg.textContent = m + ' ✓ Matches BigInteger: ' + big; }
  }
  reset();
};

/* ======================= 13. JavaFX layout playground ======================= */
DEMOS.layouts = (root) => {
  let pane = 'HBox', n = 4, gap = 10, align = 'CENTER', log = [];
  const pSel = seg(['HBox', 'VBox', 'FlowPane', 'GridPane', 'BorderPane', 'StackPane'].map((p) => ({ v: p, l: p })), pane, (v) => { pane = v; draw(); });
  const nSel = selectEl([1, 2, 3, 4, 5, 6], n, (v) => { n = +v; draw(); });
  const gapIn = h('input', { type: 'range', min: '0', max: '30', value: String(gap), 'aria-label': 'spacing', oninput: () => { gap = +gapIn.value; draw(); } });
  const aSel = selectEl(['TOP_LEFT', 'CENTER', 'BOTTOM_RIGHT'], align, (v) => { align = v; draw(); });
  const win = h('div', { class: 'fxwin' }), codeWrap = h('div'), logBox = h('div', { class: 'tlog small' });
  root.append(demoBox('JavaFX layout playground', 'Pick a layout pane and watch how it arranges the same buttons. Click the buttons in the mock window to fire their event handlers.',
    h('div', { class: 'row' }, pSel.el), h('div', { class: 'row', style: { marginTop: '8px' } }, field('buttons', nSel), field('spacing ' + '(px)', gapIn), field('alignment', aSel)),
    h('div', { class: 'cols' }, h('div', null, win, logBox), codeWrap)));
  function draw() {
    const names = range(n).map((i) => 'B' + (i + 1));
    const body = h('div', { class: 'fxbody fx-' + pane.toLowerCase() + ' al-' + align.toLowerCase(), style: { gap: gap + 'px' } });
    const btn = (t, extra) => h('button', { type: 'button', class: 'fxbtn', onclick: () => { log.push(`${t} clicked → its setOnAction handler runs`); paintLog(); }, style: extra || null }, t);
    if (pane === 'BorderPane') ['top', 'left', 'center', 'right', 'bottom'].forEach((r) => body.append(h('div', { class: 'bp-' + r }, btn(r[0].toUpperCase() + r.slice(1)))));
    else if (pane === 'GridPane') names.forEach((t, i) => body.append(btn(t, { gridColumn: String((i % 3) + 1), gridRow: String(Math.floor(i / 3) + 1) })));
    else if (pane === 'StackPane') names.forEach((t, i) => body.append(btn(t + (i === n - 1 ? ' (on top)' : ''), { transform: `translate(${i * 8}px, ${i * 8}px)`, gridArea: '1 / 1' })));
    else names.forEach((t) => body.append(btn(t + (pane === 'FlowPane' ? ' button' : ''))));
    clear(win).append(h('div', { class: 'fxbar' }, h('i'), h('i'), h('i'), h('span', null, 'Layout demo')), body);
    let code;
    if (pane === 'BorderPane') code = `BorderPane root = new BorderPane();\nroot.setTop(new Button("Top"));\nroot.setLeft(new Button("Left"));\nroot.setCenter(new Button("Center"));\nroot.setRight(new Button("Right"));\nroot.setBottom(new Button("Bottom"));`;
    else if (pane === 'GridPane') code = `GridPane root = new GridPane();\nroot.setHgap(${gap}); root.setVgap(${gap});\n` + names.map((t, i) => `root.add(new Button("${t}"), ${i % 3}, ${Math.floor(i / 3)});   // column, row`).join('\n');
    else if (pane === 'StackPane') code = `StackPane root = new StackPane();\nroot.getChildren().addAll(${names.map((t) => `new Button("${t}")`).join(', ')});\n// later children are drawn on top of earlier ones`;
    else code = `${pane} root = new ${pane}(${gap});\n${pane === 'FlowPane' ? `root.setHgap(${gap}); root.setVgap(${gap});\n` : ''}root.setAlignment(Pos.${align});\n` + names.map((t) => `Button ${t.toLowerCase()} = new Button("${t}");\n${t.toLowerCase()}.setOnAction(e -> System.out.println("${t} clicked"));`).join('\n') + `\nroot.getChildren().addAll(${names.map((t) => t.toLowerCase()).join(', ')});`;
    code += `\n\nScene scene = new Scene(root, 360, 220);\nstage.setScene(scene);\nstage.show();`;
    clear(codeWrap).append(codeView(code, { small: true }).el);
    paintLog();
  }
  function paintLog() { clear(logBox).append(h('div', { class: 'muted' }, 'Event log:'), ...(log.length ? log.slice(-5) : ['(click a button in the window)']).map((l) => h('div', null, l))); }
  draw();
};

DEMOS.anim = (root) => {
  const W = 420, H = 220;
  const cvs = h('canvas', { width: W, height: H, class: 'anim-canvas', 'aria-label': 'Bouncing ball animation' });
  const vals = h('div', { class: 'row tight' });
  const speed = h('input', { type: 'range', min: '1', max: '8', value: '3', 'aria-label': 'speed' });
  let x = 60, y = 60, dx = 3, dy = 2, frames = 0, raf = null, running = false;
  const playBtn = h('button', { type: 'button', class: 'btn sm pri', onclick: () => (running ? stop() : start()) }, '▶ Start timer');
  root.append(demoBox('Animation with AnimationTimer', 'An AnimationTimer calls handle() about 60 times a second. Each call moves the ball a little and redraws the canvas; hitting a wall flips the direction.',
    h('div', { class: 'row' }, playBtn, h('button', { type: 'button', class: 'btn sm', onclick: () => { stop(); tick(); } }, 'One frame'), field('speed', speed)),
    h('div', { class: 'cols' }, h('div', null, cvs, vals), codeView(`AnimationTimer timer = new AnimationTimer() {
    @Override
    public void handle(long now) {
        x += dx;  y += dy;
        if (x < R || x > W - R) dx = -dx;   // bounce off left/right
        if (y < R || y > H - R) dy = -dy;   // bounce off top/bottom
        gc.clearRect(0, 0, W, H);
        gc.fillOval(x - R, y - R, 2 * R, 2 * R);
    }
};
timer.start();`, { small: true }).el)));
  const R = 14, ctx = cvs.getContext ? cvs.getContext('2d') : null;
  function col(v, d) { try { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d; } catch (e) { return d; } }
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = col('--sheet-2', '#eef'); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col('--line', '#ccc'); ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    ctx.fillStyle = col('--accent', '#f59e0b'); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    clear(vals).append(kv('frame', String(frames)), kv('x', x.toFixed(0)), kv('y', y.toFixed(0)), kv('dx', dx.toFixed(0)), kv('dy', dy.toFixed(0)));
  }
  function tick() {
    const s = +speed.value / 3; x += dx * s; y += dy * s;
    if (x < R || x > W - R) { dx = -dx; x = Math.max(R, Math.min(W - R, x)); }
    if (y < R || y > H - R) { dy = -dy; y = Math.max(R, Math.min(H - R, y)); }
    frames++; draw();
  }
  function loop() { if (!running) return; tick(); raf = requestAnimationFrame(loop); }
  function start() { if (!cvs.isConnected) return; running = true; playBtn.textContent = '❚❚ timer.stop()'; loop(); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); playBtn.textContent = '▶ Start timer'; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  draw();
};

DEMOS.jdbc = (root) => {
  const ROWS = [[1, 'Ayesha', 'CSE', 3.82], [2, 'Rahim', 'EEE', 3.15], [3, 'Nabila', 'CSE', 3.47], [4, 'Tanvir', 'BBA', 2.98], [5, 'Sadia', 'CSE', 3.91], [6, 'Imran', 'EEE', 3.63], [7, 'Mitu', 'BBA', 3.40], [8, 'Karim', 'CSE', 2.75]];
  let dept = 'CSE', min = 3.0, cur = -1, res = [];
  const dSel = selectEl(['CSE', 'EEE', 'BBA'], dept, (v) => { dept = v; reset(); });
  const mIn = h('input', { type: 'range', min: '2.5', max: '4', step: '0.1', value: String(min), 'aria-label': 'minimum cgpa', oninput: () => { min = +mIn.value; reset(); } });
  const mv = h('b', { class: 'mono' });
  const tableBox = h('div', { class: 'scrollx' }), rsBox = h('div'), codeWrap = h('div'), cons = consoleEl(), note = h('div', { class: 'trace-note' });
  root.append(demoBox('JDBC: running a query and walking the ResultSet', 'The PreparedStatement sends the query with the two ? parameters filled in. The ResultSet cursor starts BEFORE the first row; each rs.next() moves it down and returns false after the last row.',
    h('div', { class: 'row' }, field('dept', dSel), field('min cgpa', h('span', { class: 'row tight' }, mIn, mv)),
      h('button', { type: 'button', class: 'btn sm pri', onclick: next }, 'rs.next()'), h('button', { type: 'button', class: 'btn sm', onclick: reset }, 'Re-run query')),
    h('div', { class: 'cols' }, h('div', null, h('div', { class: 'small muted' }, 'table students'), tableBox, note, cons.el), codeWrap)));
  function reset() {
    mv.textContent = min.toFixed(1); cur = -1; res = ROWS.filter((r) => r[2] === dept && r[3] >= min - 1e-9);
    clear(codeWrap).append(codeView(`String sql = "SELECT name, cgpa FROM students WHERE dept = ? AND cgpa >= ?";
try (Connection con = DriverManager.getConnection(url, user, pass);
     PreparedStatement ps = con.prepareStatement(sql)) {
    ps.setString(1, "${dept}");
    ps.setDouble(2, ${min.toFixed(1)});
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name") + " " + rs.getDouble("cgpa"));
    }
}   // try-with-resources closes ps and con automatically`, { small: true }).el);
    paint('Query executed: ' + res.length + ' matching row(s). The cursor is before the first row.');
  }
  function next() {
    if (cur >= res.length) return paint('The loop already ended: rs.next() returned false.');
    cur++;
    paint(cur < res.length ? `rs.next() → true. The cursor is on row ${cur + 1} of the result.` : 'rs.next() → false: no more rows, so the while loop ends.');
  }
  function paint(m) {
    clear(tableBox).append(h('table', { class: 'tt dbt' }, h('thead', null, h('tr', null, ['id', 'name', 'dept', 'cgpa'].map((c) => h('th', null, c)))),
      h('tbody', null, ROWS.map((r) => { const k = res.indexOf(r); return h('tr', { class: (k >= 0 ? 'match' : '') + (k === cur ? ' act' : '') }, r.map((c, i) => h('td', null, i === 3 ? c.toFixed(2) : String(c)))); }))));
    note.textContent = m;
    cons.set(res.slice(0, Math.min(cur + 1, res.length)).map((r) => `${r[1]} ${javaDouble(r[3])}`).join('\n'));
  }
  reset();
};

DEMOS.canvasdraw = (root) => {
  const W = 400, H = 250;
  const CMDS = [
    ['sky: fillRect(0, 0, 400, 250)', (g) => { g.fillStyle = 'lightblue'; g.fillRect(0, 0, 400, 250); }],
    ['sun: fillOval(300, 30, 60, 60)', (g) => { g.fillStyle = 'gold'; g.beginPath(); g.ellipse(330, 60, 30, 30, 0, 0, Math.PI * 2); g.fill(); }],
    ['grass: fillRect(0, 190, 400, 60)', (g) => { g.fillStyle = 'forestgreen'; g.fillRect(0, 190, 400, 60); }],
    ['walls: fillRect(80, 120, 120, 70)', (g) => { g.fillStyle = 'sienna'; g.fillRect(80, 120, 120, 70); }],
    ['roof: fillPolygon(…, 3)', (g) => { g.fillStyle = 'darkred'; g.beginPath(); g.moveTo(70, 120); g.lineTo(140, 70); g.lineTo(210, 120); g.closePath(); g.fill(); }],
    ['door: fillRect(125, 150, 30, 40)', (g) => { g.fillStyle = 'khaki'; g.fillRect(125, 150, 30, 40); }],
    ['ground line: strokeLine(0, 190, 400, 190)', (g) => { g.strokeStyle = 'black'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 190); g.lineTo(400, 190); g.stroke(); }],
    ['label: fillText("My house", 110, 215)', (g) => { g.fillStyle = 'black'; g.font = '13px system-ui, sans-serif'; g.fillText('My house', 110, 215); }]];
  let k = CMDS.length;
  const cvs = h('canvas', { width: W, height: H, class: 'anim-canvas', 'aria-label': 'Drawing of a house built from canvas commands' });
  const g = cvs.getContext ? cvs.getContext('2d') : null;
  const info = h('div', { class: 'trace-note' });
  const sl = h('input', { type: 'range', min: '0', max: String(CMDS.length), value: String(k), 'aria-label': 'number of drawing commands', oninput: () => { k = +sl.value; draw(); } });
  root.append(h('div', { class: 'demo' }, h('h3', null, 'Build the picture one command at a time'),
    h('p', { class: 'sub' }, 'Later commands paint over earlier ones — the order matters. (0, 0) is the top-left corner; y grows downwards.'),
    cvs, h('div', { class: 'row', style: { marginTop: '8px' } }, field('commands run', sl)), info));
  function draw() {
    if (g) { g.clearRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); CMDS.slice(0, k).forEach(([, f]) => f(g)); }
    info.textContent = k ? `${k} of ${CMDS.length}: last drawn → ${CMDS[k - 1][0]}` : 'Empty canvas (nothing drawn yet).';
  }
  draw();
};
