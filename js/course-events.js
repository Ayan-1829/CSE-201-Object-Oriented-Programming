/* ===================== course-events.js : learning events for the course-analytics Sheet =====================
   Shared by every course site (CSE-201, CSE-203, CSE-308): copy this exact file, unchanged.
   Load it right after js/analytics.js. It only uses window.trackEvent, which analytics.js
   defines -- when tracking is off (Do Not Track / Global Privacy Control) nothing is sent.

   What it adds to the page views analytics.js already records:
     - the browser tab title shows the current slide ("Slide title · Topic title"), so the
       Sheet can name every slide (analytics.js reads the title just after each slide change)
     - quiz_complete    detail "4/5"                  the quiz on a topic was finished
     - demo_use         detail = the tool's title      first interaction with an interactive tool
     - answer_reveal    detail = the question          a worked example / practice answer was opened
     - checklist_tick   detail = the checklist item    a lab-report checklist item was ticked
     - template_download / template_copy               the LaTeX report template (CSE 308)
     - present_mode                                    full screen was switched on (teaching in class)
     - pen_use                                         the drawing pen was opened on a slide
   Every event also carries the page and slide it happened on (analytics.js adds that). */
(function () {
  const send = (name, detail) => { try { if (typeof window.trackEvent === 'function') window.trackEvent(name, detail); } catch (_) {} };
  const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n || 120);

  /* ---- slide titles in the tab title ---- */
  const base = document.title;
  const activeSlide = () => document.querySelector('.slide.active');
  function retitle() {
    const s = activeSlide();
    if (!s) return;
    const all = Array.prototype.indexOf.call(document.querySelectorAll('.slide'), s);
    document.title = all <= 0 ? base : clean(s.getAttribute('data-title'), 90) + ' · ' + base;
  }
  if (document.querySelector('.deck')) {
    ['pushState', 'replaceState'].forEach((m) => {
      const orig = history[m];
      history[m] = function () { const r = orig.apply(this, arguments); retitle(); return r; };
    });
    addEventListener('hashchange', retitle);
    retitle();
  }
  const slideName = (el) => { const s = el && el.closest ? el.closest('.slide') : null; return s ? clean(s.getAttribute('data-title'), 80) : ''; };

  /* ---- quizzes: the score panel appears when the last question is answered ---- */
  new MutationObserver((list) => {
    list.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const sc = n.classList && n.classList.contains('score') ? n : n.querySelector && n.querySelector('.score');
      if (!sc || !sc.closest('.quiz')) return;
      const m2 = /(\d+)\s*\/\s*(\d+)/.exec(sc.textContent || '');
      if (m2) send('quiz_complete', m2[1] + '/' + m2[2]);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  /* ---- interactive tools: counted once per tool per page load ---- */
  const TOOL = '[data-demo], [data-trace], [data-circuit], [data-reallife], .demo, .trace';
  const used = new WeakSet();
  function toolUse(e) {
    const t = e.target && e.target.closest ? e.target.closest(TOOL) : null;
    if (!t) return;
    const root = t.closest('[data-demo], [data-trace], [data-circuit], [data-reallife]') || t;
    if (used.has(root)) return;
    used.add(root);
    const h = root.querySelector('h3, .trace-title');
    const name = (h && h.textContent) || root.getAttribute('data-circuit') || root.getAttribute('data-demo') || root.getAttribute('data-trace') || slideName(root) || 'tool';
    send('demo_use', clean(name, 100));
  }
  ['pointerdown', 'keydown', 'input'].forEach((t) => document.addEventListener(t, toolUse, { capture: true, passive: true }));

  /* ---- answers revealed (worked examples, practice) ---- */
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open || !d.classList.contains('reveal')) return;
    const box = d.closest('.ex');
    const q = box && box.querySelector('.qq');
    send('answer_reveal', clean((slideName(d) ? slideName(d) + ': ' : '') + (q ? q.textContent : ''), 180));
  }, true);

  /* ---- lab-report checklists and the report template ---- */
  document.addEventListener('change', (e) => {
    const c = e.target;
    if (!c || c.type !== 'checkbox' || !c.checked || !c.closest('.chk-list')) return;
    const lab = c.id && document.querySelector('label[for="' + c.id + '"]');
    const proj = c.closest('.proj');
    const h = proj && proj.querySelector('h2');
    send('checklist_tick', clean((h ? h.textContent + ': ' : '') + (lab ? lab.textContent : ''), 180));
  }, true);
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('#tpl-dl, .copy-btn, #btn-fs, .anno-toggle') : null;
    if (!t) return;
    if (t.id === 'tpl-dl') send('template_download');
    else if (t.classList.contains('copy-btn')) send('template_copy');
    else if (t.id === 'btn-fs') { if (t.getAttribute('aria-pressed') !== 'true') send('present_mode', slideName(activeSlide())); }
    else if (t.getAttribute('aria-pressed') !== 'true') send('pen_use', slideName(activeSlide()));
  }, true);
})();
