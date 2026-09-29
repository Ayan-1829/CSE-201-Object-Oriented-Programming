/* ===================== page.js : mounts figures, traces, demos and quizzes ===================== */
function mountPage(root) {
  root = root || document;
  const fail = (ph, what, e) => ph.append(h('p', { class: 'bad' }, `This ${what} could not start: ${e.message}`));
  root.querySelectorAll('pre.code:not([data-hl])').forEach((pre) => { try { Java.render(pre.textContent.replace(/^\n/, ''), pre, { nums: !pre.classList.contains('nonum'), marks: pre.getAttribute('data-mark') }); } catch (e) { /* leave plain text */ } });
  root.querySelectorAll('figure.fig[data-fig]').forEach((fig) => {
    const id = fig.getAttribute('data-fig');
    try {
      const el = FIGS[id]();
      const box = h('div', { class: 'fig-box' }, el);
      fig.insertBefore(box, fig.querySelector('figcaption'));
    } catch (e) { fail(fig, 'figure', e); }
  });
  root.querySelectorAll('[data-trace]').forEach((ph) => {
    const id = ph.getAttribute('data-trace');
    try { ph.append(Tracer.build(TRACES[id], { start: +(ph.getAttribute('data-start') || 0) })); } catch (e) { fail(ph, 'trace', e); }
  });
  root.querySelectorAll('[data-demo]').forEach((ph) => {
    const id = ph.getAttribute('data-demo');
    try { DEMOS[id](ph); } catch (e) { fail(ph, 'demo', e); }
  });
  root.querySelectorAll('.quiz-host').forEach((ph) => {
    const j = ph.parentNode.querySelector('script.quiz-json');
    if (j) mountQuiz(ph, JSON.parse(j.textContent), ph.getAttribute('data-quiz-key'));
  });
}
