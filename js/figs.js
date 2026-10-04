/* ===================== figs.js : diagram generators + the figure registry ===================== */
/* Every figure is drawn at runtime from a small spec, so all diagrams share one visual language
   and follow the light/dark theme through CSS variables. Mount with
   <figure class="fig" data-fig="name"><figcaption>…</figcaption></figure>.
   Text is measured in the fonts and sizes the slides use (18px titles, 16px labels) and long
   text is wrapped onto several lines, so every box is sized to hold its words. Hand-placed
   coordinates in the specs are multiplied by K to leave room for that text size. */
const Figs = (() => {
  let uid = 0;
  const K = 1.2;
  const FONT = { t: "700 18px 'Bricolage Grotesque', system-ui, sans-serif", s: "700 16px 'Bricolage Grotesque', system-ui, sans-serif", m: "500 16px 'IBM Plex Mono', ui-monospace, Menlo, monospace" };
  const LH = { t: 22, s: 20, m: 20 };
  let ctx = null;
  /* width of the widest line; kind: 't' title, 's' label, 'm' (or true) monospace */
  const tw = (s, kind) => {
    kind = kind === true || kind === 1 ? 'm' : kind || 't';
    ctx = ctx || document.createElement('canvas').getContext('2d');
    ctx.font = FONT[kind];
    return Math.ceil(Math.max(...String(s).split('\n').map((l) => ctx.measureText(l).width)) * 1.03);
  };
  const kindOf = (cls) => (/fg-m/.test(cls) ? 'm' : /fg-t|fg-hdr/.test(cls) ? 't' : 's');
  const nl = (s) => String(s).split('\n').length;
  /* break s at spaces so that no line is wider than maxW; explicit \n breaks are kept */
  function wrap(s, maxW, kind) {
    return String(s).split('\n').map((line) => {
      if (tw(line, kind) <= maxW) return line;
      const out = []; let cur = '';
      line.split(' ').forEach((w) => {
        const next = cur ? cur + ' ' + w : w;
        if (cur && tw(next, kind) > maxW) { out.push(cur); cur = w; } else cur = next;
      });
      if (cur) out.push(cur);
      return out.join('\n');
    }).join('\n');
  }
  function root(w, hh, label) {
    const svg = sv('svg', { viewBox: `0 0 ${Math.ceil(w)} ${Math.ceil(hh)}`, class: 'figsvg', role: 'img', 'aria-label': label || 'diagram', style: { width: Math.ceil(w) + 'px', maxWidth: 'none' } });
    const id = 'fg' + (++uid);
    svg.append(sv('defs', null,
      sv('marker', { id: id + 'a', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, sv('path', { d: 'M0,0 L10,5 L0,10 z', class: 'fg-ah' })),
      sv('marker', { id: id + 'r', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, sv('path', { d: 'M0,0 L10,5 L0,10 z', class: 'fg-ah-acc' })),
      sv('marker', { id: id + 't', viewBox: '0 0 14 14', refX: 13, refY: 7, markerWidth: 14, markerHeight: 14, markerUnits: 'userSpaceOnUse', orient: 'auto' }, sv('path', { d: 'M1,1 L13,7 L1,13 z', class: 'fg-tri' })),
      sv('marker', { id: id + 'd', viewBox: '0 0 16 10', refX: 15, refY: 5, markerWidth: 16, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto' }, sv('path', { d: 'M1,5 L8,1 L15,5 L8,9 z', class: 'fg-diam' }))));
    svg.mid = id;
    return svg;
  }
  /* text; lines split on \n are centred vertically on y */
  const T = (x, y, s, cls, anchor, extra) => {
    const lines = String(s).split('\n'), lh = LH[kindOf(cls || 'fg-t')];
    const y0 = y - (lines.length - 1) * lh / 2;
    return sv('text', Object.assign({ x, y, class: cls || 'fg-t', 'text-anchor': anchor || 'middle' }, extra || {}),
      lines.map((line, i) => sv('tspan', { x, y: y0 + i * lh }, line)));
  };
  function label(svg, x, y, s, cls) {
    const w = tw(s, 's') + 14, n = nl(s);
    svg.append(sv('rect', { x: x - w / 2, y: y - 11 - (n - 1) * 10, width: w, height: 22 + (n - 1) * 20, rx: 4, class: 'fg-lblbg' }), T(x, y + 5, s, cls || 'fg-s'));
  }
  function marker(svg, kind) { return `url(#${svg.mid}${kind})`; }

  /* ---------------- UML class diagram ---------------- */
  /* items: [{id, kind:'class'|'abstract'|'interface'|'object', name, fields, methods, x, y, hl, w}]
     links: [{a, b, type:'extends'|'implements'|'assoc'|'has'|'instance'|'uses', t}] ; a = child/from */
  function uml(spec) {
    const RH = 24, PAD = 14;
    const items = spec.items.map((it) => Object.assign({}, it, { x: it.x * K, y: it.y * K }));
    items.forEach((it) => {
      const titles = [it.kind === 'interface' ? '«interface»' : it.kind === 'abstract' ? '«abstract»' : null, it.name].filter(Boolean);
      const widths = [...titles.map((t, k) => tw(t, k === titles.length - 1 ? 't' : 's')), ...(it.fields || []).map((t) => tw(t, 'm')), ...(it.methods || []).map((t) => tw(t, 'm'))];
      it.w = Math.max(it.w ? it.w * K : 0, 130, Math.ceil(Math.max(...widths) + 2 * PAD));
      it.titles = titles; it.headH = titles.length * RH + 12;
      const obj = it.kind === 'object';
      it.fh = (it.fields || []).length ? it.fields.length * RH + 10 : (obj ? 0 : 12);
      it.mh = (it.methods || []).length ? it.methods.length * RH + 10 : (obj || it.noMethods ? 0 : 12);
      it.h = it.headH + it.fh + it.mh;
    });
    const by = {}; items.forEach((it) => { by[it.id] = it; });
    const W = Math.max(spec.w ? spec.w * K : 0, Math.max(...items.map((it) => it.x + it.w)) + 14), H = Math.max(spec.h ? spec.h * K : 0, Math.max(...items.map((it) => it.y + it.h)) + 14);
    const svg = root(W, H, spec.label);
    (spec.links || []).forEach((l) => {
      const a = by[l.a], b = by[l.b];
      const d = route(a, b, l);
      const dash = l.type === 'implements' || l.type === 'instance' || l.type === 'uses';
      const end = l.type === 'extends' || l.type === 'implements' ? marker(svg, 't') : l.type === 'has' ? null : marker(svg, 'a');
      const start = l.type === 'has' ? marker(svg, 'd') : null;
      svg.append(sv('path', { d: d.path, class: 'fg-edge' + (dash ? ' fg-dash' : '') + (l.hl ? ' fg-acc' : ''), 'marker-end': end, 'marker-start': start }));
      if (l.t) label(svg, d.lx, d.ly, l.t);
    });
    items.forEach((it) => {
      const g = sv('g', { class: 'fg-cls' + (it.hl ? ' fg-hl' : '') + (it.dim ? ' fg-dim' : '') });
      const obj = it.kind === 'object';
      g.append(sv('rect', { x: it.x, y: it.y, width: it.w, height: it.h, rx: obj ? 10 : 4, class: 'fg-box' }));
      g.append(sv('rect', { x: it.x + 1, y: it.y + 1, width: it.w - 2, height: it.headH - 1, rx: obj ? 9 : 3, class: obj ? 'fg-objhead' : it.kind === 'interface' ? 'fg-ifhead' : 'fg-head' }));
      it.titles.forEach((t, k) => {
        const isName = k === it.titles.length - 1;
        g.append(T(it.x + it.w / 2, it.y + 24 + k * RH, t, isName ? 'fg-t' + (it.kind === 'abstract' || it.kind === 'interface' ? ' fg-i' : '') : 'fg-s fg-i', 'middle', obj && isName ? { 'text-decoration': 'underline' } : null));
      });
      let y = it.y + it.headH;
      if (it.fh) { g.append(sv('line', { x1: it.x, y1: y, x2: it.x + it.w, y2: y, class: 'fg-sep' })); (it.fields || []).forEach((f, k) => g.append(T(it.x + PAD, y + 22 + k * RH, f, 'fg-m', 'start'))); y += it.fh; }
      if (it.mh) { g.append(sv('line', { x1: it.x, y1: y, x2: it.x + it.w, y2: y, class: 'fg-sep' })); (it.methods || []).forEach((m, k) => g.append(T(it.x + PAD, y + 22 + k * RH, m, 'fg-m' + (/^\s*\/?\*|abstract/.test(m) ? ' fg-i' : ''), 'start'))); }
      svg.append(g);
    });
    return svg;
  }
  function anchor(it, side) {
    if (side === 'top') return [it.x + it.w / 2, it.y];
    if (side === 'bottom') return [it.x + it.w / 2, it.y + it.h];
    if (side === 'left') return [it.x, it.y + it.h / 2];
    return [it.x + it.w, it.y + it.h / 2];
  }
  function route(a0, b, l) {
    l = l || {};
    const a = l.dx ? Object.assign({}, a0, { x: a0.x + l.dx * K }) : a0;
    if (b.y + b.h <= a.y - 8 && l.side !== 'h') { // b above a
      const [x1, y1] = anchor(a, 'top'), [x2, y2] = anchor(b, 'bottom'), m = l.midY ? l.midY * K : (y1 + y2) / 2;
      return { path: `M${x1},${y1} V${m} H${x2} V${y2}`, lx: x1, ly: (y1 + m) / 2 };
    }
    if (a.y + a.h <= b.y - 8 && l.side !== 'h') { // b below a
      const [x1, y1] = anchor(a, 'bottom'), [x2, y2] = anchor(b, 'top'), m = l.midY ? l.midY * K : (y1 + y2) / 2;
      return { path: `M${x1},${y1} V${m} H${x2} V${y2}`, lx: x2, ly: (m + y2) / 2 };
    }
    const right = b.x >= a.x + a.w;
    const [x1, y1] = anchor(a, right ? 'right' : 'left'), [x2, y2] = anchor(b, right ? 'left' : 'right'), m = (x1 + x2) / 2;
    return { path: Math.abs(y1 - y2) < 2 ? `M${x1},${y1} H${x2}` : `M${x1},${y1} H${m} V${y2} H${x2}`, lx: m, ly: Math.min(y1, y2) - 14 };
  }

  /* ---------------- top-down tree ---------------- */
  /* root: {t, s, c, k:[...]} */
  function tree(spec) {
    const gapX = spec.gapX || 18, gapY = spec.gapY || 46;
    let leaf = 0; const nodes = [];
    const measure = (n) => { n.w = Math.max(spec.minW || 96, tw(n.t, n.m ? 'm' : 't') + 26, n.s ? tw(n.s, 's') + 20 : 0); (n.k || []).forEach(measure); };
    measure(spec.root);
    const hasSub = (n) => !!n.s || (n.k || []).some(hasSub);
    const nh = Math.max(spec.nodeH || 0, hasSub(spec.root) ? 56 : 42);
    const slot = spec.slot || Math.max(...(function all(n) { return [n.w, ...(n.k || []).flatMap(all)]; })(spec.root)) + gapX;
    (function place(n, d) {
      n.y = 10 + d * (nh + gapY);
      if (!n.k || !n.k.length) { n.cx = 10 + leaf * slot + slot / 2; leaf++; }
      else { n.k.forEach((c) => place(c, d + 1)); n.cx = (n.k[0].cx + n.k[n.k.length - 1].cx) / 2; }
      nodes.push(n);
    })(spec.root, 0);
    const W = leaf * slot + 20, H = Math.max(...nodes.map((n) => n.y)) + nh + 12;
    const svg = root(W, H, spec.label);
    nodes.forEach((n) => (n.k || []).forEach((c) => {
      const m = n.y + nh + gapY / 2;
      svg.append(sv('path', { d: `M${n.cx},${n.y + nh} V${m} H${c.cx} V${c.y}`, class: 'fg-edge' + (c.hl ? ' fg-acc' : ''), 'marker-end': spec.arrows ? marker(svg, spec.arrows === 't' ? 't' : 'a') : null }));
    }));
    nodes.forEach((n) => {
      const g = sv('g', { class: 'fg-node' + (n.hl ? ' fg-hl' : '') });
      g.append(sv('rect', { x: n.cx - n.w / 2, y: n.y, width: n.w, height: nh, rx: spec.round ? nh / 2 : 7, class: 'fg-box ' + (n.c || spec.c || 'fg-c0') }));
      if (n.s) { g.append(T(n.cx, n.y + nh / 2 - 4, n.t, n.m ? 'fg-m' : 'fg-t'), T(n.cx, n.y + nh / 2 + 16, n.s, 'fg-s')); }
      else g.append(T(n.cx, n.y + nh / 2 + 6, n.t, n.m ? 'fg-m' : 'fg-t'));
      svg.append(g);
    });
    return svg;
  }

  /* ---------------- indented tree (file-explorer style) ---------------- */
  /* rows: [[depth, text, cls, note]] */
  function itree(spec) {
    const RH = spec.rowH || 36, IND = spec.indent || 34, kt = spec.mono ? 'm' : 't';
    const rows = spec.rows.map(([d, t, c, note]) => ({ d, t, c, note }));
    const W = Math.max(spec.w ? spec.w * K : 0, Math.max(...rows.map((r) => 12 + r.d * IND + tw(r.t, kt) + 24 + (r.note ? tw(r.note, 's') + 14 : 0))) + 12);
    const H = rows.length * RH + 12;
    const svg = root(W, H, spec.label);
    rows.forEach((r, i) => {
      r.x = 12 + r.d * IND; r.y = 8 + i * RH;
      let p = i - 1; while (p >= 0 && rows[p].d >= r.d) p--;
      if (p >= 0) {
        const px = rows[p].x + 10, py = rows[p].y + RH - 5;
        svg.append(sv('path', { d: `M${px},${py} V${r.y + RH / 2 - 1} H${r.x}`, class: 'fg-edge fg-thin' }));
      }
    });
    rows.forEach((r) => {
      const w = tw(r.t, kt) + 22;
      svg.append(sv('rect', { x: r.x, y: r.y + 3, width: w, height: RH - 8, rx: 6, class: 'fg-box ' + (r.c || 'fg-c0') }));
      svg.append(T(r.x + 11, r.y + RH / 2 + 5, r.t, spec.mono ? 'fg-m' : 'fg-t', 'start'));
      if (r.note) svg.append(T(r.x + w + 12, r.y + RH / 2 + 5, r.note, 'fg-s', 'start'));
    });
    return svg;
  }

  /* ---------------- positioned graph (flowcharts, state diagrams, pipelines) ---------------- */
  /* nodes: [{id, t, s, x, y (center), w, h, shape:'rect'|'round'|'diamond'|'circle'|'db', c}]
     edges: [{a, b, t, from, to, curve, dash, hl, tri, via:[[x,y],...], dx, dy}]
     w / h are minimums: a node always grows to fit its text */
  function graph(spec) {
    const nodes = {};
    spec.nodes.forEach((n0) => {
      const n = Object.assign({ shape: 'rect' }, n0, { x: n0.x * K, y: n0.y * K });
      const inner = Math.max(tw(n.t, n.m ? 'm' : 't'), n.s ? tw(n.s, 's') : 0);
      n.textH = nl(n.t) * LH.t + (n.s ? nl(n.s) * LH.s : 0);
      const needW = n.shape === 'diamond' ? inner * 1.7 + 30 : n.shape === 'circle' ? inner * 1.25 + 30 : inner + 30;
      const needH = n.shape === 'diamond' ? n.textH * 2 + 36 : n.textH + (n.shape === 'db' ? 36 : 18);
      n.w = Math.max(n0.w ? n0.w * K : 0, n.shape === 'diamond' ? 140 : 100, Math.ceil(needW));
      n.h = Math.max(n0.h ? n0.h * K : 0, Math.ceil(needH));
      nodes[n.id] = n;
    });
    const svg = root(spec.w * K, spec.h * K, spec.label);
    const side = (n, s) => {
      const hw = n.w / 2, hh = n.h / 2;
      return { top: [n.x, n.y - hh], bottom: [n.x, n.y + hh], left: [n.x - hw, n.y], right: [n.x + hw, n.y] }[s];
    };
    const auto = (a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dy) >= Math.abs(dx) * 0.75) return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
      return dx > 0 ? ['right', 'left'] : ['left', 'right'];
    };
    (spec.edges || []).forEach((e) => {
      const a = nodes[e.a], b = nodes[e.b];
      const [fs, ts] = auto(a, b);
      const p1 = e.p1 ? e.p1.map((v) => v * K) : side(a, e.from || fs), p2 = e.p2 ? e.p2.map((v) => v * K) : side(b, e.to || ts);
      let d, lx, ly;
      if (e.via) {
        const via = e.via.map(([x, y]) => [x * K, y * K]);
        d = `M${p1[0]},${p1[1]} ` + via.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${p2[0]},${p2[1]}`;
        const mid = via[Math.floor((via.length - 1) / 2)]; lx = mid[0]; ly = mid[1];
      } else if (e.curve) {
        const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy) || 1;
        const cx = mx - dy / len * e.curve * K, cy = my + dx / len * e.curve * K;
        d = `M${p1[0]},${p1[1]} Q${cx},${cy} ${p2[0]},${p2[1]}`; lx = (mx + cx) / 2; ly = (my + cy) / 2;
      } else if (e.elbow) {
        d = e.elbow === 'hv' ? `M${p1[0]},${p1[1]} H${p2[0]} V${p2[1]}` : `M${p1[0]},${p1[1]} V${p2[1]} H${p2[0]}`;
        lx = e.elbow === 'hv' ? (p1[0] + p2[0]) / 2 : p1[0]; ly = e.elbow === 'hv' ? p1[1] : (p1[1] + p2[1]) / 2;
      } else { d = `M${p1[0]},${p1[1]} L${p2[0]},${p2[1]}`; lx = (p1[0] + p2[0]) / 2; ly = (p1[1] + p2[1]) / 2; }
      svg.append(sv('path', { d, class: 'fg-edge' + (e.dash ? ' fg-dash' : '') + (e.hl ? ' fg-acc' : ''), 'marker-end': e.noArrow ? null : marker(svg, e.tri ? 't' : e.hl ? 'r' : 'a'), 'marker-start': e.both ? marker(svg, e.hl ? 'r' : 'a') : null }));
      if (e.t) label(svg, lx + (e.dx || 0) * K, ly + (e.dy || 0) * K, e.t, e.hl ? 'fg-s fg-acc-t' : 'fg-s');
    });
    Object.values(nodes).forEach((n) => {
      const g = sv('g', { class: 'fg-node' + (n.hl ? ' fg-hl' : '') });
      const cls = 'fg-box ' + (n.c || 'fg-c0');
      const x0 = n.x - n.w / 2, y0 = n.y - n.h / 2;
      if (n.shape === 'diamond') g.append(sv('path', { d: `M${n.x},${y0} L${x0 + n.w},${n.y} L${n.x},${y0 + n.h} L${x0},${n.y} Z`, class: cls }));
      else if (n.shape === 'circle') g.append(sv('ellipse', { cx: n.x, cy: n.y, rx: n.w / 2, ry: n.h / 2, class: cls }));
      else if (n.shape === 'db') {
        g.append(sv('path', { d: `M${x0},${y0 + 8} V${y0 + n.h - 8} A${n.w / 2},8 0 0 0 ${x0 + n.w},${y0 + n.h - 8} V${y0 + 8}`, class: cls }));
        g.append(sv('ellipse', { cx: n.x, cy: y0 + 8, rx: n.w / 2, ry: 8, class: cls }));
      } else g.append(sv('rect', { x: x0, y: y0, width: n.w, height: n.h, rx: n.shape === 'round' ? Math.min(n.h / 2, 24) : 8, class: cls }));
      const top = n.y - n.textH / 2 + (n.shape === 'db' ? 6 : 0), tL = nl(n.t);
      g.append(T(n.x, top + tL * LH.t / 2 + 6, n.t, n.m ? 'fg-m' : 'fg-t'));
      if (n.s) g.append(T(n.x, top + tL * LH.t + nl(n.s) * LH.s / 2 + 5, n.s, 'fg-s'));
      svg.append(g);
    });
    (spec.notes || []).forEach(([x, y, t, cls, anchorS]) => svg.append(T(x * K, y * K, t, cls || 'fg-s', anchorS || 'middle')));
    return svg;
  }

  /* ---------------- stack / heap memory picture ---------------- */
  /* frames: [{name, vars:[[k, v]]}] ; objs: [{id, title, rows:[[k,v]] | cells:[v], col, garbage, c}]
     statics: [{title, rows}] drawn at the top of the heap column ; regions: [{title, ids}] dashed boxes
     a value {ref:'id'} draws an arrow to that object */
  function memfig(spec) {
    const RH = 30;
    const vtext = (v) => (v === null ? 'null' : typeof v === 'string' ? '"' + v + '"' : v && v.raw !== undefined ? v.raw : String(v));
    const vw = (v) => (v && v.ref ? 16 : tw(vtext(v), 'm'));
    const SW = Math.max(spec.stackW ? spec.stackW * K : 220, ...spec.frames.map((f) => Math.max(tw(f.name) + 28, ...f.vars.map(([k, v]) => tw(k, 'm') + vw(v) + 60))));
    const colGap = spec.colGap ? spec.colGap * K : 300;
    const colX = spec.colX ? spec.colX.map((x) => x * K) : [SW + 90, SW + 90 + colGap];
    const svg = root(spec.w ? spec.w * K : 980, 10, spec.label);
    const layer = sv('g'), edges = sv('g'), top = sv('g');
    svg.append(edges, layer, top);
    const pos = {}, anchors = [];
    /* stack */
    let y = 40;
    layer.append(T(10, 24, spec.stackTitle || 'Stack', 'fg-hdr', 'start'));
    spec.frames.forEach((f) => {
      const hgt = 30 + f.vars.length * RH + 8;
      layer.append(sv('rect', { x: 10, y, width: SW, height: hgt, rx: 8, class: 'fg-box fg-c4' }));
      layer.append(T(22, y + 22, f.name, 'fg-t', 'start'));
      f.vars.forEach(([k, v], i) => {
        const ry = y + 30 + i * RH;
        layer.append(sv('rect', { x: 18, y: ry, width: SW - 16, height: RH - 6, rx: 4, class: 'fg-box fg-c0' }));
        layer.append(T(28, ry + 17, k, 'fg-m', 'start'));
        if (v && v.ref) { anchors.push({ x: 10 + SW - 18, y: ry + (RH - 6) / 2, to: v.ref, hl: v.hl }); top.append(sv('circle', { cx: 10 + SW - 18, cy: ry + (RH - 6) / 2, r: 4, class: 'fg-dot' })); }
        else layer.append(T(10 + SW - 14, ry + 17, vtext(v), 'fg-m', 'end'));
      });
      y += hgt + 12;
    });
    const stackBottom = y;
    /* heap */
    const colY = spec.regions ? [72, 72] : [40, 40];
    layer.append(T(colX[0], 24, spec.heapTitle || 'Heap', 'fg-hdr', 'start'));
    (spec.statics || []).forEach((s) => {
      const w = s.w ? s.w * K : Math.max(220, tw(s.title) + 30, ...s.rows.map(([k, v]) => tw(k, 'm') + vw(v) + 50)), hgt = 30 + s.rows.length * RH + 8;
      pos['static:' + s.title] = { x: colX[0], y: colY[0], w, h: hgt };
      layer.append(sv('rect', { x: colX[0], y: colY[0], width: w, height: hgt, rx: 8, class: 'fg-box fg-c2' }));
      layer.append(T(colX[0] + 12, colY[0] + 22, s.title, 'fg-t', 'start'));
      s.rows.forEach(([k, v], i) => { const ry = colY[0] + 30 + i * RH; layer.append(T(colX[0] + 14, ry + 19, k, 'fg-m', 'start'), T(colX[0] + w - 12, ry + 19, vtext(v), 'fg-m', 'end')); });
      colY[0] += hgt + 20;
    });
    spec.objs.forEach((o) => {
      const col = o.col || 0, x = o.x !== undefined ? o.x * K : colX[col], oy = o.y !== undefined ? o.y * K : colY[col];
      let w, hgt;
      if (o.cells) {
        const cw = Math.max(o.cw ? o.cw * K : 52, ...o.cells.map((v) => vw(v) + 16));
        w = Math.max(o.cells.length * cw + 16, tw(o.title) + 24); hgt = 90;
        layer.append(sv('rect', { x, y: oy, width: w, height: hgt, rx: 8, class: 'fg-box ' + (o.garbage ? 'fg-gc' : o.c || 'fg-c1') }));
        layer.append(T(x + 12, oy + 22, o.title, 'fg-t', 'start'));
        o.cells.forEach((v, i) => {
          const cx = x + 8 + i * cw;
          layer.append(T(cx + cw / 2, oy + 45, String(i), 'fg-s'));
          layer.append(sv('rect', { x: cx, y: oy + 51, width: cw, height: 30, class: 'fg-box fg-c0' + (o.hl && o.hl.includes(i) ? ' fg-cellhl' : '') }));
          if (v && v.ref) { anchors.push({ x: cx + cw / 2, y: oy + 66, to: v.ref, down: true }); top.append(sv('circle', { cx: cx + cw / 2, cy: oy + 66, r: 4, class: 'fg-dot' })); }
          else layer.append(T(cx + cw / 2, oy + 72, vtext(v), 'fg-m'));
        });
      } else {
        const rows = o.rows || [];
        w = o.w ? o.w * K : Math.max(190, tw(o.title) + 30, ...rows.map(([k, v]) => tw(k, 'm') + vw(v) + 54));
        hgt = 30 + rows.length * RH + (rows.length ? 8 : 4);
        layer.append(sv('rect', { x, y: oy, width: w, height: hgt, rx: 8, class: 'fg-box ' + (o.garbage ? 'fg-gc' : o.c || 'fg-c1') }));
        layer.append(T(x + 12, oy + 22, o.title, 'fg-t', 'start'));
        rows.forEach(([k, v], i) => {
          const ry = oy + 30 + i * RH;
          layer.append(T(x + 14, ry + 19, k, 'fg-m', 'start'));
          if (v && v.ref) { anchors.push({ x: x + w - 16, y: ry + 14, to: v.ref }); top.append(sv('circle', { cx: x + w - 16, cy: ry + 14, r: 4, class: 'fg-dot' })); }
          else layer.append(T(x + w - 12, ry + 19, vtext(v), 'fg-m', 'end'));
        });
      }
      if (o.garbage) layer.append(T(x + w / 2, oy + hgt + 19, o.garbageText || 'unreachable → garbage', 'fg-s fg-acc-t'));
      pos[o.id] = { x, y: oy, w, h: hgt };
      if (o.y === undefined) colY[col] = oy + hgt + (o.garbage ? 36 : 20);
    });
    (spec.regions || []).forEach((r) => {
      const bs = r.ids.map((id) => pos[id]);
      const x0 = Math.min(...bs.map((b) => b.x)) - 10, y0 = Math.min(...bs.map((b) => b.y)) - 28, x1 = Math.max(...bs.map((b) => b.x + b.w), x0 + tw(r.title, 's') + 10) + 10, y1 = Math.max(...bs.map((b) => b.y + b.h)) + 10;
      layer.insertBefore(sv('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 12, class: 'fg-region' }), layer.firstChild);
      layer.append(T(x0 + 10, y0 + 19, r.title, 'fg-s fg-acc-t', 'start'));
      pos['region:' + r.title] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, region: 1 };
    });
    anchors.forEach((a) => {
      const t = pos[a.to]; if (!t) return;
      let tx = t.x, ty = t.y + 17, d;
      if (a.down) { tx = t.x; ty = t.y + t.h / 2; d = `M${a.x},${a.y} C${a.x},${ty} ${tx - 40},${ty} ${tx},${ty}`; }
      else if (tx < a.x) { tx = t.x + t.w; d = `M${a.x},${a.y} C${a.x + 40},${a.y} ${tx + 40},${ty} ${tx},${ty}`; }
      else d = `M${a.x},${a.y} C${a.x + Math.max(40, (tx - a.x) / 2)},${a.y} ${tx - Math.max(40, (tx - a.x) / 2)},${ty} ${tx},${ty}`;
      edges.append(sv('path', { d, class: 'fg-edge fg-ref' + (a.hl ? ' fg-acc' : ''), 'marker-end': marker(svg, a.hl ? 'r' : 'a') }));
    });
    const H = Math.max(stackBottom, colY[0], colY[1], ...Object.values(pos).map((p) => p.y + p.h + 34)) + 4;
    const W = Math.max(spec.w ? spec.w * K : 0, Math.max(...Object.values(pos).map((p) => p.x + p.w), SW + 20) + 16);
    svg.setAttribute('viewBox', `0 0 ${Math.ceil(W)} ${Math.ceil(H)}`); svg.style.width = Math.ceil(W) + 'px';
    return svg;
  }

  /* ---------------- boxes with nested children (JDK/JRE/JVM, nested classes, capsules) ---------------- */
  /* boxes: [{x,y,w,h,t,s,c,rx,dash,ta:'start'|'middle', ty, mid}] drawn in order; text wraps to the box width;
     ty = baseline of the first title line, mid = centre the text block vertically instead
     notes: [[x,y,text,cls,anchor]] ; arrows [[x1,y1,x2,y2,hl,dash]] */
  function boxes(spec) {
    const svg = root(spec.w * K, spec.h * K, spec.label);
    spec.boxes.forEach((b0) => {
      const b = Object.assign({}, b0, { x: b0.x * K, y: b0.y * K, w: b0.w * K, h: b0.h * K });
      svg.append(sv('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: b.rx === undefined ? 10 : b.rx * K, class: 'fg-box ' + (b.c || 'fg-c0') + (b.dash ? ' fg-dashbox' : '') }));
      const ta = b.ta || 'start', tx = ta === 'middle' ? b.x + b.w / 2 : b.x + 14, room = b.w - 28;
      const t = b.t ? wrap(b.t, room, b.m ? 'm' : 't') : '', s = b.s ? wrap(b.s, room, 's') : '';
      const tL = t ? nl(t) : 0, sL = s ? nl(s) : 0, tlh = b.m ? LH.m : LH.t;
      const first = b.mid ? b.y + b.h / 2 - (tL * tlh + sL * LH.s) / 2 + 15 : b.y + (b.ty ? b.ty * K : 26);
      if (t) svg.append(T(tx, first + (tL - 1) * tlh / 2, t, b.m ? 'fg-m' : 'fg-t', ta));
      if (s) svg.append(T(tx, first + (tL ? (tL - 1) * tlh + 21 : 0) + (sL - 1) * LH.s / 2, s, 'fg-s', ta));
    });
    (spec.arrows || []).forEach(([x1, y1, x2, y2, hl, dash]) => svg.append(sv('path', { d: `M${x1 * K},${y1 * K} L${x2 * K},${y2 * K}`, class: 'fg-edge' + (hl ? ' fg-acc' : '') + (dash ? ' fg-dash' : ''), 'marker-end': marker(svg, hl ? 'r' : 'a') })));
    (spec.notes || []).forEach(([x, y, t, cls, a]) => svg.append(T(x * K, y * K, t, cls || 'fg-s', a || 'middle')));
    return svg;
  }

  return { uml, tree, itree, graph, memfig, boxes };
})();

/* ===================== figure registry ===================== */
const R_ = (id, hl) => ({ ref: id, hl });
const FIGS = {
  /* ---------- 1. introduction ---------- */
  paradigm: () => Figs.boxes({
    w: 860, h: 350, label: 'Procedural program with shared global data versus an object-oriented program where each object bundles its own data and methods',
    boxes: [
      { x: 10, y: 10, w: 400, h: 330, t: 'Procedural (structured) program', c: 'fg-c4' },
      { x: 130, y: 60, w: 160, h: 56, t: 'Global data', s: 'balance, name, rate', c: 'fg-c2', ta: 'middle' },
      { x: 30, y: 190, w: 105, h: 44, t: 'deposit()', ta: 'middle', mid: 1 },
      { x: 158, y: 190, w: 105, h: 44, t: 'withdraw()', ta: 'middle', mid: 1 },
      { x: 286, y: 190, w: 105, h: 44, t: 'report()', ta: 'middle', mid: 1 },
      { x: 35, y: 250, w: 350, h: 68, t: 'Every function can read and change\nevery piece of data.', c: 'fg-c2', ta: 'middle', mid: 1 },
      { x: 450, y: 10, w: 400, h: 330, t: 'Object-oriented program', c: 'fg-c4' },
      { x: 470, y: 50, w: 175, h: 140, t: 'Account object', s: 'data: balance, owner', c: 'fg-c1' },
      { x: 480, y: 100, w: 155, h: 80, t: 'deposit()\nwithdraw()', s: 'methods guard the data', c: 'fg-c0', mid: 1 },
      { x: 660, y: 50, w: 175, h: 140, t: 'Customer object', s: 'data: name, phone', c: 'fg-c1' },
      { x: 670, y: 100, w: 155, h: 80, t: 'call()\nupdate()', s: 'its own behaviour', c: 'fg-c0', mid: 1 },
      { x: 565, y: 220, w: 175, h: 95, t: 'Loan object', s: 'data: amount, rate', c: 'fg-c1' },
      { x: 575, y: 268, w: 155, h: 36, t: 'monthlyPay()', c: 'fg-c0', mid: 1 }],
    arrows: [[82, 190, 170, 118], [210, 190, 210, 118], [338, 190, 252, 118], [645, 140, 658, 140, true], [650, 220, 700, 192, true]],
    notes: [[800, 240, 'objects send\nmessages', 'fg-s fg-acc-t']]
  }),
  'class-objects': () => Figs.uml({
    label: 'A Car class used as a blueprint for two Car objects', items: [
      { id: 'c', name: 'Car', fields: ['- brand : String', '- speed : int'], methods: ['+ accelerate(int) : void', '+ brake() : void'], x: 250, y: 10, hl: 1 },
      { id: 'o1', kind: 'object', name: 'car1 : Car', fields: ['brand = "Toyota"', 'speed = 60'], x: 40, y: 200 },
      { id: 'o2', kind: 'object', name: 'car2 : Car', fields: ['brand = "Tesla"', 'speed = 0'], x: 470, y: 200 }],
    links: [{ a: 'o1', b: 'c', type: 'instance', t: 'instance of' }, { a: 'o2', b: 'c', type: 'instance', t: 'instance of' }]
  }),
  'jdk-jre-jvm': () => Figs.boxes({
    w: 620, h: 250, label: 'JDK contains the JRE, which contains the JVM',
    boxes: [
      { x: 10, y: 10, w: 600, h: 230, t: 'JDK — Java Development Kit', s: 'javac compiler, javadoc, jar, debugger + everything below', c: 'fg-c2' },
      { x: 40, y: 70, w: 540, h: 155, t: 'JRE — Java Runtime Environment', s: 'class library: java.lang, java.util, java.io … + the JVM', c: 'fg-c1' },
      { x: 70, y: 130, w: 480, h: 80, t: 'JVM — Java Virtual Machine', s: 'loads .class files, verifies bytecode, interprets / JIT-compiles, manages memory (GC)', c: 'fg-c0' }]
  }),
  'jvm-pipeline': () => Figs.graph({
    w: 900, h: 250, label: 'Hello.java is compiled once by javac into Hello.class bytecode, which runs on a JVM on any operating system',
    nodes: [
      { id: 's', t: 'Hello.java', s: 'source code', x: 90, y: 125, c: 'fg-c2' },
      { id: 'b', t: 'Hello.class', s: 'bytecode', x: 380, y: 125, c: 'fg-c1' },
      { id: 'w', t: 'JVM on Windows', x: 720, y: 45 },
      { id: 'm', t: 'JVM on macOS', x: 720, y: 125 },
      { id: 'l', t: 'JVM on Linux', x: 720, y: 205 }],
    edges: [{ a: 's', b: 'b', t: 'javac Hello.java', hl: 1 }, { a: 'b', b: 'w' }, { a: 'b', b: 'm', t: 'java Hello' }, { a: 'b', b: 'l' }],
    notes: [[380, 190, 'same .class file everywhere:', 'fg-s'], [380, 206, '“write once, run anywhere”', 'fg-s fg-acc-t']]
  }),
  widening: () => Figs.graph({
    w: 900, h: 170, label: 'Widening conversions: byte to short to int to long to float to double, and char to int',
    nodes: [
      { id: 'b', t: 'byte', s: '8-bit', x: 60, y: 50 }, { id: 's', t: 'short', s: '16-bit', x: 200, y: 50 }, { id: 'i', t: 'int', s: '32-bit', x: 340, y: 50, c: 'fg-c1' },
      { id: 'l', t: 'long', s: '64-bit', x: 480, y: 50 }, { id: 'f', t: 'float', s: '32-bit', x: 620, y: 50 }, { id: 'd', t: 'double', s: '64-bit', x: 760, y: 50, c: 'fg-c1' },
      { id: 'c', t: 'char', s: '16-bit unsigned', x: 340, y: 135, c: 'fg-c2' }],
    edges: [{ a: 'b', b: 's' }, { a: 's', b: 'i' }, { a: 'i', b: 'l' }, { a: 'l', b: 'f' }, { a: 'f', b: 'd' }, { a: 'c', b: 'i', from: 'top', to: 'bottom' }],
    notes: [[560, 120, 'left → right: automatic (widening)', 'fg-s', 'start'], [560, 140, 'right → left: needs a cast (narrowing)', 'fg-s fg-acc-t', 'start']]
  }),

  /* ---------- 2. control flow ---------- */
  'if-flow': () => Figs.graph({
    w: 560, h: 390, label: 'Flowchart of an if-else statement',
    nodes: [
      { id: 'st', t: 'read marks', x: 280, y: 30, shape: 'round' },
      { id: 'q', t: 'marks >= 40 ?', x: 280, y: 120, shape: 'diamond', w: 170 },
      { id: 'y', t: 'print "Pass"', x: 110, y: 220, c: 'fg-c1', m: 1 },
      { id: 'n', t: 'print "Fail"', x: 450, y: 220, c: 'fg-c2', m: 1 },
      { id: 'e', t: 'next statement', x: 280, y: 330, shape: 'round' }],
    edges: [{ a: 'st', b: 'q' }, { a: 'q', b: 'y', from: 'left', to: 'top', elbow: 'hv', t: 'true' }, { a: 'q', b: 'n', from: 'right', to: 'top', elbow: 'hv', t: 'false' },
      { a: 'y', b: 'e', from: 'bottom', to: 'left', elbow: 'vh' }, { a: 'n', b: 'e', from: 'bottom', to: 'right', elbow: 'vh' }]
  }),
  'loop-flow': () => Figs.graph({
    w: 820, h: 400, label: 'while checks the condition before the body; do-while runs the body first and checks after',
    nodes: [
      { id: 'w0', t: 'while (condition)', x: 200, y: 30, shape: 'round', m: 1 },
      { id: 'wq', t: 'condition?', x: 200, y: 125, shape: 'diamond' },
      { id: 'wb', t: 'body', x: 200, y: 235, c: 'fg-c1' },
      { id: 'we', t: 'after loop', x: 390, y: 125, shape: 'round' },
      { id: 'd0', t: 'do { … } while (cond);', x: 610, y: 30, shape: 'round', m: 1 },
      { id: 'db', t: 'body', x: 610, y: 125, c: 'fg-c1' },
      { id: 'dq', t: 'condition?', x: 610, y: 240, shape: 'diamond' },
      { id: 'de', t: 'after loop', x: 610, y: 360, shape: 'round' }],
    edges: [{ a: 'w0', b: 'wq' }, { a: 'wq', b: 'wb', t: 'true' }, { a: 'wq', b: 'we', t: 'false' }, { a: 'wb', b: 'wq', from: 'left', to: 'left', via: [[90, 235], [90, 125]], t: 'repeat' },
      { a: 'd0', b: 'db' }, { a: 'db', b: 'dq' }, { a: 'dq', b: 'db', from: 'right', to: 'right', via: [[750, 240], [750, 125]], t: 'true' }, { a: 'dq', b: 'de', t: 'false' }],
    notes: [[200, 300, 'body may run 0 times', 'fg-s fg-acc-t'], [470, 300, 'body runs at least once', 'fg-s fg-acc-t']]
  }),

  /* ---------- 3. arrays ---------- */
  'array-mem': () => Figs.memfig({
    label: 'The variable marks on the stack refers to an int array object on the heap', frames: [{ name: 'main', vars: [['marks', R_('a')], ['n', 5]] }],
    objs: [{ id: 'a', title: 'int[5]', cells: [78, 91, 64, 85, 70] }]
  }),
  'array-alias': () => Figs.memfig({
    label: 'a and b refer to the same array; c refers to a separate copy', frames: [{ name: 'main', vars: [['a', R_('x')], ['b', R_('x', 1)], ['c', R_('y')]] }],
    objs: [{ id: 'x', title: 'int[3]  (shared by a and b)', cells: [99, 2, 3], hl: [0] }, { id: 'y', title: 'int[3]  (the clone)', cells: [1, 2, 3] }]
  }),
  'array-2d': () => Figs.memfig({
    label: 'A 2D array is an array of references to row arrays', frames: [{ name: 'main', vars: [['m', R_('o')]] }], colGap: 230,
    objs: [{ id: 'o', title: 'int[3][] (rows)', cells: [R_('r0'), R_('r1'), R_('r2')] },
      { id: 'r0', title: 'm[0]', cells: [1, 2, 3], col: 1, cw: 36 }, { id: 'r1', title: 'm[1]', cells: [4, 5, 6], col: 1, cw: 36 }, { id: 'r2', title: 'm[2]', cells: [7, 8, 9], col: 1, cw: 36 }]
  }),
  'array-jagged': () => Figs.memfig({
    label: 'A jagged array whose rows have different lengths', frames: [{ name: 'main', vars: [['t', R_('o')]] }], colGap: 230,
    objs: [{ id: 'o', title: 'int[4][]', cells: [R_('r0'), R_('r1'), R_('r2'), R_('r3')] },
      { id: 'r0', title: 't[0]', cells: [1], col: 1, cw: 36 }, { id: 'r1', title: 't[1]', cells: [1, 1], col: 1, cw: 36 }, { id: 'r2', title: 't[2]', cells: [1, 2, 1], col: 1, cw: 36 }, { id: 'r3', title: 't[3]', cells: [1, 3, 3, 1], col: 1, cw: 36 }]
  }),

  /* ---------- 4. classes and objects ---------- */
  'uml-student': () => Figs.uml({
    label: 'UML class diagram of Student', items: [{
      id: 's', name: 'Student', x: 10, y: 10, hl: 1,
      fields: ['- name : String', '- id : int', '- cgpa : double'],
      methods: ['+ Student(name : String, id : int)', '+ getName() : String', '+ setCgpa(cgpa : double) : void', '+ toString() : String']
    }]
  }),
  'obj-refs': () => Figs.memfig({
    label: 's1 and s3 refer to the same Student object, s2 to another', frames: [{ name: 'main', vars: [['s1', R_('a')], ['s2', R_('b')], ['s3', R_('a', 1)]] }],
    objs: [{ id: 'a', title: 'Student', rows: [['name', 'Ann'], ['id', 101], ['cgpa', { raw: '3.75' }]] }, { id: 'b', title: 'Student', rows: [['name', 'Bob'], ['id', 102], ['cgpa', { raw: '3.2' }]] }]
  }),
  capsule: () => Figs.boxes({
    w: 700, h: 310, label: 'Encapsulation: private fields are only reachable through the public methods of the object',
    boxes: [
      { x: 160, y: 20, w: 380, h: 240, rx: 120, t: 'BankAccount object', c: 'fg-c1', ta: 'middle', ty: 30 },
      { x: 250, y: 105, w: 200, h: 70, t: 'private double balance', s: 'hidden inside the capsule', c: 'fg-c3', ta: 'middle', m: 1, mid: 1 },
      { x: 20, y: 60, w: 150, h: 36, t: '+ deposit(amt)', c: 'fg-c2', ta: 'middle', m: 1, mid: 1 },
      { x: 20, y: 184, w: 150, h: 36, t: '+ withdraw(amt)', c: 'fg-c2', ta: 'middle', m: 1, mid: 1 },
      { x: 530, y: 122, w: 160, h: 36, t: '+ getBalance()', c: 'fg-c2', ta: 'middle', m: 1, mid: 1 }],
    arrows: [[170, 80, 250, 125, true], [170, 202, 250, 158, true], [450, 140, 528, 140, true]],
    notes: [[350, 290, 'outside code: account.balance = -500;  ✗ compile error', 'fg-s fg-acc-t']]
  }),
  'gc-fig': () => Figs.memfig({
    label: 'After s2 = null, the second Student has no references and becomes garbage', frames: [{ name: 'main', vars: [['s1', R_('a')], ['s2', null]] }],
    objs: [{ id: 'a', title: 'Student', rows: [['name', 'Ann']] }, { id: 'b', title: 'Student', rows: [['name', 'Bob']], garbage: 1 }]
  }),

  /* ---------- 5. methods ---------- */
  'pass-ref': () => Figs.memfig({
    label: 'The parameter q receives a copy of the reference, so it points at the same Point object; n receives a copy of the int',
    frames: [{ name: 'move(Point q, int n)', vars: [['q', R_('p', 1)], ['n', 5]] }, { name: 'main', vars: [['p', R_('p')], ['k', 5]] }],
    objs: [{ id: 'p', title: 'Point', rows: [['x', 5], ['y', 0]] }]
  }),
  'fib-tree': () => Figs.tree({
    label: 'Call tree of fib(4)', minW: 70, gapX: 10, gapY: 30, nodeH: 34, root: {
      t: 'fib(4) = 3', m: 1, c: 'fg-c1', k: [
        { t: 'fib(3) = 2', m: 1, k: [{ t: 'fib(2) = 1', m: 1, k: [{ t: 'fib(1)=1', m: 1, c: 'fg-c2' }, { t: 'fib(0)=0', m: 1, c: 'fg-c2' }] }, { t: 'fib(1)=1', m: 1, c: 'fg-c2' }] },
        { t: 'fib(2) = 1', m: 1, k: [{ t: 'fib(1)=1', m: 1, c: 'fg-c2' }, { t: 'fib(0)=0', m: 1, c: 'fg-c2' }] }]
    }
  }),

  /* ---------- 6. access, static, final ---------- */
  'static-mem': () => Figs.memfig({
    label: 'One static count shared by the class, one id per object',
    frames: [{ name: 'main', vars: [['a', R_('a')], ['b', R_('b')], ['c', R_('c')]] }],
    statics: [{ title: 'Counter.class (static)', rows: [['count', 3]] }],
    objs: [{ id: 'a', title: 'Counter', rows: [['id', 1]] }, { id: 'b', title: 'Counter', rows: [['id', 2]] }, { id: 'c', title: 'Counter', rows: [['id', 3]] }]
  }),
  'nested-classes': () => Figs.boxes({
    w: 760, h: 300, label: 'The four kinds of nested class inside an Outer class',
    boxes: [
      { x: 10, y: 10, w: 740, h: 280, t: 'class Outer', s: 'private int x;  static int y;', c: 'fg-c4' },
      { x: 30, y: 70, w: 220, h: 90, t: 'static class Nested', s: 'no Outer object needed; sees y', c: 'fg-c1', m: 1 },
      { x: 270, y: 70, w: 220, h: 90, t: 'class Inner', s: 'tied to an Outer object; sees x, y', c: 'fg-c2', m: 1 },
      { x: 510, y: 70, w: 220, h: 200, t: 'void method() {', s: '…', c: 'fg-c0', m: 1 },
      { x: 525, y: 130, w: 190, h: 56, t: 'class Local', s: 'lives inside the method', c: 'fg-c1', m: 1 },
      { x: 525, y: 200, w: 190, h: 56, t: 'new Runnable() {…}', s: 'anonymous, used once', c: 'fg-c2', m: 1 }],
    notes: [[140, 200, 'Outer.Nested n = new Outer.Nested();', 'fg-s'], [380, 200, 'Outer.Inner i = outer.new Inner();', 'fg-s']]
  }),

  /* ---------- 7. inheritance ---------- */
  'uml-inherit': () => Figs.uml({
    label: 'Person is the superclass of Student and Teacher', items: [
      { id: 'p', name: 'Person', fields: ['# name : String', '# age : int'], methods: ['+ Person(name, age)', '+ introduce() : String'], x: 230, y: 10, hl: 1 },
      { id: 's', name: 'Student', fields: ['- id : int', '- cgpa : double'], methods: ['+ study() : void', '+ introduce() : String'], x: 40, y: 210 },
      { id: 't', name: 'Teacher', fields: ['- dept : String', '- salary : double'], methods: ['+ teach() : void', '+ introduce() : String'], x: 420, y: 210 }],
    links: [{ a: 's', b: 'p', type: 'extends' }, { a: 't', b: 'p', type: 'extends' }]
  }),
  'inherit-types': () => Figs.graph({
    w: 900, h: 290, label: 'Single, multilevel, hierarchical and multiple inheritance',
    nodes: [
      { id: 'a1', t: 'A', x: 80, y: 50 }, { id: 'b1', t: 'B', x: 80, y: 150 },
      { id: 'a2', t: 'A', x: 280, y: 40 }, { id: 'b2', t: 'B', x: 280, y: 130 }, { id: 'c2', t: 'C', x: 280, y: 220 },
      { id: 'a3', t: 'A', x: 510, y: 50 }, { id: 'b3', t: 'B', x: 440, y: 150 }, { id: 'c3', t: 'C', x: 580, y: 150 },
      { id: 'a4', t: 'A', x: 720, y: 50, c: 'fg-c2' }, { id: 'b4', t: 'B', x: 840, y: 50, c: 'fg-c2' }, { id: 'c4', t: 'C', x: 780, y: 150, c: 'fg-c3' }],
    edges: [{ a: 'b1', b: 'a1', tri: 1 }, { a: 'b2', b: 'a2', tri: 1 }, { a: 'c2', b: 'b2', tri: 1 }, { a: 'b3', b: 'a3', tri: 1 }, { a: 'c3', b: 'a3', tri: 1 }, { a: 'c4', b: 'a4', tri: 1, dash: 1 }, { a: 'c4', b: 'b4', tri: 1, dash: 1 }],
    notes: [[80, 225, 'single', 'fg-t'], [280, 280, 'multilevel', 'fg-t'], [510, 225, 'hierarchical', 'fg-t'], [780, 225, 'multiple', 'fg-t'], [780, 245, 'not allowed for classes;', 'fg-s fg-acc-t'], [780, 262, 'allowed with interfaces', 'fg-s fg-acc-t']]
  }),
  'uml-multilevel': () => Figs.uml({
    label: 'Vehicle, Car, ElectricCar multilevel hierarchy', items: [
      { id: 'v', name: 'Vehicle', fields: ['# wheels : int'], methods: ['+ Vehicle()', '+ move() : void'], x: 10, y: 10, w: 160 },
      { id: 'c', name: 'Car', fields: ['# seats : int'], methods: ['+ Car()', '+ honk() : void'], x: 10, y: 170, w: 160 },
      { id: 'e', name: 'ElectricCar', fields: ['- battery : int'], methods: ['+ ElectricCar()', '+ charge() : void'], x: 10, y: 330, w: 160, hl: 1 }],
    links: [{ a: 'c', b: 'v', type: 'extends' }, { a: 'e', b: 'c', type: 'extends' }]
  }),
  'object-tree': () => Figs.tree({
    label: 'Every class ultimately extends java.lang.Object', minW: 96, root: {
      t: 'Object', s: 'java.lang', c: 'fg-c1', k: [
        { t: 'String', s: 'final' }, { t: 'Number', s: 'abstract', k: [{ t: 'Integer' }, { t: 'Double' }] }, { t: 'Person', s: 'your class', c: 'fg-c2', k: [{ t: 'Student', c: 'fg-c2' }, { t: 'Teacher', c: 'fg-c2' }] }]
    }
  }),

  /* ---------- 8. polymorphism ---------- */
  'uml-animals': () => Figs.uml({
    label: 'Animal superclass with Dog and Cat subclasses', items: [
      { id: 'a', name: 'Animal', methods: ['+ eat() : void', '+ sound() : String'], x: 230, y: 10 },
      { id: 'd', name: 'Dog', methods: ['+ sound() : String', '+ fetch() : void'], x: 60, y: 190 },
      { id: 'c', name: 'Cat', methods: ['+ sound() : String', '+ climb() : void'], x: 400, y: 190 }],
    links: [{ a: 'd', b: 'a', type: 'extends' }, { a: 'c', b: 'a', type: 'extends' }]
  }),
  'uml-abstract': () => Figs.uml({
    label: 'Abstract class Shape with three concrete subclasses', items: [
      { id: 's', kind: 'abstract', name: 'Shape', fields: ['# name : String'], methods: ['+ area() : double  {abstract}', '+ describe() : String'], x: 250, y: 10, hl: 1 },
      { id: 'c', name: 'Circle', fields: ['- r : double'], methods: ['+ area() : double'], x: 20, y: 220 },
      { id: 'r', name: 'Rectangle', fields: ['- w, h : double'], methods: ['+ area() : double'], x: 270, y: 220 },
      { id: 't', name: 'Triangle', fields: ['- b, h : double'], methods: ['+ area() : double'], x: 520, y: 220 }],
    links: [{ a: 'c', b: 's', type: 'extends' }, { a: 'r', b: 's', type: 'extends' }, { a: 't', b: 's', type: 'extends' }]
  }),

  /* ---------- 9. packages and interfaces ---------- */
  'pkg-tree': () => Figs.itree({
    label: 'Package folders mirror the package names', mono: 1, rows: [
      [0, 'src/', 'fg-c4'], [1, 'bd/edu/green/cse/', 'fg-c4', 'package bd.edu.green.cse'],
      [2, 'model/', 'fg-c1', 'package bd.edu.green.cse.model'], [3, 'Student.java', 'fg-c0', 'public class Student'], [3, 'Course.java', 'fg-c0'],
      [2, 'util/', 'fg-c1', 'package bd.edu.green.cse.util'], [3, 'GradeUtil.java', 'fg-c0'],
      [2, 'app/', 'fg-c1', 'package bd.edu.green.cse.app'], [3, 'Main.java', 'fg-c2', 'import bd.edu.green.cse.model.Student;']]
  }),
  'uml-iface': () => Figs.uml({
    label: 'Employee and Invoice both implement the Payable interface', items: [
      { id: 'p', kind: 'interface', name: 'Payable', methods: ['+ getPayment() : double'], x: 240, y: 10, hl: 1 },
      { id: 'e', name: 'Employee', fields: ['- salary : double'], methods: ['+ getPayment() : double'], x: 60, y: 180 },
      { id: 'i', name: 'Invoice', fields: ['- qty : int', '- price : double'], methods: ['+ getPayment() : double'], x: 420, y: 180 }],
    links: [{ a: 'e', b: 'p', type: 'implements' }, { a: 'i', b: 'p', type: 'implements' }]
  }),
  'iface-multi': () => Figs.uml({
    label: 'Duck extends Bird and implements Flyable and Swimmable', items: [
      { id: 'b', name: 'Bird', methods: ['+ layEggs() : void'], x: 10, y: 10 },
      { id: 'f', kind: 'interface', name: 'Flyable', methods: ['+ fly() : void'], x: 230, y: 10, w: 150 },
      { id: 's', kind: 'interface', name: 'Swimmable', methods: ['+ swim() : void'], x: 450, y: 10 },
      { id: 'd', name: 'Duck', methods: ['+ fly() : void', '+ swim() : void'], x: 230, y: 190, w: 150, hl: 1 }],
    links: [{ a: 'd', b: 'b', type: 'extends', dx: -45, midY: 150 }, { a: 'd', b: 'f', type: 'implements' }, { a: 'd', b: 's', type: 'implements', dx: 45, midY: 150 }]
  }),

  /* ---------- 10. exceptions ---------- */
  'ex-tree': () => Figs.itree({
    label: 'The Throwable class hierarchy', rows: [
      [0, 'Throwable', 'fg-c4'],
      [1, 'Error', 'fg-c3', 'serious JVM problems — do not catch'], [2, 'OutOfMemoryError', 'fg-c3'], [2, 'StackOverflowError', 'fg-c3'],
      [1, 'Exception', 'fg-c2', 'checked: must be caught or declared'], [2, 'IOException', 'fg-c2'], [3, 'FileNotFoundException', 'fg-c2'], [2, 'SQLException', 'fg-c2'], [2, 'InterruptedException', 'fg-c2'],
      [2, 'RuntimeException', 'fg-c1', 'unchecked: bugs in the program'], [3, 'ArithmeticException', 'fg-c1', 'divide by zero'], [3, 'NullPointerException', 'fg-c1'], [3, 'ArrayIndexOutOfBoundsException', 'fg-c1'],
      [3, 'IllegalArgumentException', 'fg-c1'], [4, 'NumberFormatException', 'fg-c1', 'Integer.parseInt("abc")'], [3, 'ClassCastException', 'fg-c1']]
  }),
  'ex-flow': () => Figs.graph({
    w: 760, h: 330, label: 'Control flow through try, catch and finally',
    nodes: [
      { id: 't', t: 'try { … }', x: 380, y: 35, c: 'fg-c1', m: 1 },
      { id: 'q', t: 'exception thrown?', x: 380, y: 125, shape: 'diamond', w: 190 },
      { id: 'c', t: 'matching catch { … }', x: 150, y: 215, c: 'fg-c2', m: 1 },
      { id: 'f', t: 'finally { … }', x: 380, y: 300, c: 'fg-c4', m: 1 },
      { id: 'u', t: 'no match: propagate to caller', x: 640, y: 215, c: 'fg-c3' }],
    edges: [{ a: 't', b: 'q' }, { a: 'q', b: 'c', from: 'left', to: 'top', elbow: 'hv', t: 'yes, caught' }, { a: 'q', b: 'f', t: 'no' }, { a: 'q', b: 'u', from: 'right', to: 'top', elbow: 'hv', t: 'yes, uncaught' },
      { a: 'c', b: 'f', from: 'bottom', to: 'left', elbow: 'vh' }, { a: 'u', b: 'f', from: 'bottom', to: 'right', elbow: 'vh', dash: 1, t: 'finally still runs first' }]
  }),

  /* ---------- 11. threads ---------- */
  'threads-mem': () => Figs.boxes({
    w: 760, h: 255, label: 'Threads in one process share the heap but each has its own stack and program counter',
    boxes: [
      { x: 10, y: 10, w: 740, h: 235, t: 'Process: one running Java program (one JVM)', c: 'fg-c4' },
      { x: 30, y: 50, w: 700, h: 60, t: 'Shared heap', s: 'all objects: Account, Counter, buffers … visible to every thread', c: 'fg-c2' },
      { x: 30, y: 130, w: 215, h: 100, t: 'main thread', c: 'fg-c1' },
      { x: 272, y: 130, w: 215, h: 100, t: 'Thread-0', c: 'fg-c1' },
      { x: 515, y: 130, w: 215, h: 100, t: 'Thread-1', c: 'fg-c1' }],
    notes: [[137, 185, 'stack: main()\n+ PC', 'fg-m'], [379, 185, 'stack: run()\n+ PC', 'fg-m'], [622, 185, 'stack: run()\n+ PC', 'fg-m']]
  }),
  'thread-states': () => Figs.graph({
    w: 760, h: 420, label: 'Thread life cycle: New, Runnable, Running, Blocked and Dead, with the method calls that move a thread between them',
    nodes: [
      { id: 'n', t: 'New', s: 'new Thread(…)', x: 300, y: 40, c: 'fg-c4', w: 130 },
      { id: 'r', t: 'Runnable', s: 'ready, waiting for CPU', x: 300, y: 145, shape: 'circle', c: 'fg-c1', w: 190, h: 56 },
      { id: 'u', t: 'Running', s: 'executing run()', x: 300, y: 265, shape: 'circle', c: 'fg-c1', w: 190, h: 56, hl: 1 },
      { id: 'b', t: 'Blocked', s: 'idle, not runnable', x: 300, y: 380, c: 'fg-c2', w: 180 },
      { id: 'd', t: 'Dead', s: 'killed or finished', x: 640, y: 210, c: 'fg-c3', w: 160, h: 80 }],
    edges: [
      { a: 'n', b: 'r', t: 'start()', hl: 1 },
      { a: 'r', b: 'u', p1: [275, 172], p2: [275, 238], t: 'run()', hl: 1, dx: -32 },
      { a: 'u', b: 'r', p1: [325, 238], p2: [325, 172], t: 'yield()', dx: 38 },
      { a: 'u', b: 'b', t: 'sleep() · wait() · suspend()' },
      { a: 'b', b: 'r', from: 'left', to: 'left', via: [[130, 380], [130, 262], [130, 145]], t: 'resume()\nnotify()' },
      { a: 'n', b: 'd', from: 'right', to: 'top', t: 'stop()' },
      { a: 'r', b: 'd', from: 'right', p2: [560, 190], t: 'stop()' },
      { a: 'u', b: 'd', from: 'right', p2: [560, 230], t: 'end of execution' },
      { a: 'b', b: 'd', from: 'right', to: 'bottom', t: 'stop()' }]
  }),
  deadlock: () => Figs.graph({
    w: 620, h: 250, label: 'Deadlock: each thread holds one lock and waits for the other',
    nodes: [{ id: 't1', t: 'Thread 1', x: 110, y: 60, c: 'fg-c1' }, { id: 't2', t: 'Thread 2', x: 510, y: 60, c: 'fg-c1' },
      { id: 'a', t: 'lock A', x: 110, y: 200, shape: 'circle', c: 'fg-c2', w: 110, h: 50 }, { id: 'b', t: 'lock B', x: 510, y: 200, shape: 'circle', c: 'fg-c2', w: 110, h: 50 }],
    edges: [{ a: 'a', b: 't1', t: 'held by' }, { a: 'b', b: 't2', t: 'held by' }, { a: 't1', b: 'b', t: 'waits for', hl: 1, dx: -90, dy: -30 }, { a: 't2', b: 'a', t: 'waits for', hl: 1, dx: 90, dy: -30 }]
  }),

  /* ---------- 12. strings ---------- */
  'string-pool': () => Figs.memfig({
    label: 'Literals share one object in the string pool; new String creates a separate heap object',
    frames: [{ name: 'main', vars: [['a', R_('p')], ['b', R_('p', 1)], ['c', R_('h')]] }],
    objs: [{ id: 'p', title: 'String "Hi"', rows: [['value', 'Hi']], c: 'fg-c2' }, { id: 'h', title: 'String "Hi"', rows: [['value', 'Hi']] }],
    regions: [{ title: 'string pool (inside the heap)', ids: ['p'] }]
  }),

  /* ---------- 13. GUI and JDBC ---------- */
  'fx-tree': () => Figs.tree({
    label: 'A JavaFX scene graph', minW: 92, gapX: 10, gapY: 36, root: {
      t: 'Stage', s: 'the window', c: 'fg-c4', k: [{
        t: 'Scene', s: 'content of the window', c: 'fg-c2', k: [{
          t: 'BorderPane', s: 'root node', c: 'fg-c1', k: [
            { t: 'Label', s: 'top' }, { t: 'GridPane', s: 'center', c: 'fg-c1', k: [{ t: 'TextField' }, { t: 'TextField' }] },
            { t: 'HBox', s: 'bottom', c: 'fg-c1', k: [{ t: 'Button', s: 'Save' }, { t: 'Button', s: 'Clear' }] }]
        }]
      }]
    }
  }),
  'jdbc-flow': () => Figs.graph({
    w: 900, h: 250, label: 'The steps of a JDBC query',
    nodes: [
      { id: 'a', t: 'Java program', x: 70, y: 60, c: 'fg-c4' },
      { id: 'c', t: 'Connection', s: 'DriverManager.getConnection(url)', x: 340, y: 60, c: 'fg-c1' },
      { id: 'p', t: 'PreparedStatement', s: 'con.prepareStatement(sql)', x: 650, y: 60, c: 'fg-c1' },
      { id: 'r', t: 'ResultSet', s: 'ps.executeQuery()', x: 650, y: 200, c: 'fg-c2' },
      { id: 'l', t: 'while (rs.next()) { … }', x: 340, y: 200, c: 'fg-c0', m: 1 },
      { id: 'd', t: 'Database', s: 'MySQL / SQLite', x: 835, y: 130, shape: 'db', w: 110, h: 80, c: 'fg-c2' },
      { id: 'x', t: 'close()', s: 'try-with-resources', x: 70, y: 200, c: 'fg-c3' }],
    edges: [{ a: 'a', b: 'c', t: '1 connect' }, { a: 'c', b: 'p', t: '2 prepare' }, { a: 'p', b: 'r', t: '3 execute' }, { a: 'r', b: 'l', t: '4 read rows' }, { a: 'l', b: 'x', t: '5 close' },
      { a: 'p', b: 'd', dash: 1, from: 'right', to: 'top', elbow: 'hv' }, { a: 'd', b: 'r', dash: 1, from: 'bottom', to: 'right', elbow: 'vh' }]
  }),
  'event-flow': () => Figs.graph({
    w: 900, h: 140, label: 'Event handling: a click becomes an ActionEvent delivered to the registered handler',
    nodes: [{ id: 'u', t: 'user clicks', s: 'the Save button', x: 90, y: 70, shape: 'round', c: 'fg-c4' },
      { id: 'e', t: 'ActionEvent', s: 'source = saveBtn', x: 330, y: 70, c: 'fg-c2' },
      { id: 'h', t: 'handler runs', s: 'e -> save()', x: 570, y: 70, c: 'fg-c1' },
      { id: 'g', t: 'UI updates', s: 'label.setText(…)', x: 800, y: 70, shape: 'round', c: 'fg-c4' }],
    edges: [{ a: 'u', b: 'e' }, { a: 'e', b: 'h', t: 'setOnAction', hl: 1 }, { a: 'h', b: 'g' }]
  })
};
