/* ===================== progress.js : reading progress on the home page (shared by every GUB course site) =====================
   Installed by GUB/_tools/help/help.py next to help.js.

   On a slide deck it records, in this browser only, the furthest slide reached and the best quiz score.
   On a home page it writes "Read 12 / 27 · Quiz best 4 / 5" (or "Read ✓") under each topic card.

   Every course site lives on the same address (ayan-1829.github.io), so they all share one localStorage, and
   two of them even share a storage name for their own settings. Progress is therefore kept under one key,
   "course-progress-v1", per page address (/CSE-203-Digital-Logic-Design/topics/04-....html), which is
   unique across the sites. A quiz best score the deck's own Store already holds is copied in on the first
   visit, so scores from before this file existed are not lost. Nothing is sent anywhere. */
(function () {
  const KEY = 'course-progress-v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const write = (all) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (_) { /* storage off */ } };
  const pathOf = (href) => { try { return decodeURI(new URL(href, location.href).pathname); } catch (_) { return ''; } };
  const here = pathOf(location.href);

  function update(fn) {
    const all = read(), rec = all[here] || {};
    if (fn(rec) !== false) { all[here] = rec; write(all); }
  }

  /* ---------- on a slide deck ---------- */
  const slides = document.querySelectorAll('.deck .slide, .slide');
  if (slides.length > 1) {
    const total = slides.length;
    const note = () => {
      const s = document.querySelector('.slide.active');
      if (!s) return;
      const n = Array.prototype.indexOf.call(slides, s) + 1;
      update((r) => {
        if (r.total === total && (r.max || 0) >= n) return false;
        r.max = Math.max(n, Math.min(r.max || 0, total)); r.total = total;
      });
    };
    note();
    new MutationObserver(note).observe(document.querySelector('.deck') || document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    addEventListener('hashchange', note);

    /* the best quiz score: copied from the deck's own Store, and caught when a quiz is finished */
    const qk = document.querySelector('[data-quiz-key]');
    const fromStore = () => {
      try {
        // eslint-disable-next-line no-undef
        const q = qk && typeof Store !== 'undefined' && Store.sub('quiz', qk.getAttribute('data-quiz-key'));
        if (q && q.total) update((r) => { if (r.quiz && r.quiz.best >= q.best && r.quiz.total === q.total) return false; r.quiz = { best: q.best, total: q.total }; });
      } catch (_) { /* no Store on this page */ }
    };
    fromStore();
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        const sc = n.matches && n.matches('.quiz .score') ? n : n.querySelector && n.querySelector('.score');
        if (!sc || !sc.closest('.quiz')) continue;
        const m2 = /(\d+)\s*\/\s*(\d+)/.exec(sc.textContent || '');
        if (m2) update((r) => {
          const best = +m2[1], tot = +m2[2];
          if (r.quiz && r.quiz.total === tot && r.quiz.best >= best) return false;
          r.quiz = { best: Math.max(best, r.quiz && r.quiz.total === tot ? r.quiz.best : 0), total: tot };
        });
        fromStore();
      }
    }).observe(document.body, { childList: true, subtree: true });
    return;
  }

  /* ---------- on a home page: one line under each topic card ---------- */
  const cards = document.querySelectorAll('.tlist li > a[href]');
  if (!cards.length) return;
  const all = read();
  cards.forEach((a) => {
    const rec = all[pathOf(a.getAttribute('href'))];
    const box = a.querySelector('.d') ? a.querySelector('.d').parentNode : a.querySelector('b') && a.querySelector('b').parentNode;
    if (!box) return;
    let el = box.querySelector('.prog');
    if (!el) { el = document.createElement('span'); el.className = 'prog'; box.appendChild(el); }
    if (!rec) return;                    // nothing recorded here: keep whatever the page already shows
    const bits = [];
    if (rec.max) bits.push(rec.max >= rec.total ? 'Read ✓' : 'Read ' + rec.max + ' / ' + rec.total);
    if (rec.quiz) bits.push('Quiz best ' + rec.quiz.best + ' / ' + rec.quiz.total);
    if (bits.length) el.textContent = bits.join(' · ');
  });
})();
