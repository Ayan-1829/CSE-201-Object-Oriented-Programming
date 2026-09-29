/* ===================== quiz.js : multiple-choice quiz widget ===================== */
function mountQuiz(root, qs, key) {
  let i = 0, score = 0;
  const box = h('div', { class: 'quiz' });
  root.append(box);
  function show() {
    clear(box);
    if (i >= qs.length) {
      const prev = Store.sub('quiz', key) || { best: 0, total: qs.length }, best = Math.max(prev.best, score);
      Store.setSub('quiz', key, { best, total: qs.length });
      box.append(h('div', { class: 'panel' }, h('div', { class: 'score' }, `${score} / ${qs.length}`),
        h('p', null, score === qs.length ? 'Perfect score.' : score / qs.length >= 0.7 ? 'Good work. Review the explanations for the ones you missed.' : 'Go back through the slides and the interactive examples, then try again.'),
        h('p', { class: 'small muted' }, `Best score on this device: ${best} / ${qs.length}`),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn pri', onclick: () => { i = 0; score = 0; show(); } }, 'Try again'))));
      return;
    }
    const q = qs[i];
    let done = false;
    const why = h('div'), nextBtn = h('button', { type: 'button', class: 'btn pri', style: { display: 'none' }, onclick: () => { i++; show(); } }, i === qs.length - 1 ? 'See score' : 'Next question');
    const btns = q.o.map((t, k) => h('button', { type: 'button', class: 'qopt', onclick: () => {
      if (done) return; done = true;
      const ok = k === q.a; if (ok) score++;
      btns.forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
      why.append(h('div', { class: 'qwhy', role: 'status' }, h('b', null, ok ? 'Correct. ' : 'Not quite. '), q.w)); nextBtn.style.display = '';
    } }, t));
    box.append(h('div', { class: 'qhead' }, h('span', null, `Question ${i + 1} of ${qs.length}`), h('span', null, `Score ${score}`)), h('div', { class: 'qtext' }, q.q), ...btns, why, nextBtn);
  }
  show();
}
