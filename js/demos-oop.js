/* ===================== demos-oop.js : topics 4–9 ===================== */

/* ======================= 4. object factory: references, aliasing, null, GC ======================= */
DEMOS.objects = (root) => {
  const VARS = ['s1', 's2', 's3', 's4'];
  let vars = {}, heap = {}, order = [], nid = 0, log = [];
  const nameIn = textInput('Ann', { style: { width: '90px' }, 'aria-label': 'name' }), gIn = textInput('3.5', { style: { width: '64px' }, 'aria-label': 'cgpa' });
  const vNew = selectEl(VARS, 's1'), vA = selectEl(VARS, 's2'), vB = selectEl(VARS, 's1'), vN = selectEl(VARS, 's1'), vM = selectEl(VARS, 's1'), mIn = textInput('4.0', { style: { width: '64px' }, 'aria-label': 'new cgpa' });
  const stackBox = h('div', { class: 'stack' }), heapBox = h('div', { class: 'heap' }), msg = h('div', { class: 'trace-note', role: 'status' }), codeWrap = h('div');
  const run = (label, fn) => h('button', { type: 'button', class: 'btn sm pri', onclick: fn }, label);
  root.append(demoBox('Object factory: references, aliases and garbage', 'Run Java statements one at a time. Arrows are references; an object with no arrows pointing to it can be garbage-collected.',
    h('div', { class: 'objctl' },
      h('div', { class: 'row tight' }, h('code', null, 'Student'), vNew, h('code', null, '= new Student("'), nameIn, h('code', null, '",'), gIn, h('code', null, ');'), run('Run', doNew)),
      h('div', { class: 'row tight' }, vA, h('code', null, '='), vB, h('code', null, ';'), run('Run', doAlias), h('span', { class: 'small muted' }, 'copy a reference')),
      h('div', { class: 'row tight' }, vN, h('code', null, '= null;'), run('Run', doNull)),
      h('div', { class: 'row tight' }, vM, h('code', null, '.setCgpa('), mIn, h('code', null, ');'), run('Run', doSet), h('span', { class: 'small muted' }, 'change the object through a reference')),
      h('div', { class: 'row tight' }, h('button', { type: 'button', class: 'btn sm', onclick: gc }, '♻ Run garbage collector'), h('button', { type: 'button', class: 'btn sm', onclick: reset }, 'Reset'),
        h('button', { type: 'button', class: 'btn sm', onclick: toggleMotion, 'aria-pressed': 'false' }, 'Pause motion'), h('button', { type: 'button', class: 'btn sm', onclick: replayMotion }, 'Replay motion'))),
    msg,
    h('div', { class: 'objview' },
      h('div', { class: 'mem-sec' }, h('h5', null, 'Stack: main'), stackBox),
      h('div', { class: 'mem-sec' }, h('h5', null, 'Heap'), heapBox),
      h('div', { class: 'mem-sec' }, h('h5', null, 'Statements run'), codeWrap))));
  function say(t, bad) { msg.innerHTML = (bad ? '<b class="bad">' : '') + t + (bad ? '</b>' : ''); }
  function live() { const s = new Set(); Object.values(vars).forEach((v) => { if (v) s.add(v); }); return s; }
  function doNew() {
    const nm = nameIn.value.trim() || 'Student', g = +gIn.value;
    if (Number.isNaN(g)) return say('cgpa must be a number.', 1);
    const id = '#' + (++nid); heap[id] = { name: nm, cgpa: g }; order.push(id);
    motionId = id;
    const v = vNew.value, had = v in vars;
    vars[v] = id; log.push(`${had ? '' : 'Student '}${v} = new Student("${nm}", ${g});`);
    say(`A new Student object ${id} was created on the heap and <code>${v}</code> now refers to it.` + (had ? ' Any object it pointed to before lost one reference.' : ''));
    paint();
  }
  function need(v) { if (!(v in vars)) { say(`error: cannot find symbol <code>${v}</code> — declare it first with <code>Student ${v} = new Student(…)</code>.`, 1); return false; } return true; }
  function doAlias() {
    const a = vA.value, b = vB.value;
    if (!need(b)) return;
    if (a === b) return say('Assigning a variable to itself changes nothing.');
    const had = a in vars; vars[a] = vars[b]; log.push(`${had ? '' : 'Student '}${a} = ${b};`);
    say(vars[b] ? `<code>${a}</code> now refers to the <b>same</b> object as <code>${b}</code> (${vars[b]}). No object was copied.` : `<code>${a}</code> is now null too.`);
    paint();
  }
  function doNull() { const v = vN.value; if (!need(v)) return; vars[v] = null; log.push(`${v} = null;`); say(`<code>${v}</code> no longer refers to anything.`); paint(); }
  function doSet() {
    const v = vM.value; if (!need(v)) return;
    const g = +mIn.value; if (Number.isNaN(g)) return say('cgpa must be a number.', 1);
    if (!vars[v]) { log.push(`${v}.setCgpa(${g});   // 💥`); paint(); return say(`Exception in thread "main" java.lang.NullPointerException: Cannot invoke "Student.setCgpa(double)" because "${v}" is null`, 1); }
    heap[vars[v]].cgpa = g; motionId = vars[v]; log.push(`${v}.setCgpa(${g});`);
    const others = Object.keys(vars).filter((k) => k !== v && vars[k] === vars[v]);
    say(`Object ${vars[v]} changed. ` + (others.length ? `<code>${others.join('</code>, <code>')}</code> refer to the same object, so they "see" the new cgpa too.` : ''));
    paint();
  }
  function gc() {
    const alive = live(), dead = order.filter((id) => !alive.has(id));
    if (!dead.length) return say('Nothing to collect: every object is still reachable.');
    dead.forEach((id) => { delete heap[id]; }); order = order.filter((id) => alive.has(id));
    say(`The garbage collector reclaimed ${dead.join(', ')}. In a real JVM this happens automatically, whenever the JVM decides.`); paint();
  }
  function reset() { vars = {}; heap = {}; order = []; nid = 0; log = []; say('Start by creating an object.'); paint(); }
  function paint() {
    clear(stackBox);
    const ks = VARS.filter((v) => v in vars);
    if (!ks.length) stackBox.append(h('div', { class: 'frame-empty' }, 'no variables yet'));
    else stackBox.append(h('div', { class: 'frame top' }, h('table', { class: 'vars' }, h('tbody', null, ks.map((v) => h('tr', null, h('td', { class: 'vn' }, 'Student ' + v), h('td', null, Tracer.valEl(vars[v] ? { ref: vars[v] } : null))))))));
    clear(heapBox);
    const alive = live();
    if (!order.length) heapBox.append(h('div', { class: 'frame-empty' }, 'empty'));
    order.forEach((id) => {
      const o = heap[id], refs = Object.keys(vars).filter((k) => vars[k] === id);
      const motionClass = motionId === id ? (log[log.length - 1].includes('.setCgpa(') ? ' object-change' : ' object-arrive') : '';
      heapBox.append(h('div', { class: 'obj' + (alive.has(id) ? '' : ' garbage') + motionClass },
        h('div', { class: 'obj-h rc' + (+id.slice(1) % 6) }, h('img', { class: 'student-avatar', src: '../img/student-avatar.svg', alt: '' }), h('span', null, h('b', null, id), ' Student')),
        h('table', { class: 'vars' }, h('tbody', null, h('tr', null, h('td', { class: 'vn' }, 'name'), h('td', null, Tracer.valEl(o.name))), h('tr', null, h('td', { class: 'vn' }, 'cgpa'), h('td', null, Tracer.valEl(D(o.cgpa)))))),
        h('div', { class: 'gc-tag' + (alive.has(id) ? ' live' : '') }, alive.has(id) ? `referenced by ${refs.join(', ')}` : 'no reference → eligible for GC')));
    });
    motionId = null;
    clear(codeWrap).append(log.length ? codeView(log.join('\n'), { small: true }).el : h('div', { class: 'frame-empty' }, 'nothing yet'));
  }
  let motionId = null, motionPaused = false;
  function toggleMotion(e) {
    motionPaused = !motionPaused;
    root.classList.toggle('motion-paused', motionPaused);
    e.currentTarget.textContent = motionPaused ? 'Resume motion' : 'Pause motion';
    e.currentTarget.setAttribute('aria-pressed', String(motionPaused));
  }
  function replayMotion() {
    const objects = heapBox.querySelectorAll('.obj');
    objects.forEach((obj) => obj.classList.remove('object-arrive', 'object-change'));
    void heapBox.offsetWidth;
    objects.forEach((obj) => obj.classList.add('object-arrive'));
  }
  reset();
};

/* ======================= 5. overload resolution ======================= */
DEMOS.overload = (root) => {
  const src = `static void show(int x)            { System.out.println("int");        }
static void show(long x)           { System.out.println("long");       }
static void show(double x)         { System.out.println("double");     }
static void show(String s)         { System.out.println("String");     }
static void show(int x, double y)  { System.out.println("int, double"); }
static void show(double x, int y)  { System.out.println("double, int"); }`;
  const CALLS = [
    ['show(5)', 1, 'The argument is an int, and show(int) is an **exact match**.'],
    ['show(5L)', 2, 'A long literal (suffix L) matches show(long) exactly.'],
    ['show(5.0)', 3, 'A decimal literal is a double → show(double).'],
    ["show('A')", 1, 'There is no show(char). A char can be **widened** to int, long or double; Java picks the most specific one: int.'],
    ['show((byte) 1)', 1, 'byte widens to short, int, long … show(int) is the closest (most specific) applicable method.'],
    ['show(2.5f)', 3, 'float widens only to double → show(double).'],
    ['show("5")', 4, 'A String argument only fits show(String).'],
    ['show(3, 4.5)', 5, '(int, double) matches show(int x, double y) exactly.'],
    ['show(3.5, 4)', 6, '(double, int) matches show(double x, int y) exactly.'],
    ['show(5, 6L)', 5, 'show(int, double) works: 6L widens to double. show(double, int) would need long → int, a narrowing conversion that is never automatic.'],
    ['show(3, 4)', 0, '**Compile error: reference to show is ambiguous.** show(int, double) and show(double, int) both work by widening one argument, and neither is more specific.'],
    ['show(true)', -1, '**Compile error: no suitable method found.** boolean cannot be converted to any of the parameter types.']];
  const cv = codeView(src, { small: true }), cons = consoleEl(), why = h('div', { class: 'trace-note' });
  const btns = CALLS.map((c, i) => h('button', { type: 'button', class: 'btn sm mono', onclick: () => pick(i) }, c[0]));
  root.append(demoBox('Which overload runs?', 'Six methods share the name show. Click a call and the compiler\'s choice is highlighted, with the reason.',
    h('div', { class: 'row tight' }, btns), h('div', { class: 'cols' }, cv.el, h('div', null, why, cons.el))));
  function pick(i) {
    const [call, line, w] = CALLS[i];
    btns.forEach((b, k) => b.classList.toggle('on', k === i));
    cv.mark(line > 0 ? [line] : []);
    why.innerHTML = `<code>${esc(call)}</code> → ` + esc(w).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    cons.set(line > 0 ? ['int', 'long', 'double', 'String', 'int, double', 'double, int'][line - 1] : '(does not compile)');
  }
  pick(0);
};

/* ======================= 6. access modifiers ======================= */
DEMOS.access = (root) => {
  const MODS = [{ v: 'private', l: 'private' }, { v: 'default', l: '(default)' }, { v: 'protected', l: 'protected' }, { v: 'public', l: 'public' }];
  const LOCS = [
    { v: 'same', l: 'Same class', who: 'package school;\nclass Student {\n    MOD int roll;\n    void show() {\n        System.out.println(roll);      // ← access here\n    }\n}' },
    { v: 'pkgsub', l: 'Same package, subclass', who: 'package school;\nclass Monitor extends Student {\n    void show() {\n        System.out.println(roll);      // ← access here\n    }\n}' },
    { v: 'pkg', l: 'Same package, other class', who: 'package school;\nclass Office {\n    void show(Student s) {\n        System.out.println(s.roll);    // ← access here\n    }\n}' },
    { v: 'sub', l: 'Other package, subclass', who: 'package club;\nimport school.Student;\nclass Member extends Student {\n    void show() {\n        System.out.println(roll);      // ← access here (inherited)\n    }\n}' },
    { v: 'world', l: 'Other package, other class', who: 'package club;\nimport school.Student;\nclass Visitor {\n    void show(Student s) {\n        System.out.println(s.roll);    // ← access here\n    }\n}' }];
  const OK = { private: ['same'], default: ['same', 'pkgsub', 'pkg'], protected: ['same', 'pkgsub', 'pkg', 'sub'], public: ['same', 'pkgsub', 'pkg', 'sub', 'world'] };
  let mod = 'protected', loc = 'sub';
  const mSeg = seg(MODS, mod, (v) => { mod = v; draw(); }), lSeg = seg(LOCS.map((l) => ({ v: l.v, l: l.l })), loc, (v) => { loc = v; draw(); });
  const decl = h('div'), who = h('div'), verdict = h('div', { class: 'verdict' }), matrix = h('div', { class: 'scrollx' });
  root.append(demoBox('Access-modifier checker', 'Choose how the field roll is declared in class school.Student, and where the code that uses it lives.',
    h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'modifier:'), mSeg.el), h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'small muted' }, 'accessed from:'), lSeg.el),
    h('div', { class: 'cols' }, h('div', null, decl, who), h('div', null, verdict, matrix))));
  function draw() {
    const ok = OK[mod].includes(loc), L = LOCS.find((x) => x.v === loc), m = mod === 'default' ? '' : mod + ' ';
    clear(decl).append(h('div', { class: 'small muted' }, 'school/Student.java'), codeView(`package school;\npublic class Student {\n    ${m}int roll;\n}`, { small: true }).el);
    clear(who).append(h('div', { class: 'small muted' }, 'the code trying to use it'), codeView(L.who.replace('MOD ', m), { small: true }).el);
    verdict.className = 'verdict ' + (ok ? 'ok' : 'bad');
    verdict.innerHTML = ok ? '✓ Compiles' : `✗ Compile error: <code>roll ${mod === 'private' ? 'has private access in Student' : 'is not public in Student; cannot be accessed from outside package'}</code>`;
    const cellsFor = (mm) => LOCS.map((l) => h('td', { class: (OK[mm].includes(l.v) ? 'yes' : 'no') + (mm === mod && l.v === loc ? ' act' : '') }, OK[mm].includes(l.v) ? '✓' : '✗'));
    clear(matrix).append(h('table', { class: 'tt accm' }, h('thead', null, h('tr', null, h('th', null, ''), ...LOCS.map((l) => h('th', null, l.l)))),
      h('tbody', null, MODS.map((mm) => h('tr', null, h('th', null, mm.l), ...cellsFor(mm.v))))),
    mod === 'protected' && loc === 'sub' ? h('p', { class: 'small' }, 'Note: a subclass in another package reaches protected members through inheritance (roll or this.roll), not through an arbitrary Student reference.') : '');
  }
  draw();
};

/* ======================= 6. static rules quiz ======================= */
DEMOS['static-rules'] = (root) => {
  const ITEMS = [
    ['static void reset() {  count = 0;  }', true, 'A static method may use static fields freely.'],
    ['static void reset() {  id = 0;  }', false, 'error: non-static variable id cannot be referenced from a static context. There is no object, so which id?'],
    ['static void reset() {  this.id = 0;  }', false, 'error: non-static variable this cannot be referenced from a static context. A static method has no this.'],
    ['static void reset() {  show();  }', false, 'error: non-static method show() cannot be referenced from a static context. Instance methods need an object.'],
    ['static void reset() {  new Counter().id = 0;  }', true, 'Fine: create an object first, then reach its instance field through that object.'],
    ['void show() {  System.out.println(id + count);  }', true, 'An instance method can use both instance and static members.'],
    ['void show() {  reset();  }', true, 'Instance methods may call static methods.'],
    ['Counter.count++;   // in main', true, 'Static members are normally accessed through the class name.'],
    ['Counter.id = 5;   // in main', false, 'error: non-static variable id cannot be referenced from a static context. id belongs to each object.']];
  let score = 0, done = 0;
  const board = h('div', { class: 'row tight' });
  const list = h('div', { class: 'predict' });
  root.append(demoBox('Static or not? Predict the compiler', 'Class Counter has static int count; and an instance field int id;. For each line, decide whether it compiles.', codeView('class Counter {\n    static int count;\n    int id;\n    // …each line below is placed inside this class\n}', { small: true }).el, list, board));
  ITEMS.forEach(([code, ok, why]) => {
    const res = h('div', { class: 'pres small' });
    const b1 = h('button', { type: 'button', class: 'btn sm', onclick: () => ans(true) }, 'compiles'), b2 = h('button', { type: 'button', class: 'btn sm', onclick: () => ans(false) }, 'error');
    function ans(guess) {
      if (b1.disabled) return; b1.disabled = b2.disabled = true; done++;
      const right = guess === ok; if (right) score++;
      res.innerHTML = `<b class="${right ? 'ok' : 'bad'}">${right ? '✓ Right.' : '✗ Not quite.'}</b> ${esc(why)}`;
      paintBoard();
    }
    const row = h('div', { class: 'prow' }, h('div', { class: 'pcode' }), h('div', { class: 'row tight' }, b1, b2), res);
    row.firstChild.append(codeView(code, { nums: false, small: true }).el);
    list.append(row);
  });
  function paintBoard() { clear(board).append(kv('answered', `${done} / ${ITEMS.length}`), kv('correct', String(score))); }
  paintBoard();
};

/* ======================= 7–8. dynamic dispatch explorer ======================= */
DEMOS.dispatch = (root) => {
  const CLS = {
    Animal: { parent: null, m: { eat: 'Munch munch', sound: 'Some generic sound' } },
    Dog: { parent: 'Animal', m: { sound: 'Woof!', fetch: 'Fetching the ball' } },
    Cat: { parent: 'Animal', m: { sound: 'Meow', climb: 'Climbing the tree' } },
    Puppy: { parent: 'Dog', m: { sound: 'Yip!' } }
  };
  const chain = (c) => { const r = []; while (c) { r.push(c); c = CLS[c].parent; } return r; };
  const isSub = (c, p) => chain(c).includes(p);
  let ref = 'Animal', obj = 'Dog', call = 'sound';
  const refSel = selectEl(Object.keys(CLS), ref, (v) => { ref = v; draw(); }), objSel = selectEl(Object.keys(CLS), obj, (v) => { obj = v; draw(); });
  const calls = seg(['eat', 'sound', 'fetch', 'climb'].map((m) => ({ v: m, l: 'a.' + m + '()' })), call, (v) => { call = v; draw(); });
  const umlBox = h('div', { class: 'fig', style: { margin: '0' } }), res = h('div'), cons = consoleEl();
  root.append(demoBox('Dynamic dispatch explorer', 'The reference type decides what you are ALLOWED to call (checked at compile time). The object type decides WHICH version runs (chosen at run time).',
    h('div', { class: 'row tight' }, refSel, h('code', null, 'a = new'), objSel, h('code', null, '();')),
    h('div', { class: 'row', style: { marginTop: '8px' } }, calls.el), h('div', { class: 'cols' }, umlBox, h('div', null, res, cons.el))));
  function draw() {
    const errAssign = !isSub(obj, ref);
    const lookup = chain(ref).find((c) => call in CLS[c].m);
    const runIn = chain(obj).find((c) => call in CLS[c].m);
    const items = [
      { id: 'Animal', name: 'Animal', methods: ['+ eat()', '+ sound()'], x: 220, y: 10 },
      { id: 'Dog', name: 'Dog', methods: ['+ sound()', '+ fetch()'], x: 60, y: 150 },
      { id: 'Cat', name: 'Cat', methods: ['+ sound()', '+ climb()'], x: 380, y: 150 },
      { id: 'Puppy', name: 'Puppy', methods: ['+ sound()'], x: 60, y: 290 }];
    items.forEach((it) => {
      it.hl = !errAssign && lookup && runIn === it.id;
      it.dim = !chain(obj).includes(it.id);
      if (it.id === ref) it.name = it.name + '   ◀ ref';
      if (it.id === obj) it.name = it.name + '   ● obj';
    });
    clear(umlBox).append(Figs.uml({ label: 'Animal class hierarchy', w: 560, items, links: [{ a: 'Dog', b: 'Animal', type: 'extends' }, { a: 'Cat', b: 'Animal', type: 'extends' }, { a: 'Puppy', b: 'Dog', type: 'extends' }] }));
    clear(res);
    if (errAssign) { res.append(h('div', { class: 'verdict bad' }, `✗ Compile error: incompatible types: ${obj} cannot be converted to ${ref}`), h('p', { class: 'small' }, `A ${ref} variable can only refer to a ${ref} or one of its subclasses. ${obj} is not a ${ref}.`)); cons.set(''); return; }
    if (!lookup) {
      res.append(h('div', { class: 'verdict bad' }, `✗ Compile error: cannot find symbol ${call}()`), h('p', { class: 'small' }, `The compiler only knows that a is a ${ref}. ${ref} (and its superclasses) declare no ${call}() — even if the actual object has one. ${chain(obj).some((c) => call in CLS[c].m) ? `Downcast first: ((${chain(obj).find((c) => call in CLS[c].m)}) a).${call}()` : ''}`));
      cons.set(''); return;
    }
    res.append(h('div', { class: 'verdict ok' }, `✓ Compiles, because ${lookup} declares ${call}().`),
      h('ol', { class: 'small steps' },
        h('li', null, 'Compile time: the reference type ', h('b', null, ref), ' is searched upward for ', h('code', null, call + '()'), ' → found in ', h('b', null, lookup), '.'),
        h('li', null, 'Run time: the JVM starts at the object\'s class ', h('b', null, obj), ' and walks up: ', h('b', null, chain(obj).slice(0, chain(obj).indexOf(runIn) + 1).join(' → ')), '.'),
        h('li', null, 'It runs ', h('b', null, runIn + '.' + call + '()'), runIn !== lookup ? ' — an override replaces the superclass version.' : '.')));
    cons.set(CLS[runIn].m[call]);
  }
  draw();
};

DEMOS.downcast = (root) => {
  const PARENT = { Animal: null, Dog: 'Animal', Cat: 'Animal', Puppy: 'Dog' };
  const chain = (c) => { const r = []; while (c) { r.push(c); c = PARENT[c]; } return r; };
  let obj = 'Dog', target = 'Dog';
  const oSel = selectEl(Object.keys(PARENT), obj, (v) => { obj = v; draw(); }), tSel = selectEl(['Dog', 'Cat', 'Puppy'], target, (v) => { target = v; draw(); });
  const res = h('div'), codeWrap = h('div');
  root.append(demoBox('Downcasting and instanceof', 'An Animal reference may hide a Dog, a Cat or a Puppy. A cast is checked at run time: it only succeeds if the object really is that type.',
    h('div', { class: 'row tight' }, h('code', null, 'Animal a = new'), oSel, h('code', null, '();   cast to'), tSel), h('div', { class: 'cols' }, codeWrap, res)));
  function draw() {
    const ok = chain(obj).includes(target);
    clear(codeWrap).append(codeView(`Animal a = new ${obj}();\n\n${target} x = (${target}) a;          // plain cast\n\nif (a instanceof ${target} y) {         // safe: pattern matching\n    System.out.println("it is a ${target}");\n} else {\n    System.out.println("not a ${target}");\n}`, { small: true }).el);
    clear(res).append(ok ? h('div', { class: 'verdict ok' }, `✓ The cast succeeds: a ${obj} IS-A ${target}.`) : h('div', { class: 'verdict bad' }, `✗ Run time: java.lang.ClassCastException: class ${obj} cannot be cast to class ${target}`),
      h('p', { class: 'small' }, 'instanceof test: ', h('code', null, `a instanceof ${target}`), ' is ', h('b', null, String(ok)), ok ? '. The pattern variable y is ready to use as a ' + target + '.' : ', so the else branch runs and no exception is thrown.'),
      h('p', { class: 'small muted' }, `${obj}'s type chain: ${chain(obj).join(' → ')} → Object`));
  }
  draw();
};

/* ======================= 8. abstract Shape calculator ======================= */
DEMOS.shapes = (root) => {
  const K = {
    Circle: { f: ['r'], area: (d) => Math.PI * d.r * d.r, code: 'double area() { return Math.PI * r * r; }' },
    Rectangle: { f: ['w', 'h'], area: (d) => d.w * d.h, code: 'double area() { return w * h; }' },
    Triangle: { f: ['b', 'h'], area: (d) => 0.5 * d.b * d.h, code: 'double area() { return 0.5 * b * h; }' },
    Square: { f: ['side'], area: (d) => d.side * d.side, code: 'double area() { return side * side; }   // Square extends Rectangle' }
  };
  let kind = 'Circle', list = [];
  const kSel = seg(Object.keys(K).map((k) => ({ v: k, l: k })), kind, (v) => { kind = v; inputs(); });
  const inWrap = h('span', { class: 'row tight' }), listBox = h('div'), res = h('div'), cons = consoleEl();
  let fields = {};
  root.append(demoBox('Polymorphic shapes', 'Add shapes to a Shape[] list. The same line s.area() runs a different method for each object — and new Shape() is refused because Shape is abstract.',
    h('div', { class: 'row' }, kSel.el), h('div', { class: 'row', style: { marginTop: '8px' } }, inWrap,
      h('button', { type: 'button', class: 'btn sm pri', onclick: add }, 'Add to list'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { res.innerHTML = '<div class="verdict bad">✗ Compile error: Shape is abstract; cannot be instantiated</div><p class="small">An abstract class is an incomplete blueprint: area() has no body, so there is nothing to run.</p>'; } }, 'try new Shape()'),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { list = []; paint(); } }, 'Clear')),
    h('div', { class: 'cols' }, h('div', null, listBox, res), h('div', null, cons.el))));
  function inputs() { clear(inWrap); fields = {}; K[kind].f.forEach((f) => { fields[f] = numInput(f === 'r' ? 2 : 3, { style: { width: '80px' }, step: 'any' }); inWrap.append(field(f, fields[f])); }); }
  function add() {
    const d = {}; for (const f of K[kind].f) { d[f] = +fields[f].value; if (!(d[f] > 0)) { res.innerHTML = '<p class="bad">Every dimension must be a positive number.</p>'; return; } }
    list.push({ kind, d }); if (list.length > 8) list.shift(); paint();
  }
  function paint() {
    clear(listBox);
    if (!list.length) { listBox.append(h('p', { class: 'small muted' }, 'The list is empty. Add a few shapes of different kinds.')); cons.set(''); res.innerHTML = ''; return; }
    listBox.append(tableEl(['shapes[i]', 'object', 'which area() runs', 'area'], list.map((s, i) => [String(i), h('code', null, `new ${s.kind}(${K[s.kind].f.map((f) => s.d[f]).join(', ')})`), h('code', { class: 'small' }, K[s.kind].code.split('//')[0]), javaDouble(+K[s.kind].area(s.d).toFixed(4))]), 'tt'));
    const tot = list.reduce((t, s) => t + K[s.kind].area(s.d), 0);
    res.innerHTML = '';
    res.append(codeView('double total = 0;\nfor (Shape s : shapes) {\n    total += s.area();   // one call, many forms\n}', { small: true }).el);
    cons.set(list.map((s) => `${s.kind}: ${K[s.kind].area(s.d).toFixed(2)}`).join('\n') + `\nTotal area = ${tot.toFixed(2)}`);
  }
  inputs(); paint();
};

/* ======================= 9. interface contract checker ======================= */
DEMOS.iface = (root) => {
  const M = [{ n: 'start', sig: 'void start()', body: 'System.out.println("Pedalling");' }, { n: 'stop', sig: 'void stop()', body: 'System.out.println("Braking");' }, { n: 'wheels', sig: 'int wheels()', body: 'return 2;' }];
  const st = { start: { on: 1, pub: 1 }, stop: { on: 1, pub: 1 }, wheels: { on: 0, pub: 1 } };
  let abs = 0;
  const ctl = h('div', { class: 'ifctl' }), codeWrap = h('div'), res = h('div');
  const absT = tsw('declare Bike as abstract', 0, (v) => { abs = v; draw(); });
  M.forEach((m) => {
    const onT = tsw('implement ' + m.n + '()', st[m.n].on, (v) => { st[m.n].on = v; draw(); });
    const pubT = tsw('public', st[m.n].pub, (v) => { st[m.n].pub = v; draw(); });
    ctl.append(h('div', { class: 'row tight' }, onT.el, pubT.el));
  });
  root.append(demoBox('Interface contract checker', 'An interface is a promise. A concrete class that implements it must provide every method, and each must be public.',
    h('div', { class: 'cols' }, h('div', null, codeView('interface Vehicle {\n    void start();\n    void stop();\n    int wheels();\n}', { small: true }).el, ctl, h('div', { class: 'row', style: { marginTop: '8px' } }, absT.el)), h('div', null, codeWrap, res))));
  function draw() {
    const body = M.filter((m) => st[m.n].on).map((m) => `    ${st[m.n].pub ? 'public ' : ''}${m.sig} { ${m.body} }`).join('\n');
    clear(codeWrap).append(codeView(`${abs ? 'abstract ' : ''}class Bike implements Vehicle {\n${body || '    // nothing yet'}\n}`, { small: true }).el);
    const weak = M.find((m) => st[m.n].on && !st[m.n].pub);
    const missing = M.filter((m) => !st[m.n].on);
    clear(res);
    if (weak) { res.append(h('div', { class: 'verdict bad' }, `✗ ${weak.n}() in Bike cannot implement ${weak.n}() in Vehicle: attempting to assign weaker access privileges; was public`), h('p', { class: 'small' }, 'Interface methods are implicitly public, and an implementation may not reduce visibility.')); return; }
    if (missing.length && !abs) { res.append(h('div', { class: 'verdict bad' }, `✗ Bike is not abstract and does not override abstract method ${missing[0].n}() in Vehicle`), h('p', { class: 'small' }, 'Either implement the missing method(s) or mark the class abstract (then a subclass must finish the job).')); return; }
    res.append(h('div', { class: 'verdict ok' }, abs ? '✓ Compiles (as an abstract class)' : '✓ Compiles'), h('p', { class: 'small' }, abs ? (missing.length ? `Bike still owes ${missing.map((m) => m.n + '()').join(', ')}; you cannot write new Bike() until a subclass provides it.` : 'All methods are there, but an abstract class can still not be instantiated.') : 'Bike keeps every promise of Vehicle, so Vehicle v = new Bike(); is legal.'));
  }
  draw();
};
