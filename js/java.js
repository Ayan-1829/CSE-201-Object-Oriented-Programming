/* ===================== java.js : Java syntax highlighting ===================== */
const Java = (() => {
  const KW = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try var void volatile while record yield sealed permits').split(' '));
  const LIT = new Set(['true', 'false', 'null']);
  const NUM = /^(0[xX][0-9a-fA-F_]+[lL]?|0[bB][01_]+[lL]?|(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?[fFdDlL]?)/;

  /* returns [{c: class|'' , t: text}] for the whole source */
  function tokens(src) {
    const out = []; let i = 0; const n = src.length;
    const push = (c, t) => out.push({ c, t });
    while (i < n) {
      const ch = src[i], rest = src.slice(i);
      if (rest.startsWith('//')) { let j = src.indexOf('\n', i); if (j < 0) j = n; push('com', src.slice(i, j)); i = j; continue; }
      if (rest.startsWith('/*')) { let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; push('com', src.slice(i, j)); i = j; continue; }
      if (ch === '"') {
        let j = i + 1;
        while (j < n && src[j] !== '"' && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
        push('str', src.slice(i, j + 1)); i = j + 1; continue;
      }
      if (ch === "'") {
        let j = i + 1;
        while (j < n && src[j] !== "'" && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
        push('str', src.slice(i, j + 1)); i = j + 1; continue;
      }
      if (ch === '@' && /[A-Za-z]/.test(src[i + 1] || '')) { const m = /^@\w+/.exec(rest); push('an', m[0]); i += m[0].length; continue; }
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const m = NUM.exec(rest); if (m && m[0]) { push('num', m[0]); i += m[0].length; continue; }
      }
      if (/[A-Za-z_$]/.test(ch)) {
        const m = /^[A-Za-z_$][\w$]*/.exec(rest), w = m[0];
        let j = i + w.length; while (j < n && src[j] === ' ') j++;
        let c = '';
        if (KW.has(w)) c = 'kw';
        else if (LIT.has(w)) c = 'lit';
        else if (src[j] === '(') c = /^[A-Z]/.test(w) ? 'ty' : 'fn';
        else if (/^[A-Z]/.test(w)) c = /^[A-Z0-9_]+$/.test(w) && w.length > 1 ? 'cst' : 'ty';
        push(c, w); i += w.length; continue;
      }
      if (/\s/.test(ch)) { const m = /^\s+/.exec(rest); push('', m[0]); i += m[0].length; continue; }
      push('op', ch); i++;
    }
    return out;
  }
  /* split the token stream into lines (tokens that span a newline are cut) */
  function lines(src) {
    const res = [[]];
    tokens(src.replace(/\t/g, '    ')).forEach(({ c, t }) => {
      const parts = t.split('\n');
      parts.forEach((p, k) => { if (k > 0) res.push([]); if (p) res[res.length - 1].push({ c, t: p }); });
    });
    return res;
  }
  function lineEl(toks, num, opts) {
    const body = h('span', { class: 'cc' }, toks.map(({ c, t }) => (c ? h('span', { class: 'tk-' + c }, t) : t)), toks.length ? null : ' ');
    return h('span', { class: 'cl', 'data-n': num }, opts.nums === false ? null : h('span', { class: 'cn', 'aria-hidden': 'true' }, String(num)), body);
  }
  function parseMarks(s) {
    const set = new Set();
    (s || '').split(',').forEach((p) => { const m = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(p); if (!m) return; const a = +m[1], b = m[2] ? +m[2] : a; for (let k = a; k <= b; k++) set.add(k); });
    return set;
  }
  /* render source into an existing <pre class="code"> (or a new one) */
  function render(src, pre, opts = {}) {
    pre = pre || h('pre', { class: 'code' });
    const code = h('code', { class: 'language-java' });
    const marks = parseMarks(opts.marks);
    lines(src.replace(/^\n+|\s+$/g, '')).forEach((toks, k) => {
      const el = lineEl(toks, k + 1, opts);
      if (marks.has(k + 1)) el.classList.add('mk');
      code.append(el);
    });
    clear(pre).append(code);
    if (opts.nums === false) pre.classList.add('nonum');
    pre.setAttribute('data-hl', '1');
    return pre;
  }
  function highlightAll(root) {
    (root || document).querySelectorAll('pre.code:not([data-hl])').forEach((pre) => {
      render(pre.textContent, pre, { marks: pre.getAttribute('data-mark'), nums: !pre.classList.contains('nonum') });
    });
  }
  return { tokens, lines, render, highlightAll, lineEl };
})();
