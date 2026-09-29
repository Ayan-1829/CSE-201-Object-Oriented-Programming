/* ===================== slides.js : slide deck engine (vanilla) ===================== */
(function () {
  var cfg = window.OOP_TOPIC || {};
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var cur = 0, total = slides.length;
  var counter = document.getElementById('counter'), bar = document.getElementById('progress-fill');
  var prevBtn = document.getElementById('prev'), nextBtn = document.getElementById('next');
  var fsBtn = document.getElementById('btn-fs'), menuBtn = document.getElementById('btn-menu');
  var menu = document.getElementById('slide-menu'), live = document.getElementById('live');
  var menuCloseBtn = document.getElementById('btn-menu-close');

  function go(n, fromHash) {
    n = Math.max(1, Math.min(total, n));
    cur = n - 1;
    slides.forEach(function (s, i) { var on = i === cur; s.classList.toggle('active', on); s.setAttribute('aria-hidden', on ? 'false' : 'true'); });
    slides[cur].scrollTop = 0;
    counter.textContent = n + ' / ' + total;
    bar.style.width = (n / total * 100) + '%';
    prevBtn.textContent = n === 1 ? (cfg.prev ? 'Previous topic' : 'Start') : 'Previous';
    prevBtn.disabled = n === 1 && !cfg.prev;
    nextBtn.textContent = n === total ? (cfg.next ? (cfg.nextLabel || 'Next topic') : 'Finish') : 'Next';
    nextBtn.disabled = n === total && !cfg.next;
    if (live) live.textContent = 'Slide ' + n + ' of ' + total + ': ' + (slides[cur].getAttribute('data-title') || '');
    if (!fromHash) { try { history.replaceState(null, '', '#s=' + n); } catch (e) { location.hash = 's=' + n; } }
    document.querySelectorAll('#slide-menu a').forEach(function (a, i) { a.classList.toggle('cur', i === cur); });
  }
  function next() { if (cur < total - 1) go(cur + 2); else if (cfg.next) location.href = cfg.next; }
  function prev() { if (cur > 0) go(cur); else if (cfg.prev) location.href = cfg.prev + '#s=last'; }

  function fromHash() {
    var m = /s=(\d+|last)/.exec(location.hash || '');
    if (m) return m[1] === 'last' ? total : parseInt(m[1], 10);
    return 1;
  }

  /* slide menu */
  function buildMenu() {
    var ol = document.createElement('ol');
    slides.forEach(function (s, i) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#s=' + (i + 1); a.textContent = s.getAttribute('data-title') || ('Slide ' + (i + 1));
      li.appendChild(a); ol.appendChild(li);
    });
    menu.appendChild(ol);
  }
  function toggleMenu(open) {
    var show = typeof open === 'boolean' ? open : menu.hasAttribute('hidden');
    if (show) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
    menuBtn.setAttribute('aria-expanded', String(show));
  }

  /* full screen (with a "presentation mode" fallback where the Fullscreen API is not available) */
  function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function paintFs() {
    var on = isFs() || document.body.classList.contains('presenting');
    var label = fsBtn.querySelector('span'), icon = fsBtn.querySelector('.btn-ic');
    if (label) label.textContent = on ? 'Exit full screen' : 'Full screen'; else fsBtn.textContent = on ? 'Exit full screen' : 'Full screen';
    if (icon) icon.innerHTML = on
      ? '<path d="M9 3v3a2 2 0 0 1-2 2H4M15 3v3a2 2 0 0 0 2 2h3M9 21v-3a2 2 0 0 0-2-2H4M15 21v-3a2 2 0 0 1 2-2h3"></path>'
      : '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"></path>';
    fsBtn.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('is-fs', on);
  }
  function toggleFs() {
    var el = document.documentElement;
    if (isFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    if (document.body.classList.contains('presenting')) { document.body.classList.remove('presenting'); paintFs(); return; }
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { var p = req.call(el); if (p && p.catch) p.catch(function () { document.body.classList.add('presenting'); paintFs(); }); }
    else { document.body.classList.add('presenting'); paintFs(); }
  }
  document.addEventListener('fullscreenchange', paintFs);
  document.addEventListener('webkitfullscreenchange', paintFs);

  /* events */
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  fsBtn.addEventListener('click', toggleFs);
  menuBtn.addEventListener('click', function () { toggleMenu(); });
  if (menuCloseBtn) menuCloseBtn.addEventListener('click', function () { toggleMenu(false); menuBtn.focus(); });
  document.addEventListener('click', function (e) {
    if (menu.hasAttribute('hidden')) return;
    if (menu.contains(e.target) || e.target === menuBtn || menuBtn.contains(e.target)) return;
    toggleMenu(false);
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#s="]') : null;
    if (!a) return;
    e.preventDefault(); go(parseInt(a.getAttribute('href').slice(3), 10)); toggleMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target, tag = t && t.tagName ? t.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === ' ' && tag !== 'button' && tag !== 'a') { e.preventDefault(); e.shiftKey ? prev() : next(); }
    else if (k === 'Home') { e.preventDefault(); go(1); }
    else if (k === 'End') { e.preventDefault(); go(total); }
    else if (k === 'f' || k === 'F') { toggleFs(); }
    else if (k === 'm' || k === 'M') { toggleMenu(); }
    else if (k === 'Escape') { toggleMenu(false); if (document.body.classList.contains('presenting')) { document.body.classList.remove('presenting'); paintFs(); } }
  });
  var sx = 0, sy = 0, sOk = false;
  document.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; sOk = !(e.target.closest && e.target.closest('.demo, .scrollx, svg, input, select, textarea, #slide-menu')); }, { passive: true });
  document.addEventListener('touchend', function (e) { if (!sOk) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 70 && Math.abs(dy) < 45) { dx < 0 ? next() : prev(); } }, { passive: true });
  window.addEventListener('hashchange', function () { var n = fromHash(); if (n !== cur + 1) go(n, true); });

  buildMenu(); paintFs();
  go(fromHash(), true);
  window.OOPSlides = { go: go, next: next, prev: prev };
})();
