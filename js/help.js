/* ===================== help.js : the Help button and panel (shared by every GUB course site) =====================
   Installed by GUB/_tools/help/help.py, which also writes js/help-data.js (window.COURSE_HELP) for the course.
   Adds a "Help" button beside Dark mode at the top right (.head-tools), or to the deck bar (.deck-actions), opens a dialog with
   keyboard shortcuts, the drawing tool, how the site works and where to ask; the "?" key opens it too.
   The panel follows the English / Bengali switch (localStorage "course-lang") and is skipped by lang.js. */
(function () {
  if (window.__courseHelp) return;
  window.__courseHelp = true;
  const D = window.COURSE_HELP || { en: {}, bn: {} };
  const isBn = () => { try { return localStorage.getItem('course-lang') === 'bn'; } catch (e) { return false; } };
  const deck = !!document.querySelector('.deck-page, #deck');

  const K = (...xs) => xs.map((x) => x.split(' + ').map((y) => `<kbd>${y}</kbd>`).join(' + ')).join(' &nbsp;');
  const T = {
    en: { help: 'Help', title: 'Help', close: 'Close', keys: 'Keyboard shortcuts', draw: 'Drawing on a slide', data: 'Your progress and notes', ask: 'Still stuck?',
      touch: 'On a phone or tablet: swipe left or right to change slides.',
      k: [[K('→', 'PageDown', 'Space'), 'Next slide'], [K('←', 'PageUp', 'Shift + Space'), 'Previous slide'], [K('Home') + ' / ' + K('End'), 'First / last slide'],
          [K('M'), 'Open or close the slide list'], [K('F'), 'Full screen, for presenting'], [K('Esc'), 'Close the slide list or this panel; leave full screen']],
      page: [[K('Tab') + ' / ' + K('Shift + Tab'), 'Move between links and buttons'], [K('Esc'), 'Close this panel']],
      lang: [K('L'), 'Switch between English and বাংলা'], q: [K('?'), 'Open this help'],
      d: [['The ✎ button (bottom right)', 'Open the drawing tools on the current slide: pen, highlighter, eraser, colours and a blank page'], [K('Ctrl + Z') + ' / ' + K('⌘ + Z'), 'Undo'],
          [K('Ctrl + Shift + Z') + ' / ' + K('Ctrl + Y'), 'Redo'], [K('Esc'), 'Close the drawing tools or the blank page']],
      dNote: 'Drawings are kept for each slide in this browser only; they never change the page for anyone else.',
      store: ['Quiz scores, ticked checklists, drawings and your language choice are saved in this browser only (localStorage). Clearing site data removes them; nothing is sent to a server.'] },
    bn: { help: 'সহায়তা', title: 'সহায়তা', close: 'বন্ধ করুন', keys: 'কিবোর্ড শর্টকাট', draw: 'স্লাইডে আঁকা', data: 'আপনার অগ্রগতি ও নোট', ask: 'এখনো আটকে আছেন?',
      touch: 'ফোন বা ট্যাবলেটে: স্লাইড বদলাতে বাঁয়ে বা ডানে সোয়াইপ করুন।',
      k: [[K('→', 'PageDown', 'Space'), 'পরের স্লাইড'], [K('←', 'PageUp', 'Shift + Space'), 'আগের স্লাইড'], [K('Home') + ' / ' + K('End'), 'প্রথম / শেষ স্লাইড'],
          [K('M'), 'স্লাইড তালিকা খুলুন বা বন্ধ করুন'], [K('F'), 'ফুল স্ক্রিন, উপস্থাপনার জন্য'], [K('Esc'), 'স্লাইড তালিকা বা এই প্যানেল বন্ধ; ফুল স্ক্রিন থেকে বের হওয়া']],
      page: [[K('Tab') + ' / ' + K('Shift + Tab'), 'লিংক ও বোতামের মধ্যে যাওয়া'], [K('Esc'), 'এই প্যানেল বন্ধ করুন']],
      lang: [K('L'), 'English ও বাংলার মধ্যে বদলান'], q: [K('?'), 'এই সহায়তা খুলুন'],
      d: [['✎ বোতাম (নিচে ডানে)', 'বর্তমান স্লাইডে আঁকার টুল খুলুন: কলম, হাইলাইটার, ইরেজার, রং ও একটি ফাঁকা পাতা'], [K('Ctrl + Z') + ' / ' + K('⌘ + Z'), 'আগের অবস্থায় ফেরা (Undo)'],
          [K('Ctrl + Shift + Z') + ' / ' + K('Ctrl + Y'), 'আবার করা (Redo)'], [K('Esc'), 'আঁকার টুল বা ফাঁকা পাতা বন্ধ করুন']],
      dNote: 'আঁকা প্রতিটি স্লাইডের জন্য শুধু এই ব্রাউজারে থাকে; অন্য কারও জন্য পাতাটি বদলায় না।',
      store: ['কুইজ স্কোর, টিক দেওয়া চেকলিস্ট, আঁকা এবং ভাষার পছন্দ শুধু এই ব্রাউজারে (localStorage) সংরক্ষিত থাকে। সাইট ডেটা মুছলে এগুলো মুছে যায়; কোনো সার্ভারে কিছু পাঠানো হয় না।'] }
  };

  /* ---------- styles (built on each site's own theme variables, so light and dark mode both work) ---------- */
  const css = `
#btn-help .btn-ic{width:16px;height:16px}
.help-dlg{border:1px solid var(--line);border-radius:16px;padding:0;max-width:min(760px,94vw);width:100%;max-height:88vh;background:var(--sheet);color:var(--ink);box-shadow:0 24px 70px rgba(0,0,0,.28);font:16px/1.5 var(--f-body,var(--f-head,Georgia,serif))}
.help-dlg::backdrop{background:rgba(10,10,20,.45)}
.help-dlg .hd{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--sheet);z-index:1}
.help-dlg .hd h2{margin:0;flex:1;font:700 21px/1.2 var(--f-head,Georgia,serif)}
.help-dlg .hd .sub{display:block;font:500 13px var(--f-head,Georgia,serif);color:var(--ink-2);margin-top:2px}
.help-dlg .x{border:1px solid var(--line);background:var(--sheet-2);color:var(--ink);border-radius:9px;width:34px;height:34px;font-size:18px;cursor:pointer}
.help-dlg .bd{padding:6px 20px 20px;overflow:auto;max-height:calc(88vh - 70px)}
.help-dlg h3{font:700 16px var(--f-head,Georgia,serif);color:var(--accent-ink);margin:18px 0 8px}
.help-dlg p,.help-dlg li,.help-dlg td{text-align:left;hyphens:manual}
.help-dlg p{margin:6px 0}
.help-dlg table{width:100%;border-collapse:collapse;font-size:15px}
.help-dlg td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.help-dlg td:first-child{width:38%;white-space:normal}
.help-dlg kbd{display:inline-block;font:600 13px var(--f-mono,monospace);padding:1px 7px;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;background:var(--sheet-2);color:var(--ink);margin:1px 0}
.help-dlg ul{margin:4px 0;padding-left:20px}
.help-dlg li{margin:4px 0}
.help-dlg .muted{color:var(--ink-2);font-size:14px}
.help-dlg a{color:var(--accent-ink)}
.help-fab{position:fixed;left:16px;bottom:16px;z-index:50}
@media (max-width:560px){.help-dlg td:first-child{width:44%}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const ICON = '<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"></circle><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4.1"></path><circle cx="12" cy="17.6" r=".6" fill="currentColor"></circle></svg>';

  /* ---------- the button ---------- */
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'btn sm'; btn.id = 'btn-help';
  btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('data-no-i18n', '');
  const label = () => { const L = T[isBn() ? 'bn' : 'en']; btn.innerHTML = ICON + '<span>' + L.help + '</span>'; btn.setAttribute('aria-label', L.help + ' (?)'); btn.title = L.help + ' (?)'; };
  label();
  const host = document.querySelector('.head-tools') || document.querySelector('.deck-actions') || document.querySelector('.topnav');
  if (host) host.appendChild(btn); else { btn.classList.add('help-fab'); document.body.appendChild(btn); }

  /* ---------- the dialog ---------- */
  const dlg = document.createElement('dialog');
  dlg.className = 'help-dlg'; dlg.setAttribute('data-no-i18n', ''); dlg.setAttribute('aria-labelledby', 'help-title');
  document.body.appendChild(dlg);
  const rows = (list) => '<table><tbody>' + list.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') + '</tbody></table>';

  function render() {
    const bn = isBn(), L = T[bn ? 'bn' : 'en'], C = (bn ? D.bn : D.en) || D.en || {};
    const hasLang = !!document.getElementById('btn-lang') || !!document.querySelector('script[src*="lang.js"]');
    const hasDraw = !!document.querySelector('script[src*="annotate.js"]');
    let h = `<div class="hd"><h2 id="help-title">${L.title}${C.name ? `<span class="sub">${C.name}</span>` : ''}</h2><button type="button" class="x" aria-label="${L.close}" title="${L.close} (Esc)">✕</button></div><div class="bd">`;
    if (C.intro) h += `<p>${C.intro}</p>`;
    const keys = deck ? L.k.slice() : L.page.slice();
    if (hasLang && deck) keys.push(L.lang);
    keys.push(L.q);
    h += `<h3>${L.keys}</h3>` + rows(keys) + (deck ? `<p class="muted">${L.touch}</p>` : '');
    (C.sections || []).forEach((s) => {
      if (s.deck === true && !deck) return;
      if (s.deck === false && deck) return;
      h += `<h3>${s.h}</h3>` + (s.p ? `<p>${s.p}</p>` : '') + (s.keys ? rows(s.keys) : '') + (s.items ? '<ul>' + s.items.map((x) => `<li>${x}</li>`).join('') + '</ul>' : '');
    });
    if (deck && hasDraw) h += `<h3>${L.draw}</h3>` + rows(L.d) + `<p class="muted">${L.dNote}</p>`;
    h += `<h3>${L.data}</h3><p>${(C.store || L.store).join(' ')}</p>`;
    if (C.ask) h += `<h3>${L.ask}</h3><p>${C.ask}</p>`;
    dlg.innerHTML = h + '</div>';
    dlg.querySelector('.x').addEventListener('click', () => dlg.close());
  }
  function open() {
    render();
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    dlg.querySelector('.x').focus();
  }
  btn.addEventListener('click', open);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });     /* click on the backdrop */
  dlg.addEventListener('close', () => btn.focus());
  /* while the panel is open, the slide keys must not move the deck behind it */
  window.addEventListener('keydown', (e) => {
    if (dlg.open && e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation();
  }, true);
  document.addEventListener('keydown', (e) => {
    const t = e.target, tag = t && t.tagName ? t.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '?' && !dlg.open) { e.preventDefault(); open(); }
    if (e.key === 'l' || e.key === 'L') setTimeout(label, 60);
  });
  /* the language button changes the label too */
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#btn-lang')) setTimeout(label, 60); }, true);
})();
