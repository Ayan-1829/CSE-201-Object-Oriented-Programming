/* ===================== traces.js : step-through programs for every topic ===================== */
/* Each trace pairs Java source (with @@label markers) and a run(R) function that re-enacts the
   program on the recorder. Values are computed by the shadow code itself, so what the tracer
   shows is always consistent with the arithmetic. See tracer.js for the recorder API. */
const TRACES = {
  /* ---------------- 1. introduction ---------------- */
  't1-expr': {
    code: `
public class Expressions {
    public static void main(String[] args) {      @@main
        int a = 17, b = 4;                         @@decl
        int q = a / b;                             @@div
        int r = a % b;                             @@mod
        double avg = (a + b) / 2;                  @@avg1
        double avg2 = (a + b) / 2.0;               @@avg2
        int x = 5;                                 @@x
        int y = x++ + ++x;                         @@incr
        a += 3;                                    @@comp
        byte small = (byte) 200;                   @@cast
        System.out.println(q + " " + r + " " + avg + " " + avg2);   @@p1
        System.out.println(x + " " + y + " " + a + " " + small);    @@p2
    }
}`,
    run(R) {
      R.frame('main').at('main', 'The JVM starts the program by calling `main`. A new **stack frame** is created for its local variables.');
      let a = 17, b = 4; R.set('a', a).set('b', b).at('decl', 'Two `int` variables are declared and initialised on one line.');
      const q = Math.trunc(a / b); R.set('q', q).at('div', '`17 / 4`: both operands are `int`, so this is **integer division** — the fraction is thrown away → `4`.');
      const r = a % b; R.set('r', r).at('mod', '`%` gives the remainder: 17 = 4 × 4 + **1**.');
      const avg = Math.trunc((a + b) / 2); R.set('avg', D(avg)).at('avg1', '`(a + b) / 2` is still int ÷ int = `10`; only **then** is it widened to `double` → `10.0`. The .5 was already lost.');
      const avg2 = (a + b) / 2.0; R.set('avg2', D(avg2)).at('avg2', 'Writing `2.0` makes one operand a `double`, so the division is done in floating point → `10.5`.');
      let x = 5; R.set('x', x).at('x');
      const left = x; x++; const right = ++x; const y = left + right;
      R.set('x', x).set('y', y).at('incr', '`x++` uses 5 then makes x 6; `++x` makes x 7 then uses 7. So y = 5 + 7 = `12` and x ends at `7`.');
      a += 3; R.set('a', a).at('comp', '`a += 3` is shorthand for `a = a + 3` → `20`.');
      const small = (200 << 24) >> 24; R.set('small', small).at('cast', '200 does not fit in a `byte` (−128…127). The cast keeps the low 8 bits: 200 − 256 = `-56`.');
      R.println(q + ' ' + r + ' ' + javaDouble(avg) + ' ' + javaDouble(avg2)).at('p1', 'String concatenation: each value is converted to text and joined with spaces.');
      R.println(x + ' ' + y + ' ' + a + ' ' + small).at('p2', 'Done. Compare every printed value with the notes above.');
    }
  },

  /* ---------------- 2. control flow ---------------- */
  't2-sum': {
    code: `
public class SumLoop {
    public static void main(String[] args) {      @@main
        int n = 4;                                 @@n
        int sum = 0;                               @@s0
        for (int i = 1; i <= n; i++) {             @@for
            sum += i;                              @@add
        }
        System.out.println("Sum = " + sum);        @@print
    }
}`,
    run(R) {
      R.frame('main').at('main', '`main` starts with an empty frame.');
      const n = 4; R.set('n', n).at('n');
      let sum = 0; R.set('sum', sum).at('s0', 'An accumulator must start at 0 before the loop.');
      let i = 1; R.set('i', i).at('for', '**Initialisation** runs once: `i = 1`. Then the **condition** `1 <= 4` is true, so the body runs.');
      while (i <= n) {
        sum += i; R.set('sum', sum).at('add', `sum = ${sum - i} + ${i} = ${sum}`);
        i++; R.set('i', i).at('for', i <= n ? `**Update** i++ → ${i}. Condition ${i} <= ${n} is true → run the body again.` : `**Update** i++ → ${i}. Condition ${i} <= ${n} is **false** → the loop ends.`);
      }
      R.del('i'); R.println('Sum = ' + sum).at('print', '`i` was declared in the for header, so it no longer exists after the loop. Only `sum` survives.');
    }
  },
  't2-digits': {
    code: `
public class Digits {
    public static void main(String[] args) {      @@main
        int num = 472;                             @@num
        int sum = 0, rev = 0;                      @@init
        while (num > 0) {                          @@while
            int d = num % 10;                      @@d
            sum += d;                              @@sum
            rev = rev * 10 + d;                    @@rev
            num /= 10;                             @@div
        }
        System.out.println(sum + " " + rev);       @@print
    }
}`,
    run(R) {
      R.frame('main').at('main');
      let num = 472; R.set('num', num).at('num');
      let sum = 0, rev = 0; R.set('sum', 0).set('rev', 0).at('init');
      R.at('while', `The while condition is checked **before** each pass: ${num} > 0 is true.`);
      while (num > 0) {
        const d = num % 10; R.set('d', d).at('d', `num % 10 peels off the last digit: ${num} % 10 = ${d}.`);
        sum += d; R.set('sum', sum).at('sum');
        rev = rev * 10 + d; R.set('rev', rev).at('rev', 'Shift the reversed number left one decimal place and append the digit.');
        num = Math.trunc(num / 10); R.set('num', num).at('div', `Integer division drops the last digit → num = ${num}.`);
        R.del('d').at('while', num > 0 ? `\`d\` is gone (its block ended). ${num} > 0 → another pass.` : '`d` is gone. 0 > 0 is false → the loop stops.');
      }
      R.println(sum + ' ' + rev).at('print', 'Digit sum 4 + 7 + 2 = 13 and the reversed number 274.');
    }
  },
  't2-labeled': {
    code: `
public class Labeled {
    public static void main(String[] args) {          @@main
        outer:
        for (int i = 1; i <= 3; i++) {                 @@fi
            for (int j = 1; j <= 3; j++) {             @@fj
                if (j == 2) continue;                  @@cont
                if (i * j == 6) break outer;           @@brk
                System.out.println(i + " x " + j + " = " + (i * j));   @@pr
            }
        }
        System.out.println("done");                    @@done
    }
}`,
    run(R) {
      R.frame('main').at('main', 'The label `outer:` names the outer loop so an inner statement can jump out of it.');
      let stop = false;
      for (let i = 1; i <= 3 && !stop; i++) {
        R.set('i', i).del('j').at('fi', `Outer loop: i = ${i}.`);
        for (let j = 1; j <= 3; j++) {
          R.set('j', j).at('fj', `Inner loop: j = ${j}.`);
          if (j === 2) { R.at('cont', '`j == 2` → **continue** skips the rest of this inner pass and goes straight to `j++`.'); continue; }
          R.at('cont', `j is ${j}, not 2 → carry on.`);
          if (i * j === 6) { R.at('brk', `${i} × ${j} = 6 → **break outer** leaves *both* loops at once.`); stop = true; break; }
          R.at('brk', `${i} × ${j} = ${i * j}, not 6.`);
          R.println(`${i} x ${j} = ${i * j}`).at('pr');
        }
        if (!stop) R.set('j', 4).at('fj', 'j becomes 4; 4 <= 3 is false, so the inner loop ends and the outer loop moves on.');
      }
      R.del('i', 'j').println('done').at('done', 'Execution resumes after the labelled loop. Note `2 x 3` was never printed.');
    }
  },

  /* ---------------- 3. arrays ---------------- */
  't3-max': {
    code: `
public class MaxMark {
    public static void main(String[] args) {           @@main
        int[] marks = {78, 91, 64, 85};                 @@arr
        int max = marks[0];                             @@m0
        for (int i = 1; i < marks.length; i++) {        @@for
            if (marks[i] > max) {                       @@if
                max = marks[i];                         @@set
            }
        }
        System.out.println("Highest: " + max);          @@print
    }
}`,
    run(R) {
      const vals = [78, 91, 64, 85];
      R.frame('main').at('main');
      const arr = R.arr('int[]', vals); R.set('marks', arr).at('arr', 'The array literal creates an **array object on the heap**; `marks` only holds a reference to it.');
      let max = vals[0]; R.set('max', max).mark(arr, 0).at('m0', 'Start by assuming the first element is the largest.');
      for (let i = 1; i < vals.length; i++) {
        R.set('i', i).mark(arr, i).at('for', `i = ${i}; ${i} < marks.length (${vals.length}) → look at marks[${i}] = ${vals[i]}.`);
        const bigger = vals[i] > max;
        R.mark(arr, i).at('if', `${vals[i]} > ${max}? ${bigger ? '**yes**' : 'no'}`);
        if (bigger) { max = vals[i]; R.set('max', max).mark(arr, i).at('set', `New maximum: ${max}.`); }
      }
      R.set('i', vals.length).at('for', `i = ${vals.length}; ${vals.length} < ${vals.length} is false → done scanning.`);
      R.del('i').println('Highest: ' + max).at('print');
    }
  },
  't3-alias': {
    code: `
public class ArrayRefs {
    public static void main(String[] args) {         @@main
        int[] a = {1, 2, 3};                          @@a
        int[] b = a;                                  @@b
        b[0] = 99;                                    @@b0
        int[] c = a.clone();                          @@c
        c[1] = 50;                                    @@c1
        a = new int[2];                               @@na
        System.out.println(b[0] + " " + c[0] + " " + c[1]);   @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const x = R.arr('int[]', [1, 2, 3]); R.set('a', x).at('a');
      R.set('b', x).at('b', '`b = a` copies the **reference**, not the array. Both arrows now point at the same object #1.');
      R.seti(x, 0, 99).mark(x, 0).at('b0', 'Changing `b[0]` changes the one shared array — so `a[0]` is 99 too.');
      const y = R.arr('int[]', [99, 2, 3]); R.set('c', y).at('c', '`clone()` builds a **second** array with the same values. `c` is independent.');
      R.seti(y, 1, 50).mark(y, 1).at('c1', 'Only the copy changes; #1 is untouched.');
      const z = R.arr('int[]', [0, 0]); R.set('a', z).at('na', '`a` now points at a brand-new array of two zeros. `b` still refers to #1, so #1 is **not** garbage.');
      R.println('99 99 50').at('p', 'b[0] is 99 (the shared array), c[0] is 99 (copied before the clone), c[1] is 50.');
    }
  },

  /* ---------------- 4. classes and objects ---------------- */
  't4-ctor': {
    code: `
class Student {
    String name;
    int id;
    Student(String name, int id) {       @@ctor
        this.name = name;                @@n
        this.id = id;                    @@i
    }
}
public class Main {
    public static void main(String[] args) {            @@main
        Student s1 = new Student("Ann", 101);           @@new1
        Student s2 = new Student("Bob", 102);           @@new2
        s1.id = 111;                                    @@set
        System.out.println(s1.name + " " + s1.id);      @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      [['Ann', 101, 's1', 'new1'], ['Bob', 102, 's2', 'new2']].forEach(([nm, id, v, lab]) => {
        const o = R.obj('Student', { name: null, id: 0 });
        R.frame('Student(String name, int id)').set('this', o).set('name', nm).set('id', id)
          .at('ctor', '`new` first allocates the object with **default values** (null, 0), then runs the constructor. `this` refers to the new object.');
        R.setf(o, 'name', nm).at('n', '`this.name` is the field; plain `name` is the parameter.');
        R.setf(o, 'id', id).at('i');
        R.ret().set(v, o).at(lab, `The constructor returns and the reference is stored in \`${v}\`.`);
      });
      const s1 = R.get('s1'); R.setf(s1, 'id', 111).at('set', 'The dot operator reaches into the object that `s1` refers to.');
      R.println('Ann 111').at('p');
    }
  },
  't4-shadow': {
    code: `
class BoxA {
    int width;
    BoxA(int width) {                  @@ca
        width = width;   // parameter = parameter!   @@wa
    }
}
class BoxB {
    int width;
    BoxB(int width) {                  @@cb
        this.width = width;            @@wb
    }
}
public class Main {
    public static void main(String[] args) {            @@main
        BoxA a = new BoxA(7);                           @@na
        BoxB b = new BoxB(7);                           @@nb
        System.out.println(a.width + " " + b.width);    @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const a = R.obj('BoxA', { width: 0 });
      R.frame('BoxA(int width)').set('this', a).set('width', 7).at('ca', 'The parameter `width` **hides** (shadows) the field `width` inside the constructor.');
      R.at('wa', 'Both sides mean the parameter, so the parameter is assigned to itself. The field stays **0**. This is a classic bug.');
      R.ret().set('a', a).at('na');
      const b = R.obj('BoxB', { width: 0 });
      R.frame('BoxB(int width)').set('this', b).set('width', 7).at('cb');
      R.setf(b, 'width', 7).at('wb', '`this.width` explicitly names the field, so the value 7 is stored in the object.');
      R.ret().set('b', b).at('nb');
      R.println('0 7').at('p', 'Output `0 7`: only the constructor that used `this` worked.');
    }
  },
  't4-gc': {
    code: `
class Student {
    String name;
    Student(String n) { name = n; }
}
public class Main {
    public static void main(String[] args) {         @@main
        Student s1 = new Student("Ann");              @@a
        Student s2 = new Student("Bob");              @@b
        s2 = s1;                                      @@alias
        s1 = null;                                    @@null
        Student s3 = new Student("Cat");              @@c
        s3 = null;                                    @@c0
        System.out.println(s2.name);                  @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const a = R.obj('Student', { name: 'Ann' }); R.set('s1', a).at('a');
      const b = R.obj('Student', { name: 'Bob' }); R.set('s2', b).at('b');
      R.set('s2', a).at('alias', 'Now `s2` refers to Ann too. Nothing refers to Bob any more → Bob is **eligible for garbage collection**.');
      R.set('s1', null).at('null', '`s1` no longer refers to Ann, but `s2` still does, so Ann stays alive.');
      const c = R.obj('Student', { name: 'Cat' }); R.set('s3', c).at('c');
      R.set('s3', null).at('c0', 'Cat is unreachable as soon as its only reference is set to null.');
      R.println('Ann').at('p', 'Two objects are garbage. The JVM reclaims them whenever the garbage collector next runs — you never free memory yourself.');
    }
  },

  /* ---------------- 5. methods ---------------- */
  't5-ctor': {
    code: `
class Box {
    double w, h, d;
    Box() {                                   @@c0
        this(1, 1, 1);                        @@t0
    }
    Box(double side) {                        @@c1
        this(side, side, side);               @@t1
    }
    Box(double w, double h, double d) {       @@c3
        this.w = w; this.h = h; this.d = d;   @@set
    }
    double volume() { return w * h * d; }     @@vol
}
public class Main {
    public static void main(String[] args) {                        @@main
        Box cube = new Box(3);                                      @@n1
        Box unit = new Box();                                       @@n2
        System.out.println(cube.volume() + " " + unit.volume());   @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const cube = R.obj('Box', { w: D(0), h: D(0), d: D(0) });
      R.frame('Box(double side)').set('this', cube).set('side', D(3)).at('c1', 'One argument → Java picks the `Box(double side)` overload (3 is widened to 3.0).');
      R.at('t1', '`this(side, side, side)` calls **another constructor of the same class**. It must be the first statement.');
      R.frame('Box(double w, double h, double d)').set('this', cube).set('w', D(3)).set('h', D(3)).set('d', D(3)).at('c3');
      R.setf(cube, 'w', D(3)).setf(cube, 'h', D(3)).setf(cube, 'd', D(3)).at('set', 'All the real work lives in one constructor; the others just forward to it.');
      R.ret().ret().set('cube', cube).at('n1');
      const unit = R.obj('Box', { w: D(0), h: D(0), d: D(0) });
      R.frame('Box()').set('this', unit).at('c0', 'No arguments → the no-arg constructor.');
      R.at('t0');
      R.frame('Box(double w, double h, double d)').set('this', unit).set('w', D(1)).set('h', D(1)).set('d', D(1)).at('c3');
      R.setf(unit, 'w', D(1)).setf(unit, 'h', D(1)).setf(unit, 'd', D(1)).at('set');
      R.ret().ret().set('unit', unit).at('n2');
      R.frame('volume()').set('this', cube).set('(returns)', D(27)).at('vol', '3.0 × 3.0 × 3.0 = 27.0');
      R.ret().frame('volume()').set('this', unit).set('(returns)', D(1)).at('vol');
      R.ret().println('27.0 1.0').at('p');
    }
  },
  't5-pass': {
    code: `
class Point { int x, y; }
public class Main {
    static void bump(int n) {               @@bump
        n = n + 10;                         @@bn
    }
    static void move(Point q) {             @@move
        q.x = q.x + 10;                     @@mx
    }
    static void replace(Point q) {          @@rep
        q = new Point();                    @@rn
        q.x = 99;                           @@rx
    }
    public static void main(String[] args) {     @@main
        int k = 5;                                @@k
        Point p = new Point();                    @@p
        p.x = 5;                                  @@px
        bump(k);                                  @@cb
        move(p);                                  @@cm
        replace(p);                               @@cr
        System.out.println(k + " " + p.x);        @@out
    }
}`,
    run(R) {
      R.frame('main').at('main');
      R.set('k', 5).at('k');
      const p = R.obj('Point', { x: 0, y: 0 }); R.set('p', p).at('p');
      R.setf(p, 'x', 5).at('px');
      R.frame('bump(int n)').set('n', 5).at('bump', 'The **value** of k (5) is copied into the parameter `n`.');
      R.set('n', 15).at('bn', 'Only the copy changes. `k` in main is still 5.');
      R.ret().at('cb', 'bump returned; its frame (and `n`) is gone.');
      R.frame('move(Point q)').set('q', p).at('move', 'The **value of the reference** is copied: `q` points at the same Point as `p`.');
      R.setf(p, 'x', 15).at('mx', 'Through `q` we change the shared object, so the caller sees x = 15.');
      R.ret().at('cm');
      R.frame('replace(Point q)').set('q', p).at('rep');
      const p2 = R.obj('Point', { x: 0, y: 0 }); R.set('q', p2).at('rn', '`q` is re-pointed at a new object. This does **not** change `p` in main.');
      R.setf(p2, 'x', 99).at('rx');
      R.ret().at('cr', 'The new Point was only reachable through `q`; now it is garbage. `p` never moved.');
      R.println('5 15').at('out', 'Java is always **pass-by-value**: primitives copy the value, objects copy the reference.');
    }
  },
  't5-fact': {
    code: `
public class Factorial {
    static int fact(int n) {               @@f
        if (n <= 1) return 1;              @@base
        return n * fact(n - 1);            @@rec
    }
    public static void main(String[] args) {    @@main
        int r = fact(4);                         @@call
        System.out.println("4! = " + r);         @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const go = (n) => {
        R.frame('fact(int n)').set('n', n).at('f', `A new frame for fact(${n}). Each call has its **own** n.`);
        if (n <= 1) { R.set('(returns)', 1).at('base', `**Base case**: n = ${n} ≤ 1 → return 1 without recursing.`); R.ret(); return 1; }
        R.at('rec', `Recursive case: ${n} × fact(${n - 1}). This frame waits while fact(${n - 1}) runs.`);
        const v = n * go(n - 1);
        R.set('(returns)', v).at('rec', `fact(${n - 1}) came back, so this frame computes ${n} × ${v / n} = ${v} and returns it.`);
        R.ret(); return v;
      };
      const r = go(4);
      R.set('r', r).at('call', 'All the recursive frames have been popped. The stack is back to just `main`.');
      R.println('4! = ' + r).at('p');
    }
  },

  /* ---------------- 6. static ---------------- */
  't6-static': {
    code: `
class Counter {
    static int count = 0;          @@sc
    int id;
    Counter() {                    @@c
        count++;                   @@inc
        id = count;                @@id
    }
}
public class Main {
    public static void main(String[] args) {      @@main
        Counter a = new Counter();                 @@na
        Counter b = new Counter();                 @@nb
        Counter c = new Counter();                 @@nc
        System.out.println(a.id + " " + b.id + " " + c.id + " " + Counter.count);   @@p
    }
}`,
    run(R) {
      R.frame('main').at('main', 'The Counter class has not been used yet.');
      R.stat('Counter', 'count', 0).at('sc', 'First use of Counter: the class is loaded and its **static** field is created **once**, in the class area.');
      [['a', 'na'], ['b', 'nb'], ['c', 'nc']].forEach(([v, lab], k) => {
        const o = R.obj('Counter', { id: 0 });
        R.frame('Counter()').set('this', o).at('c', 'Each object gets its own `id` field…');
        R.stat('Counter', 'count', k + 1).at('inc', `…but every object shares the single \`count\`: now ${k + 1}.`);
        R.setf(o, 'id', k + 1).at('id');
        R.ret().set(v, o).at(lab);
      });
      R.println('1 2 3 3').at('p', 'Three ids, one count. Static members belong to the class, not to any one object.');
    }
  },

  /* ---------------- 7. inheritance ---------------- */
  't7-chain': {
    code: `
class A {
    A() {                                        @@ca
        System.out.println("A()");              @@pa
    }
}
class B extends A {
    B() {                                        @@cb
        super();                                 @@sb
        System.out.println("B()");              @@pb
    }
}
class C extends B {
    C(int x) {                                   @@cc
        super();        // added by the compiler if you leave it out   @@sc
        System.out.println("C(" + x + ")");     @@pc
    }
}
public class Main {
    public static void main(String[] args) {    @@main
        C obj = new C(5);                        @@n
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const o = R.obj('C', {});
      R.frame('C(int x)').set('this', o).set('x', 5).at('cc', '`new C(5)` calls C\'s constructor first…');
      R.at('sc', '…but its first job is `super()`: the superclass part must be built before the subclass part.');
      R.frame('B()').set('this', o).at('cb');
      R.at('sb', 'B also starts by calling its superclass constructor.');
      R.frame('A()').set('this', o).at('ca', 'A\'s constructor implicitly calls `Object()` first (not shown), then runs its own body.');
      R.println('A()').at('pa', 'So the **top** of the hierarchy prints first.');
      R.ret().at('sb', 'A() finished, control is back in B().');
      R.println('B()').at('pb');
      R.ret().at('sc', 'B() finished, back in C(int).');
      R.println('C(5)').at('pc');
      R.ret().set('obj', o).at('n', 'Constructors **start** bottom-up (C → B → A) but their bodies **finish** top-down (A → B → C).');
    }
  },

  /* ---------------- 8. polymorphism ---------------- */
  't8-shapes': {
    code: `
abstract class Shape {
    abstract double area();
}
class Circle extends Shape {
    double r;
    Circle(double r) { this.r = r; }
    double area() { return 3.14 * r * r; }        @@ac
}
class Rect extends Shape {
    double w, h;
    Rect(double w, double h) { this.w = w; this.h = h; }
    double area() { return w * h; }               @@ar
}
public class Main {
    public static void main(String[] args) {                               @@main
        Shape[] shapes = { new Circle(1), new Rect(2, 3), new Rect(1.5, 2) };   @@arr
        double total = 0;                                                  @@t0
        for (Shape s : shapes) {                                           @@for
            total += s.area();                                             @@add
        }
        System.out.println("Total area = " + total);                       @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const c = R.obj('Circle', { r: D(1) }), r1 = R.obj('Rect', { w: D(2), h: D(3) }), r2 = R.obj('Rect', { w: D(1.5), h: D(2) });
      const arr = R.arr('Shape[]', [c, r1, r2]);
      R.set('shapes', arr).at('arr', 'The array\'s element type is `Shape`, but it holds a Circle and two Rects. A superclass reference may point to any subclass object (**upcasting**).');
      let total = 0; R.set('total', D(0)).at('t0');
      [[c, 'Circle', 'ac', () => 3.14 * 1 * 1], [r1, 'Rect', 'ar', () => 2 * 3], [r2, 'Rect', 'ar', () => 1.5 * 2]].forEach(([o, cls, lab, f], i) => {
        R.set('s', o).mark(arr, i).at('for', `s = shapes[${i}]. Its declared type is Shape, but the object is a **${cls}**.`);
        const v = f();
        R.frame(cls + '.area()').set('this', o).set('(returns)', D(v)).at(lab, `**Dynamic dispatch**: the JVM looks at the real object (${cls}) at run time and runs ${cls}'s area() → ${javaDouble(v)}.`);
        R.ret(); total += v; R.set('total', D(total)).at('add', `total = ${javaDouble(total)}`);
      });
      R.del('s').println('Total area = ' + javaDouble(total)).at('p', 'One loop, one call site, three different methods executed — that is polymorphism.');
    }
  },

  /* ---------------- 9. interfaces ---------------- */
  't9-iface': {
    code: `
interface Payable {
    double getPayment();
}
class Employee implements Payable {
    double salary;
    Employee(double s) { salary = s; }
    public double getPayment() { return salary; }              @@pe
}
class Invoice implements Payable {
    int qty; double price;
    Invoice(int q, double p) { qty = q; price = p; }
    public double getPayment() { return qty * price; }         @@pi
}
public class Main {
    public static void main(String[] args) {                               @@main
        Payable[] bills = { new Employee(30000), new Invoice(3, 250.0) };  @@arr
        double total = 0;                                                  @@t
        for (Payable p : bills) {                                          @@for
            total += p.getPayment();                                       @@add
        }
        System.out.println("Pay out: " + total);                          @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const e = R.obj('Employee', { salary: D(30000) }), inv = R.obj('Invoice', { qty: 3, price: D(250) });
      const arr = R.arr('Payable[]', [e, inv]);
      R.set('bills', arr).at('arr', 'You cannot write `new Payable()`, but a `Payable` **reference** can point to any object whose class implements Payable.');
      let total = 0; R.set('total', D(0)).at('t');
      [[e, 'Employee', 'pe', 30000], [inv, 'Invoice', 'pi', 750]].forEach(([o, cls, lab, v], i) => {
        R.set('p', o).mark(arr, i).at('for', `p refers to a ${cls}.`);
        R.frame(cls + '.getPayment()').set('this', o).set('(returns)', D(v)).at(lab, `The interface only promised a getPayment() method; ${cls} decides how it works.`);
        R.ret(); total += v; R.set('total', D(total)).at('add');
      });
      R.del('p').println('Pay out: ' + javaDouble(total)).at('p', 'Unrelated classes, one common contract.');
    }
  },

  /* ---------------- 10. exceptions ---------------- */
  't10-try': {
    scenarioLabel: 'Input:',
    code: `
public class Divide {
    public static void main(String[] args) {                   @@main
        String input = args[0];                                 @@in
        try {                                                   @@try
            int d = Integer.parseInt(input);                    @@parse
            int q = 100 / d;                                    @@div
            System.out.println("100 / " + d + " = " + q);      @@ok
        } catch (ArithmeticException e) {                       @@c1
            System.out.println("Cannot divide by zero");        @@m1
        } catch (NumberFormatException e) {                     @@c2
            System.out.println("Not a number: " + input);       @@m2
        } finally {                                             @@fin
            System.out.println("finally always runs");          @@mf
        }
        System.out.println("program continues");                @@end
    }
}`,
    scenarios: ['10', '0', 'abc'].map((inp) => ({
      label: `"${inp}"`,
      run(R) {
        R.frame('main').at('main');
        R.set('input', inp).at('in', `The program was started with the argument "${inp}".`);
        R.at('try', 'Enter the try block. Any exception thrown inside will be matched against the catch clauses below.');
        if (inp === 'abc') {
          const ex = R.obj('NumberFormatException', { message: 'For input string: "abc"' });
          R.at('parse', '`parseInt("abc")` cannot read a number, so it **throws** a NumberFormatException. The rest of the try block is skipped.');
          R.at('c1', 'Is it an ArithmeticException? No → check the next catch.');
          R.set('e', ex).at('c2', 'It **is** a NumberFormatException → this handler runs, with `e` referring to the exception object.');
          R.println('Not a number: abc').at('m2');
          R.del('e');
        } else {
          const d = +inp; R.set('d', d).at('parse');
          if (d === 0) {
            const ex = R.obj('ArithmeticException', { message: '/ by zero' });
            R.at('div', 'Integer division by zero **throws** an ArithmeticException. `q` is never assigned and the println is skipped.');
            R.del('d').set('e', ex).at('c1', 'The first catch matches. Local variables of the try block (`d`) are gone.');
            R.println('Cannot divide by zero').at('m1');
            R.del('e');
          } else {
            R.set('q', 100 / d).at('div');
            R.println('100 / 10 = 10').at('ok', 'No exception: every catch block is skipped.');
            R.del('d', 'q');
          }
        }
        R.println('finally always runs').at('mf', '**finally** runs whether or not an exception happened — the place for clean-up code.');
        R.println('program continues').at('end', 'Because the exception (if any) was handled, the program carries on normally.');
      }
    }))
  },
  't10-propagate': {
    code: `
public class Propagate {
    static int level3(int x) {                                           @@l3
        if (x < 0) throw new IllegalArgumentException("negative");       @@thr
        return x * 2;                                                    @@r3
    }
    static int level2(int x) {                                           @@l2
        try {
            return level3(x) + 1;                                        @@c3
        } finally {
            System.out.println("level2 finally");                        @@pf
        }
    }
    public static void main(String[] args) {                             @@main
        try {
            System.out.println(level2(5));                               @@a
            System.out.println(level2(-1));                              @@b
        } catch (IllegalArgumentException e) {                           @@catch
            System.out.println("caught: " + e.getMessage());             @@pc
        }
        System.out.println("end");                                       @@end
    }
}`,
    run(R) {
      R.frame('main').at('main');
      R.at('a', 'Call level2(5).');
      R.frame('level2(int x)').set('x', 5).at('l2');
      R.at('c3', 'level2 calls level3.');
      R.frame('level3(int x)').set('x', 5).at('l3');
      R.at('thr', '5 < 0 is false, no exception.');
      R.set('(returns)', 10).at('r3', 'level3 returns 10.');
      R.ret().set('(returns)', 11).at('c3', 'level3(5) + 1 = 11 is ready to return, but…');
      R.println('level2 finally').at('pf', '…the **finally** block runs before the method actually returns.');
      R.ret().println('11').at('a', 'main prints 11.');
      R.at('b', 'Now call level2(-1).');
      R.frame('level2(int x)').set('x', -1).at('l2');
      R.at('c3');
      R.frame('level3(int x)').set('x', -1).at('l3');
      const ex = R.obj('IllegalArgumentException', { message: 'negative' });
      R.set('(throws)', ex).at('thr', '`throw` creates an exception object and **abandons** level3 immediately.');
      R.ret().set('(throws)', ex).at('c3', 'level2 has no catch, so the exception keeps travelling up the call stack…');
      R.println('level2 finally').at('pf', '…but level2\'s finally still runs on the way out.');
      R.ret().set('e', ex).at('catch', 'The exception reaches main, where a matching catch handles it. The second println in the try never ran.');
      R.println('caught: negative').at('pc');
      R.del('e').println('end').at('end');
    }
  },

  /* ---------------- 12. strings ---------------- */
  't12-pool': {
    code: `
public class Pool {
    public static void main(String[] args) {        @@main
        String a = "Hi";                             @@a
        String b = "Hi";                             @@b
        String c = new String("Hi");                 @@c
        System.out.println(a == b);                  @@p1
        System.out.println(a == c);                  @@p2
        System.out.println(a.equals(c));             @@p3
        a = a + "!";                                 @@cat
        System.out.println(a + " " + b);             @@p4
        String d = c.intern();                       @@in
        System.out.println(d == b);                  @@p5
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const p = R.str('Hi', 'pool'); R.set('a', p).at('a', 'A string **literal** lives in the string pool.');
      R.set('b', p).at('b', 'The same literal again: Java reuses the pooled object, so `a` and `b` point to the **same** object.');
      const hc = R.str('Hi', 'heap'); R.set('c', hc).at('c', '`new String(...)` always creates a **new** object outside the pool.');
      R.println('true').at('p1', '`==` compares references: same object → true.');
      R.println('false').at('p2', 'Different objects → false, even though the characters match.');
      R.println('true').at('p3', '`equals` compares the characters → true. Always use equals for text.');
      const n = R.str('Hi!', 'heap'); R.set('a', n).at('cat', 'Strings are **immutable**: `+` builds a new String. The pooled "Hi" is unchanged (and still used by b).');
      R.println('Hi! Hi').at('p4');
      R.set('d', p).at('in', '`intern()` returns the pooled copy of the same text.');
      R.println('true').at('p5');
    }
  },
  't12-builder': {
    code: `
public class Build {
    public static void main(String[] args) {           @@main
        String s = "";                                  @@s
        for (int i = 0; i < 3; i++) {                   @@f1
            s = s + i;                                  @@cat
        }
        StringBuilder sb = new StringBuilder();         @@sb
        for (int i = 0; i < 3; i++) {                   @@f2
            sb.append(i);                               @@ap
        }
        System.out.println(s + " " + sb);               @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      let s = R.str('', 'pool'); R.set('s', s).at('s');
      let txt = '';
      for (let i = 0; i < 3; i++) {
        R.set('i', i).at('f1');
        txt += i; s = R.str(txt, 'heap'); R.set('s', s).at('cat', `A **new** String "${txt}" is created every pass; the previous one becomes garbage.`);
      }
      R.del('i');
      const sb = R.obj('StringBuilder', { value: '' }); R.set('sb', sb).at('sb', 'A StringBuilder is **mutable**: one object whose contents can change.');
      let v = '';
      for (let i = 0; i < 3; i++) {
        R.set('i', i).at('f2');
        v += i; R.setf(sb, 'value', v).at('ap', 'append changes the same object — no garbage is produced.');
      }
      R.del('i').println('012 012').at('p', 'Same text, but the String loop created 3 throw-away objects. In a loop of 100 000 passes that difference matters.');
    }
  },

  /* ================= more step-through traces ================= */

  /* ---------------- 3. arrays: sorting and searching ---------------- */
  't3-bubble': {
    code: `
import java.util.Arrays;

public class Bubble {
    public static void main(String[] args) {                 @@main
        int[] a = {5, 1, 4, 2};                              @@arr
        for (int pass = 0; pass < a.length - 1; pass++) {    @@pass
            for (int j = 0; j < a.length - 1 - pass; j++) {  @@j
                if (a[j] > a[j + 1]) {                       @@cmp
                    int t = a[j];                            @@t
                    a[j] = a[j + 1];                         @@s1
                    a[j + 1] = t;                            @@s2
                }
            }
        }
        System.out.println(Arrays.toString(a));              @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const a = R.arr('int[]', [5, 1, 4, 2]), n = 4;
      R.set('a', a).at('arr', 'An unsorted array of 4 ints on the heap. Bubble sort compares **neighbours** and swaps them when they are out of order.');
      for (let pass = 0; pass < n - 1; pass++) {
        R.set('pass', pass).del('j').mark(a, range(n).slice(n - pass)).at('pass', pass === 0 ? 'Pass 0 starts. Each pass carries the largest remaining value to the end, like a bubble rising.' : `Pass ${pass}. The highlighted value${pass > 1 ? 's are' : ' is'} already in final position, so this pass stops earlier.`);
        for (let j = 0; j < n - 1 - pass; j++) {
          R.set('j', j).at('j');
          const x = R.geti(a, j), y = R.geti(a, j + 1);
          R.mark(a, [j, j + 1]).at('cmp', x > y ? `a[${j}] = ${x} > a[${j + 1}] = ${y}: out of order → swap.` : `${x} > ${y} is false: this pair is already in order.`);
          if (x > y) {
            R.set('t', x).mark(a, [j, j + 1]).at('t', 'Keep a copy of a[j] in `t`, or the next line would overwrite it.');
            R.seti(a, j, y).mark(a, [j]).at('s1');
            R.seti(a, j + 1, x).mark(a, [j + 1]).at('s2', `Swapped: ${y} and ${x} have changed places.`);
            R.del('t');
          }
        }
      }
      R.del('pass', 'j').mark(a, range(n)).println('[' + R.heap[a.ref].a.join(', ') + ']').at('p', 'Sorted after 3 passes, 6 comparisons and 4 swaps. Bubble sort is O(n²): fine for a few values, slow for many.');
    }
  },
  't3-binary': {
    code: `
public class Search {
    static int binary(int[] a, int key) {             @@bin
        int lo = 0, hi = a.length - 1;                 @@init
        while (lo <= hi) {                             @@while
            int mid = (lo + hi) / 2;                   @@mid
            if (a[mid] == key) return mid;             @@eq
            if (a[mid] < key) lo = mid + 1;            @@lt
            else hi = mid - 1;                         @@else
        }
        return -1;                                     @@nf
    }
    public static void main(String[] args) {          @@main
        int[] a = {4, 8, 15, 16, 23, 42, 50};          @@arr
        int pos = binary(a, KEY);                      @@call
        System.out.println("index " + pos);            @@p
    }
}`,
    scenarioLabel: 'Search for:',
    scenarios: [23, 40, 4].map((key) => ({
      label: 'KEY = ' + key + (key === 40 ? ' (missing)' : ''),
      run(R) {
        const v = [4, 8, 15, 16, 23, 42, 50];
        R.frame('main').at('main');
        const a = R.arr('int[]', v); R.set('a', a).at('arr', 'Binary search only works on a **sorted** array.');
        R.at('call', `Call binary(a, ${key}). The method gets a copy of the **reference**, so both frames point to the same array.`);
        R.frame('binary(int[] a, int key)').set('a', a).set('key', key).at('bin');
        let lo = 0, hi = v.length - 1, res = -1, steps = 0;
        R.set('lo', lo).set('hi', hi).mark(a, range(v.length)).at('init', 'The whole array is still possible: lo = 0, hi = 6.');
        while (lo <= hi) {
          R.mark(a, range(v.length).filter((i) => i >= lo && i <= hi)).at('while', `${lo} <= ${hi}: the highlighted part may still contain ${key}.`);
          const mid = Math.trunc((lo + hi) / 2); steps++;
          R.set('mid', mid).mark(a, [mid]).at('mid', `Look in the middle: (${lo} + ${hi}) / 2 = ${mid}, a[${mid}] = ${v[mid]}.`);
          if (v[mid] === key) { res = mid; R.set('(returns)', mid).mark(a, [mid]).at('eq', `Found ${key} at index ${mid} after only ${steps} look${steps > 1 ? 's' : ''}.`); break; }
          R.at('eq', `${v[mid]} ≠ ${key}.`);
          if (v[mid] < key) { lo = mid + 1; R.set('lo', lo).mark(a, range(v.length).filter((i) => i >= lo && i <= hi)).at('lt', `${v[mid]} < ${key}, so ${key} can only be to the **right**: throw away the left half.`); }
          else { R.at('lt', `${v[mid]} < ${key} is false.`); hi = mid - 1; R.set('hi', hi).mark(a, range(v.length).filter((i) => i >= lo && i <= hi)).at('else', `${v[mid]} > ${key}, so ${key} can only be to the **left**: throw away the right half.`); }
          R.del('mid');
        }
        if (res < 0) R.set('(returns)', -1).at('nf', `lo (${lo}) > hi (${hi}): nothing left to search. ${key} is not in the array → -1.`);
        R.ret().set('pos', res).at('call');
        R.println('index ' + res).at('p', `At most 3 looks for 7 values; a linear search could need 7. For 1 000 000 values binary search needs about 20.`);
      }
    }))
  },

  /* ---------------- 5. recursion ---------------- */
  't5-hanoi': {
    code: `
public class Hanoi {
    static void hanoi(int n, char from, char to, char via) {   @@h
        if (n == 0) return;                                    @@base
        hanoi(n - 1, from, via, to);                           @@r1
        System.out.println("disk " + n + ": " + from + " -> " + to);   @@pr
        hanoi(n - 1, via, to, from);                           @@r2
    }
    public static void main(String[] args) {                   @@main
        hanoi(2, 'A', 'C', 'B');                               @@call
    }
}`,
    run(R) {
      R.frame('main').at('main');
      R.at('call', 'Move 2 disks from peg A to peg C, using B as the spare.');
      const H = (n, f, t, v) => {
        R.frame(`hanoi(${n}, ${f}, ${t}, ${v})`).set('n', n).set('from', C(f)).set('to', C(t)).set('via', C(v));
        R.at('h', `A new frame for n = ${n}. Each call has its **own** copies of the four parameters.`);
        if (n === 0) { R.at('base', 'n == 0: the **base case**. No disk to move, so return straight away.'); R.ret(); return; }
        R.at('base', `n = ${n}, not the base case.`);
        R.at('r1', `Step 1: move the ${n - 1 === 1 ? 'top disk' : `top ${n - 1} disks`} out of the way, from ${f} to the spare ${v}.`);
        H(n - 1, f, v, t);
        R.at('r1', `Back in hanoi(${n}): the smaller tower is out of the way.`);
        R.println(`disk ${n}: ${f} -> ${t}`).at('pr', `Step 2: now disk ${n} can move directly from ${f} to ${t}.`);
        R.at('r2', `Step 3: move the smaller tower from ${v} onto disk ${n} at ${t}.`);
        H(n - 1, v, t, f);
        R.at('r2', `hanoi(${n}) has finished all three steps and returns.`);
        R.ret();
      };
      H(2, 'A', 'C', 'B');
      R.at('call', 'Done: 3 moves. n disks always need 2ⁿ − 1 moves, and the stack never gets deeper than n + 2 frames.');
    }
  },

  /* ---------------- 6. static initialisation ---------------- */
  't6-static-block': {
    code: `
class MathUtil {
    static final double[] SQUARES = new double[4];          @@sq
    static {                                                @@blk
        for (int i = 0; i < SQUARES.length; i++)            @@for
            SQUARES[i] = i * i;                             @@set
        System.out.println("MathUtil loaded");              @@loaded
    }
    static int max(int... v) {                              @@max
        int m = v[0];                                       @@m0
        for (int x : v) if (x > m) m = x;                   @@loop
        return m;                                           @@ret
    }
}
public class Main {
    public static void main(String[] args) {                @@main
        System.out.println("start");                        @@start
        System.out.println(MathUtil.max(4, 9, 2));          @@call
        System.out.println(MathUtil.SQUARES[3]);            @@sq3
    }
}`,
    run(R) {
      R.frame('main').at('main', 'Only `Main` is loaded. `MathUtil` has not been touched yet, so its static block has **not** run.');
      R.println('start').at('start', 'Notice: "MathUtil loaded" is not printed first.');
      R.at('call', 'The **first use** of MathUtil makes the JVM load the class and run its static initialisers, once, before max() is called.');
      R.frame('MathUtil <clinit>');
      const sq = R.arr('double[]', [D(0), D(0), D(0), D(0)]);
      R.stat('MathUtil', 'SQUARES', sq).at('sq', 'Static fields live in the **static area**, one copy for the whole class. The array itself is on the heap.');
      R.at('blk', 'Then the static block runs, top to bottom.');
      for (let i = 0; i < 4; i++) {
        R.set('i', i).at('for');
        R.seti(sq, i, D(i * i)).mark(sq, [i]).at('set', `SQUARES[${i}] = ${i} × ${i} = ${i * i}.0`);
      }
      R.del('i').println('MathUtil loaded').at('loaded', 'The class is ready. This block will never run again in this program.');
      R.ret().at('call', 'Now the actual call max(4, 9, 2) can happen.');
      R.frame('max(int... v)');
      const v = R.arr('int[]', [4, 9, 2]);
      R.set('v', v).at('max', 'A varargs parameter `int... v` arrives as an **array**: the compiler packs 4, 9, 2 into a new int[].');
      let m = 4; R.set('m', m).at('m0');
      [4, 9, 2].forEach((x, k) => { R.set('x', x).mark(v, [k]); if (x > m) { m = x; R.set('m', m).at('loop', `${x} > the old maximum → m = ${x}.`); } else R.at('loop', `${x} is not bigger than ${m}.`); });
      R.del('x').set('(returns)', m).at('ret');
      R.ret().println(String(m)).at('call');
      R.println('9.0').mark(sq, [3]).at('sq3', 'MathUtil is already loaded, so this just reads SQUARES[3] from the existing array. No second "MathUtil loaded".');
    }
  },

  /* ---------------- 7. inheritance: super.method() ---------------- */
  't7-super': {
    code: `
class Person {
    private String name;
    Person(String name) { this.name = name; }                            @@pc
    String introduce() { return "I am " + name; }                        @@pi
}
class Student extends Person {
    private int id;
    Student(String name, int id) { super(name); this.id = id; }          @@sc
    String introduce() { return super.introduce() + ", ID " + id; }      @@si
}
class Teacher extends Person {
    private String dept;
    Teacher(String name, String dept) { super(name); this.dept = dept; } @@tc
    String introduce() { return super.introduce() + " from " + dept; }   @@ti
}
public class Main {
    public static void main(String[] args) {                             @@main
        Person[] people = { new Student("Mitu", 221),                    @@arr
                            new Teacher("Dr. Karim", "CSE") };
        for (Person p : people)                                          @@for
            System.out.println(p.introduce());                           @@call
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const make = (type, name, k, v, ctorLine) => {
        const o = R.obj(type, { 'name (Person)': null, [k]: k === 'id' ? 0 : null });
        R.frame(`${type}(…)`).set('this', o).set('name', name).set(k, v).at(ctorLine, `new ${type}(…): one object is created, with room for the inherited field **and** its own field.`);
        R.at(ctorLine, '`super(name)` must come first: it hands `name` up to the Person constructor.');
        R.frame('Person(String name)').set('this', o).set('name', name).at('pc', 'The Person constructor runs **on the same object** and fills in the inherited part.');
        R.setf(o, 'name (Person)', name).at('pc');
        R.ret().setf(o, k, v).at(ctorLine, `Back in ${type}: now its own field is set.`);
        R.ret();
        return o;
      };
      const s = make('Student', 'Mitu', 'id', 221, 'sc');
      const t = make('Teacher', 'Dr. Karim', 'dept', 'CSE', 'tc');
      const arr = R.arr('Person[]', [s, t]);
      R.set('people', arr).at('arr', 'A Person[] holds references to a Student and a Teacher: both **are** Persons.');
      [[s, 'Student', 'si', 'Mitu', ', ID 221'], [t, 'Teacher', 'ti', 'Dr. Karim', ' from CSE']].forEach(([o, type, line, name, extra], i) => {
        R.set('p', o).mark(arr, [i]).at('for', `p refers to a **${type}**, even though its declared type is Person.`);
        R.at('call', `p.introduce(): Java looks at the **object**, finds ${type}.introduce(), and runs that override.`);
        R.frame(`${type}.introduce()`).set('this', o).at(line, '`super.introduce()` calls the Person version, on the same object.');
        R.frame('Person.introduce()').set('this', o).set('(returns)', 'I am ' + name).at('pi', 'Person’s version can read the private `name` field: it is its own field.');
        R.ret().set('(returns)', 'I am ' + name + extra).at(line, `${type} adds its own part to the result.`);
        R.ret().println('I am ' + name + extra).at('call');
      });
      R.del('p').at('for', 'One loop, one call site, two different outputs: inheritance reuses Person’s code and overriding customises it.');
    }
  },

  /* ---------------- 9. interfaces: default, static, private ---------------- */
  't9-default': {
    code: `
interface Greeter {
    String name();
    default String greet() { return "Hello, " + decorate(name()); }   @@greet
    static Greeter of(String n) { return () -> n; }                   @@of
    private String decorate(String s) { return "*" + s + "*"; }       @@dec
}
class Teacher implements Greeter {
    public String name() { return "Sir"; }                             @@tn
    public String greet() { return "Good morning, " + name(); }       @@tg
}
public class Main {
    public static void main(String[] args) {                           @@main
        Greeter g = Greeter.of("Ayan");                                @@g
        System.out.println(g.greet());                                 @@p1
        Greeter t = new Teacher();                                     @@t
        System.out.println(t.greet());                                 @@p2
    }
}`,
    run(R) {
      R.frame('main').at('main');
      R.at('g', '`Greeter.of(…)` is a **static** interface method: call it on the interface name, no object needed.');
      R.frame('Greeter.of(String n)').set('n', 'Ayan');
      const g = R.obj('Greeter (lambda)', { 'n (captured)': 'Ayan' });
      R.set('(returns)', g).at('of', 'The lambda `() -> n` becomes an object that implements the one abstract method, name(). It **captures** n.');
      R.ret().set('g', g).at('g');
      R.at('p1', 'The lambda object does not define greet(), so the interface’s **default** method runs.');
      R.frame('Greeter.greet()  [default]').set('this', g).at('greet', 'First, name() is called on this object…');
      R.frame('name()  [lambda]').set('this', g).set('(returns)', 'Ayan').at('of', '…which runs the lambda body: return the captured n.');
      R.ret().at('greet', 'Then the **private** helper decorate(…) is called. Private interface methods can only be used inside the interface.');
      R.frame('Greeter.decorate(String s)').set('s', 'Ayan').set('(returns)', '*Ayan*').at('dec');
      R.ret().set('(returns)', 'Hello, *Ayan*').at('greet');
      R.ret().println('Hello, *Ayan*').at('p1');
      const t = R.obj('Teacher', {});
      R.set('t', t).at('t', 'A Teacher object, seen through the interface type Greeter.');
      R.at('p2', 'Teacher **overrides** greet(), so the default method is not used this time.');
      R.frame('Teacher.greet()').set('this', t).at('tg');
      R.frame('Teacher.name()').set('this', t).set('(returns)', 'Sir').at('tn');
      R.ret().set('(returns)', 'Good morning, Sir').at('tg');
      R.ret().println('Good morning, Sir').at('p2', 'A default method is a fallback: classes that do not override it get it for free.');
    }
  },

  /* ---------------- 10. custom exceptions ---------------- */
  't10-custom': {
    code: `
class InsufficientFundsException extends Exception {
    private final double shortBy;
    InsufficientFundsException(double shortBy) {                     @@ec
        super("Insufficient funds: short by " + shortBy);
        this.shortBy = shortBy;
    }
}
class Account {
    private double balance = 500;
    void withdraw(double amt) throws InsufficientFundsException {    @@w
        if (amt > balance)                                           @@if
            throw new InsufficientFundsException(amt - balance);     @@thr
        balance -= amt;                                              @@sub
        System.out.println("Withdrew " + amt + ", left " + balance); @@pw
    }
}
public class Bank {
    public static void main(String[] args) {                         @@main
        Account acc = new Account();                                 @@acc
        try {
            acc.withdraw(200);                                       @@w1
            acc.withdraw(450);                                       @@w2
            acc.withdraw(10);                                        @@w3
        } catch (InsufficientFundsException e) {                     @@catch
            System.out.println(e.getMessage());                      @@pm
        }
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const acc = R.obj('Account', { balance: D(500) });
      R.set('acc', acc).at('acc');
      let bal = 500;
      [[200, 'w1'], [450, 'w2']].forEach(([amt, line]) => {
        R.at(line);
        R.frame('withdraw(double amt)').set('this', acc).set('amt', D(amt)).at('w');
        if (amt > bal) {
          R.at('if', `${amt}.0 > ${bal}.0: not enough money.`);
          R.frame('InsufficientFundsException(double)').set('shortBy', D(amt - bal));
          const ex = R.obj('InsufficientFundsException', { message: `Insufficient funds: short by ${amt - bal}.0`, shortBy: D(amt - bal) });
          R.set('this', ex).at('ec', 'Our own exception class: a normal class that extends **Exception**, with an extra field. `super(…)` stores the message.');
          R.ret().set('(throws)', ex).at('thr', '`throw` hands the object to the JVM and **abandons** withdraw(). The balance line never runs.');
          R.ret().set('e', ex).at('catch', 'main has a matching catch. The third withdraw(10) is **skipped**: control jumps straight here.');
          R.println(`Insufficient funds: short by ${amt - bal}.0`).at('pm', 'The caller gets a clear message and the exact shortfall (e.getShortBy() would return 150.0).');
        } else {
          R.at('if', `${amt}.0 > ${bal}.0 is false: enough money.`);
          bal -= amt; R.setf(acc, 'balance', D(bal)).at('sub');
          R.println(`Withdrew ${amt}.0, left ${bal}.0`).at('pw');
          R.ret().at(line, 'withdraw() returned normally.');
        }
      });
      R.del('e').at('pm', 'Because the exception is **checked**, the compiler forced main to either catch it or declare `throws`.');
    }
  },

  /* ---------------- 11. threads ---------------- */
  't11-threads': {
    code: `
class Worker extends Thread {
    Worker(String name) { super(name); }
    public void run() {                                          @@run
        for (int i = 1; i <= 2; i++)                             @@for
            System.out.println(getName() + " step " + i);        @@pr
    }
}
public class Main {
    public static void main(String[] args)                       @@main
            throws InterruptedException {
        Thread w = new Worker("W");                              @@w
        Thread t = new Thread(                                   @@t
            () -> System.out.println("Task in T"), "T");         @@tl
        w.start();                                               @@ws
        t.start();                                               @@ts
        w.join();                                                @@wj
        t.join();                                                @@tj
        System.out.println("main ends");                         @@end
    }
}`,
    run(R) {
      R.thread('main', 'RUNNABLE').frame('main').at('main', 'Every Java program starts with one thread, **main**, and its own call stack.');
      const w = R.obj('Worker', { name: 'W', state: 'NEW' });
      R.tstate('W', 'NEW').set('w', w).at('w', 'A Thread **object** exists, but no new thread of execution yet. Its state is NEW and it has no stack.');
      const job = R.obj('Runnable (lambda)', {});
      const t = R.obj('Thread', { name: 'T', state: 'NEW', target: job });
      R.tstate('T', 'NEW').set('t', t).at('t', 'Way 2: a Thread wrapping a Runnable task (here a lambda).');
      R.tstate('W', 'RUNNABLE').setf(w, 'state', 'RUNNABLE').at('ws', '`start()` creates a new thread with **its own stack** and returns at once. main does not wait.');
      R.thread('W').frame('run()').set('this', w).at('run', 'The scheduler gives W a turn. Its stack begins with run().');
      R.set('i', 1).at('for');
      R.println('W step 1').at('pr');
      R.thread('main').tstate('T', 'RUNNABLE').setf(t, 'state', 'RUNNABLE').at('ts', 'The scheduler switches back to main, which starts T. Three threads now share the CPU.');
      R.thread('T').frame('run()  [lambda]').println('Task in T').at('tl', 'T runs its task: a single println.');
      R.ret().tstate('T', 'TERMINATED').setf(t, 'state', 'TERMINATED').at('tl', 'run() returned, so T is **TERMINATED**. Its stack is gone; the Thread object stays on the heap.');
      R.thread('main', 'WAITING').at('wj', '`w.join()`: main is **WAITING** until W has finished.');
      R.thread('W').set('i', 2).at('for', 'W continues where it left off: its local `i` was kept safe on its own stack.');
      R.println('W step 2').at('pr');
      R.set('i', 3).at('for', '3 <= 2 is false: the loop ends.');
      R.ret().tstate('W', 'TERMINATED').setf(w, 'state', 'TERMINATED').at('run', 'W’s run() returns: W is TERMINATED.');
      R.thread('main', 'RUNNABLE').at('wj', 'W has terminated, so join() returns and main is RUNNABLE again.');
      R.at('tj', 'T already terminated, so this join() returns immediately.');
      R.println('main ends').at('end', 'The order of the lines from W and T can change from run to run: the **scheduler** decides who goes next. Only join() guarantees "main ends" is last.');
    }
  },
  't11-race': {
    code: `
class Counter {
    int count = 0;
    void increment() {          // count++ is really 3 steps:   @@inc
        int tmp = count;        // 1. read                      @@read
        tmp = tmp + 1;          // 2. add                       @@add
        count = tmp;            // 3. write back                @@write
    }
}
public class Race {
    public static void main(String[] args)                       @@main
            throws InterruptedException {
        Counter c = new Counter();                               @@c
        Thread a = new Thread(c::increment, "A");                @@a
        Thread b = new Thread(c::increment, "B");                @@b
        a.start(); b.start();                                    @@start
        a.join();  b.join();                                     @@join
        System.out.println(c.count);                             @@p
    }
}`,
    scenarioLabel: 'Schedule:',
    scenarios: [
      { label: 'A then B', ops: ['A', 'A', 'A', 'B', 'B', 'B'] },
      { label: 'Interleaved (lost update)', ops: ['A', 'B', 'A', 'B', 'A', 'B'] }
    ].map((sc) => ({
      label: sc.label,
      run(R) {
        R.thread('main', 'RUNNABLE').frame('main').at('main');
        const c = R.obj('Counter', { count: 0 });
        R.set('c', c).at('c', 'One Counter object on the heap. Both threads will use **this same object**.');
        const ta = R.obj('Thread', { name: 'A', task: c }); R.tstate('A', 'NEW').set('a', ta).at('a');
        const tb = R.obj('Thread', { name: 'B', task: c }); R.tstate('B', 'NEW').set('b', tb).at('b');
        R.tstate('A', 'RUNNABLE').tstate('B', 'RUNNABLE').at('start', 'Both threads are started. From now on the **scheduler** decides who runs next.');
        R.thread('main', 'WAITING').at('join', 'main waits for both workers.');
        const pc = { A: 0, B: 0 }, tmp = {};
        sc.ops.forEach((who) => {
          R.thread(who);
          const k = pc[who]++;
          if (k === 0) {
            R.frame('increment()').set('this', c);
            tmp[who] = R.getf(c, 'count'); R.set('tmp', tmp[who]).at('read', `${who} **reads** count = ${tmp[who]} into its own local tmp.` + (who === 'B' && pc.A === 1 ? ' A has not written its result yet, so B reads the **old** value!' : ''));
          } else if (k === 1) {
            tmp[who]++; R.set('tmp', tmp[who]).at('add', `${who} adds 1 to its private copy: tmp = ${tmp[who]}. The shared count has not changed.`);
          } else {
            const before = R.getf(c, 'count');
            R.setf(c, 'count', tmp[who]).at('write', `${who} **writes** ${tmp[who]} back to count.` + (before === tmp[who] ? ` count was already ${before}: B’s write overwrote A’s. **One increment is lost.**` : ''));
            R.ret().tstate(who, 'TERMINATED').at('inc', `${who} is finished.`);
          }
        });
        const v = R.getf(c, 'count');
        R.thread('main', 'RUNNABLE').at('join', 'Both workers have terminated; join() returns.');
        R.println(String(v)).at('p', v === 2 ? 'Correct: 2. But this order is only one of many; nothing forces it.' : 'Two increments, but count is **1**. This is a race condition. Making increment() `synchronized` lets only one thread at a time run it.');
      }
    }))
  },
  't11-sync': {
    code: `
class Counter {
    private int count = 0;
    synchronized void increment() {      // takes this object's lock  @@inc
        int tmp = count;                                               @@read
        count = tmp + 1;                                               @@write
    }                                    // releases the lock         @@rel
}
public class SafeCounter {
    public static void main(String[] args)                             @@main
            throws InterruptedException {
        Counter c = new Counter();                                     @@c
        Thread a = new Thread(c::increment, "A");                      @@a
        Thread b = new Thread(c::increment, "B");                      @@b
        a.start(); b.start();                                          @@start
        a.join();  b.join();                                           @@join
    }
}`,
    run(R) {
      R.thread('main', 'RUNNABLE').frame('main').at('main');
      const c = R.obj('Counter', { count: 0, 'lock owner': null });
      R.set('c', c).at('c', 'Every object has one **lock** (monitor). Right now nobody holds it.');
      R.tstate('A', 'NEW').set('a', R.obj('Thread', { name: 'A', task: c })).at('a');
      R.tstate('B', 'NEW').set('b', R.obj('Thread', { name: 'B', task: c })).at('b');
      R.tstate('A', 'RUNNABLE').tstate('B', 'RUNNABLE').at('start');
      R.thread('main', 'WAITING').at('join');
      R.thread('A').frame('increment()').set('this', c).setf(c, 'lock owner', 'A').at('inc', 'A enters the synchronized method and **takes the lock** of c.');
      R.set('tmp', 0).at('read', 'A reads count = 0…');
      R.thread('B', 'BLOCKED').at('inc', '…then the scheduler switches to B. B wants the same lock, but A holds it, so B is **BLOCKED**. It cannot read the old value.');
      R.thread('A').setf(c, 'count', 1).at('write', 'A continues and writes 1.');
      R.ret().setf(c, 'lock owner', null).tstate('A', 'TERMINATED').tstate('B', 'RUNNABLE').at('rel', 'A leaves the method and **releases the lock**. B is RUNNABLE again.');
      R.thread('B').frame('increment()').set('this', c).setf(c, 'lock owner', 'B').at('inc', 'Now B takes the lock.');
      R.set('tmp', 1).at('read', 'B reads 1, the value A wrote.');
      R.setf(c, 'count', 2).at('write');
      R.ret().setf(c, 'lock owner', null).tstate('B', 'TERMINATED').at('rel', 'B releases the lock.');
      R.thread('main', 'RUNNABLE').at('join', 'count is 2, whatever the schedule. The price: B had to wait, so threads should hold a lock only briefly.');
    }
  },

  /* ---------------- 12. strings ---------------- */
  't12-initials': {
    code: `
public class Initials {
    public static void main(String[] args) {                 @@main
        String s = "Green University of Bangladesh";         @@s
        String[] words = s.split(" ");                       @@split
        String initials = "";                                @@init
        for (String w : words)                               @@for
            initials += w.charAt(0);                         @@add
        System.out.println(initials);                        @@p
    }
}`,
    run(R) {
      R.frame('main').at('main');
      const text = 'Green University of Bangladesh';
      const s = R.str(text, 'pool'); R.set('s', s).at('s', 'A string **literal** lives in the string pool.');
      const parts = text.split(' ').map((w) => R.str(w));
      const words = R.arr('String[]', parts);
      R.set('words', words).at('split', '`split(" ")` creates a String[] and four **new** String objects, one per word.');
      let cur = R.str('', 'pool'); R.set('initials', cur).at('init');
      let acc = '';
      text.split(' ').forEach((w, i) => {
        R.set('w', parts[i]).mark(words, [i]).at('for', `w now refers to "${w}".`);
        acc += w[0]; cur = R.str(acc); R.set('initials', cur).at('add', `Strings are **immutable**: += builds a brand-new String "${acc}". ${i ? 'The previous one has no reference left: garbage.' : ''}`);
      });
      R.del('w').println(acc).at('p', 'Four passes made four String objects, three of them garbage. For long loops, use a StringBuilder instead.');
    }
  },

  /* ---------------- 13. GUI events and JDBC ---------------- */
  't13-grade': {
    code: `
public class GradeApp extends Application {
    public void start(Stage stage) {                                  @@start
        TextField marks = new TextField();                            @@tf
        Label result = new Label();                                   @@lb
        Button calc = new Button("Get grade");                        @@bt
        calc.setOnAction(e -> {                                       @@set
            try {
                int m = Integer.parseInt(marks.getText().trim());     @@parse
                result.setText(m >= 80 ? "A+" : m >= 70 ? "A" : "Below A");   @@grade
            } catch (NumberFormatException ex) {                      @@catch
                result.setText("Please enter a whole number");        @@err
            }
        });
        stage.setScene(new Scene(new VBox(8, marks, calc, result)));  @@scene
        stage.show();                                                 @@show
    }
}`,
    scenarioLabel: 'The user types:',
    scenarios: ['76', 'abc'].map((input) => ({
      label: '"' + input + '"',
      run(R) {
        R.frame('start(Stage stage)').at('start', 'JavaFX calls start() on the **JavaFX Application Thread**.');
        const tf = R.obj('TextField', { text: '' }); R.set('marks', tf).at('tf');
        const lb = R.obj('Label', { text: '' }); R.set('result', lb).at('lb');
        const bt = R.obj('Button', { text: 'Get grade', onAction: null }); R.set('calc', bt).at('bt');
        const hd = R.obj('EventHandler (lambda)', { marks: tf, result: lb });
        R.setf(bt, 'onAction', hd).at('set', 'The lambda becomes an **object** that captures `marks` and `result`. It is only registered here: **nothing runs yet**.');
        R.at('scene', 'The controls are put in a layout pane, and the pane in a Scene.');
        R.at('show', 'The window appears.');
        R.ret().at('show', 'start() returns and its local variables are gone, but the handler still refers to the TextField and Label, so they stay alive.');
        R.setf(tf, 'text', input).at('set', `The user types ${input} and clicks the button. The Button creates an ActionEvent and calls its handler.`);
        const ev = R.obj('ActionEvent', { source: bt });
        R.frame('handle(ActionEvent e)').set('e', ev).at('set', 'The lambda body now runs, in a **new frame**, long after start() finished.');
        if (/^\d+$/.test(input)) {
          const m = +input; R.set('m', m).at('parse', `getText() gives "${input}", parseInt turns it into the int ${m}.`);
          R.setf(lb, 'text', m >= 80 ? 'A+' : m >= 70 ? 'A' : 'Below A').at('grade', `${m} >= 80 is false, ${m} >= 70 is true → "A". The Label shows it on screen.`);
        } else {
          R.at('parse', `parseInt("${input}") cannot read a number…`);
          const ex = R.obj('NumberFormatException', { message: `For input string: "${input}"` });
          R.set('ex', ex).at('catch', '…so it throws a NumberFormatException, caught right here. Without the catch, the error would only appear in the console.');
          R.setf(lb, 'text', 'Please enter a whole number').at('err', 'The user sees a helpful message instead.');
        }
        R.ret().at('show', 'The handler returns. The program waits for the next event: GUI programs are **event-driven**.');
      }
    }))
  },
  't13-jdbc': {
    code: `
public class TopStudents {
    public static void main(String[] args) throws SQLException {          @@main
        String sql = "SELECT name, marks FROM student WHERE marks >= ?";  @@sql
        try (Connection con = DriverManager.getConnection(URL, USER, PASS);   @@con
             PreparedStatement ps = con.prepareStatement(sql)) {          @@ps
            ps.setInt(1, 70);                                             @@set
            ResultSet rs = ps.executeQuery();                             @@exec
            while (rs.next()) {                                           @@next
                String name = rs.getString("name");                       @@name
                int marks = rs.getInt("marks");                           @@marks
                System.out.println(name + " " + marks);                   @@pr
            }
        }                                                                 @@close
    }
}`,
    run(R) {
      R.frame('main').at('main', 'Table **student**: (Ayan, 64), (Nabila, 85), (Rahim, 72).');
      const sql = R.str('SELECT name, marks FROM student WHERE marks >= ?', 'pool');
      R.set('sql', sql).at('sql', 'The `?` is a **placeholder**. The value is filled in later and never pasted into the SQL text, which blocks SQL injection.');
      const con = R.obj('Connection', { url: 'jdbc:mysql://localhost/gub', open: true });
      R.set('con', con).at('con', 'getConnection opens a network connection to the database server.');
      const ps = R.obj('PreparedStatement', { sql, '?1': null, open: true });
      R.set('ps', ps).at('ps', 'The database checks and prepares the query once.');
      R.setf(ps, '?1', 70).at('set', 'Fill placeholder 1 with 70.');
      const rs = R.obj('ResultSet', { cursor: 'before row 1', rows: 2 });
      R.set('rs', rs).at('exec', 'executeQuery sends the query. The result is a ResultSet with 2 matching rows; its **cursor** starts *before* the first row.');
      [['Nabila', 85], ['Rahim', 72]].forEach(([n, m], i) => {
        R.setf(rs, 'cursor', `row ${i + 1}: ${n}, ${m}`).at('next', `next() moves the cursor to row ${i + 1} and returns true.`);
        R.set('name', n).at('name');
        R.set('marks', m).at('marks');
        R.println(n + ' ' + m).at('pr');
        R.del('name', 'marks');
      });
      R.setf(rs, 'cursor', 'after last row').at('next', 'next() has no more rows and returns **false**: the loop ends.');
      R.setf(rs, 'open', false).setf(ps, 'open', false).setf(con, 'open', false).del('rs', 'ps', 'con').at('close', 'Leaving try-with-resources closes ps, then con, in reverse order, even if an exception had happened. Closing ps also closes its ResultSet.');
    }
  }
};
