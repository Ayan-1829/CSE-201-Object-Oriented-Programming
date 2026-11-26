/* ===================== feedback.js : the Feedback button and form (shared by every GUB course site) =====================
   Installed by GUB/_tools/help/help.py next to help.js. Adds a "Feedback" button beside Help (top right of a page,
   or in a deck's top bar) and opens a small form. Any link with data-feedback (or href="#feedback") opens it too.

   The message goes to the same Cloudflare Worker as js/analytics.js: the address and the course name are read from
   analytics.js's own <script data-endpoint data-project> tag, so nothing is configured here and nothing secret is in
   this file. The Worker adds the approximate location (city, region, country) and the browser, and stores the
   message in the Feedback tab of the Course Analytics Sheet. Before anyone can send, the form asks the Worker
   (GET) whether it accepts course feedback ({courseFeedback:true}); if not, it offers the e-mail address instead.

   Sent: course, kind (mistake / suggestion / question / other), message, optional e-mail for a reply, the page,
   the slide (number and title), the language and theme in use, and phone or computer.
   The form follows the English / Bengali switch (localStorage "course-lang") and is skipped by lang.js. */
(function () {
  if (window.__courseFeedback || typeof HTMLDialogElement === 'undefined') return;
  window.__courseFeedback = true;
  const tag = document.querySelector('script[data-endpoint][data-project]');
  const ENDPOINT = tag && tag.dataset.endpoint, PROJECT = tag && tag.dataset.project;
  const MAIL = 'ayan@cse.green.edu.bd', MAX = 1000, COOLDOWN = 20000;
  const isBn = () => { try { return localStorage.getItem('course-lang') === 'bn'; } catch (_) { return false; } };

  const T = {
    en: {
      btn: 'Feedback', title: 'Send feedback', intro: 'Found a mistake, something unclear, or have an idea? Tell me.',
      kind: 'Kind', kinds: [['mistake', 'A mistake'], ['suggestion', 'A suggestion'], ['question', 'A question'], ['other', 'Something else']],
      msg: 'Your message', ph: 'What should be fixed or added? Say which part if you can.',
      email: 'Your e-mail (optional, only if you want a reply)',
      send: 'Send', cancel: 'Cancel', close: 'Close', sending: 'Sending…',
      ok: 'Thank you! Your feedback has been received.', empty: 'Write a message first.', bademail: 'Check the e-mail address.',
      wait: 'Please wait a few seconds before sending again.',
      err: 'It could not be sent. Try again later, or e-mail ' + MAIL + '.',
      off: 'Feedback can’t be sent from this page right now. Please e-mail ' + MAIL + '.'
    },
    bn: {
      btn: 'মতামত', title: 'মতামত পাঠান', intro: 'কোনো ভুল বা অস্পষ্ট কিছু পেয়েছেন, বা কোনো ভাবনা আছে? জানান।',
      kind: 'ধরন', kinds: [['mistake', 'একটি ভুল'], ['suggestion', 'একটি পরামর্শ'], ['question', 'একটি প্রশ্ন'], ['other', 'অন্য কিছু']],
      msg: 'আপনার বার্তা', ph: 'কী ঠিক করা বা যোগ করা দরকার? পারলে কোন অংশ, তা লিখুন।',
      email: 'আপনার ইমেইল (ঐচ্ছিক, শুধু উত্তর চাইলে)',
      send: 'পাঠান', cancel: 'বাতিল', close: 'বন্ধ করুন', sending: 'পাঠানো হচ্ছে…',
      ok: 'ধন্যবাদ! আপনার মতামত পৌঁছেছে।', empty: 'আগে একটি বার্তা লিখুন।', bademail: 'ইমেইল ঠিকানাটি দেখে নিন।',
      wait: 'আবার পাঠানোর আগে কয়েক সেকেন্ড অপেক্ষা করুন।',
      err: 'পাঠানো যায়নি। পরে আবার চেষ্টা করুন, অথবা ' + MAIL + '-এ ইমেইল করুন।',
      off: 'এই মুহূর্তে এখান থেকে মতামত পাঠানো যাচ্ছে না। ' + MAIL + '-এ ইমেইল করুন।'
    }
  };
  const L = () => T[isBn() ? 'bn' : 'en'];

  const css = `
#btn-feedback .btn-ic{width:16px;height:16px}
.fb-dlg{width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 40px);padding:0;border:1px solid var(--line);border-radius:4px;background:var(--sheet);color:var(--ink);
  box-shadow:0 20px 60px -20px rgba(0,0,0,.45);font:16px/1.5 var(--f-body,Georgia,serif);text-align:left}
.fb-dlg::backdrop{background:rgba(10,15,25,.45)}
.fb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 22px 6px;border-bottom:1px solid var(--line)}
.fb-head h2{margin:0;font:700 22px/1.25 var(--f-head,var(--f-display,Georgia,serif))}
.fb-head p{margin:4px 0 10px;color:var(--ink-2);font-size:15px;text-align:left}
.fb-x{flex:none}
.fb-form{padding:14px 22px 20px;display:grid;gap:12px}
.fb-form label{display:block;font:600 14px var(--f-head,var(--f-ui,Georgia,serif));margin-bottom:4px;color:var(--ink)}
.fb-form select,.fb-form textarea,.fb-form input[type=email]{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:4px;background:var(--paper);color:var(--ink);font:16px/1.45 var(--f-body,Georgia,serif);padding:8px 10px}
.fb-form textarea{min-height:130px;resize:vertical}
.fb-form :is(select,textarea,input):focus{outline:2px solid var(--ac);outline-offset:1px}
.fb-count{display:block;text-align:right;font-size:13px;color:var(--ink-3);margin-top:2px}
.fb-status{margin:0;min-height:1.4em;font-size:14.5px;line-height:1.4;text-align:left}
.fb-status.err{color:var(--bad,#a64b00)}.fb-status.ok{color:var(--ok,#15803d);font-weight:700}
.fb-actions{display:flex;gap:10px;justify-content:flex-end}
.fb-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.fb-fab{position:fixed;left:16px;bottom:62px;z-index:50}
@media print{#btn-feedback,.fb-dlg{display:none!important}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const ICON = '<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"></path><path d="M8 9.5h8M8 12.5h5"></path></svg>';
  const XICON = '<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';

  /* ---------- the button, after Help ---------- */
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'btn sm'; btn.id = 'btn-feedback';
  btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('data-no-i18n', '');
  const label = () => { btn.innerHTML = ICON + '<span>' + L().btn + '</span>'; btn.setAttribute('aria-label', L().title); btn.title = L().title; };
  label();
  function place() {
    const help = document.getElementById('btn-help');
    if (help && help.parentNode) { help.parentNode.insertBefore(btn, help.nextSibling); return; }
    const host = document.querySelector('.head-tools') || document.querySelector('.deck-actions') || document.querySelector('.topnav');
    if (host) host.appendChild(btn); else { btn.classList.add('fb-fab'); document.body.appendChild(btn); }
  }
  place();

  /* ---------- the form ---------- */
  const dlg = document.createElement('dialog');
  dlg.className = 'fb-dlg'; dlg.setAttribute('data-no-i18n', ''); dlg.setAttribute('aria-labelledby', 'fb-title');
  document.body.appendChild(dlg);
  let state = 'unknown', last = 0, kind = 'mistake';

  function render() {
    const t = L();
    dlg.innerHTML =
      `<div class="fb-head"><div><h2 id="fb-title">${t.title}</h2><p>${t.intro}</p></div>` +
      `<button type="button" class="btn sm fb-x" aria-label="${t.close}">${XICON}</button></div>` +
      `<form class="fb-form" novalidate>` +
      `<div><label for="fb-kind">${t.kind}</label><select id="fb-kind">${t.kinds.map(([v, n]) => `<option value="${v}"${v === kind ? ' selected' : ''}>${n}</option>`).join('')}</select></div>` +
      `<div><label for="fb-msg">${t.msg}</label><textarea id="fb-msg" maxlength="${MAX}" placeholder="${t.ph}"></textarea><span class="fb-count">0 / ${MAX}</span></div>` +
      `<div><label for="fb-email">${t.email}</label><input id="fb-email" type="email" autocomplete="email" maxlength="200" inputmode="email"></div>` +
      `<input class="fb-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` +
      `<p class="fb-status" role="status" aria-live="polite"></p>` +
      `<div class="fb-actions"><button type="button" class="btn fb-cancel">${t.cancel}</button><button type="submit" class="btn pri fb-send">${t.send}</button></div>` +
      `</form>`;
    const msg = dlg.querySelector('#fb-msg'), count = dlg.querySelector('.fb-count');
    msg.addEventListener('input', () => { count.textContent = msg.value.length + ' / ' + MAX; });
    dlg.querySelector('#fb-kind').addEventListener('change', (e) => { kind = e.target.value; });
    dlg.querySelector('.fb-x').addEventListener('click', () => dlg.close());
    dlg.querySelector('.fb-cancel').addEventListener('click', () => dlg.close());
    dlg.querySelector('form').addEventListener('submit', submit);
    if (state === 'off') status(t.off, 'err', true);
  }
  function status(text, cls, disable) {
    const s = dlg.querySelector('.fb-status'); if (!s) return;
    s.textContent = text; s.className = 'fb-status' + (cls ? ' ' + cls : '');
    const b = dlg.querySelector('.fb-send'); if (b && disable !== undefined) b.disabled = !!disable;
  }

  /* does the Worker store course feedback? asked once per page */
  function check() {
    if (!ENDPOINT || !PROJECT) { state = 'off'; return Promise.resolve(); }
    if (state !== 'unknown') return Promise.resolve();
    return fetch(ENDPOINT, { method: 'GET', cache: 'no-store' }).then((r) => r.json())
      .then((j) => { state = j && j.courseFeedback === true ? 'on' : 'off'; })
      .catch(() => { state = 'off'; });
  }

  function slideInfo() {
    const s = document.querySelector('.slide.active');
    if (!s) return '';
    const all = Array.prototype.indexOf.call(document.querySelectorAll('.slide'), s) + 1;
    return all + ': ' + String(s.getAttribute('data-title') || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function submit(e) {
    e.preventDefault();
    const t = L();
    if (state !== 'on') { status(t.off, 'err', true); return; }
    const message = dlg.querySelector('#fb-msg').value.trim();
    const email = dlg.querySelector('#fb-email').value.trim();
    if (!message) { status(t.empty, 'err'); dlg.querySelector('#fb-msg').focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status(t.bademail, 'err'); dlg.querySelector('#fb-email').focus(); return; }
    if (Date.now() - last < COOLDOWN) { status(t.wait, 'err'); return; }
    status(t.sending, '', true);
    let theme = document.documentElement.getAttribute('data-theme') || '';
    if (!theme) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const body = {
      project: PROJECT, event: 'feedback', kind, message, email,
      page: location.pathname + location.hash, slide: slideInfo(),
      lang: isBn() ? 'bn' : 'en', theme, device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      website: dlg.querySelector('.fb-hp').value
    };
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then((r) => r.json())
      .then((j) => {
        if (!j || j.ok !== true) throw new Error('not stored');
        last = Date.now();
        dlg.querySelector('#fb-msg').value = ''; dlg.querySelector('.fb-count').textContent = '0 / ' + MAX;
        status(t.ok, 'ok', false);
      })
      .catch(() => status(t.err, 'err', false));
  }

  function open() {
    document.querySelectorAll('dialog[open]').forEach((d) => { if (d !== dlg) d.close(); });
    render();
    dlg.showModal();
    dlg.querySelector('#fb-msg').focus();
    check().then(() => { if (state === 'off') status(L().off, 'err', true); });
  }
  window.openFeedback = open;
  btn.addEventListener('click', open);
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-feedback], a[href="#feedback"]');
    if (!a) return;
    e.preventDefault(); open();
  });
  if (location.hash === '#feedback') setTimeout(open, 300);

  /* keys typed in the form must not move the slides behind it */
  ['keydown', 'keyup'].forEach((type) => addEventListener(type, (e) => {
    if (dlg.open && e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation();
  }, true));
  /* a click on the dimmed backdrop closes the form */
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  /* follow the language switch (L key or the বাংলা button) */
  const relabel = () => setTimeout(() => { label(); if (dlg.open) { const m = dlg.querySelector('#fb-msg').value; render(); dlg.querySelector('#fb-msg').value = m; } }, 0);
  addEventListener('keydown', (e) => { if ((e.key === 'l' || e.key === 'L') && !dlg.open && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) relabel(); });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#btn-lang')) relabel(); });
})();
