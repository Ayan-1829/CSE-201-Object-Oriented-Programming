/* ===================== art.js : one decorative illustration per topic ===================== */
/* Shown on each topic's title slide and as a thumbnail in the topic list.
   Mount with <span class="topic-art" data-art="3" aria-hidden="true"></span>; colours come from the
   theme variables, so the drawings follow light and dark mode. */
const TOPIC_ART = (() => {
  const bg = '<circle cx="200" cy="165" r="142" class="ta-bg"/>';
  const head = (id) => `<defs><marker id="ta${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ta-fill-ink"/></marker></defs>`;
  const arrow = (id) => `marker-end="url(#ta${id})"`;
  return {
    /* 1. Introducing OOP & Java: a coffee cup and a class blueprint */
    1: `${bg}
      <ellipse cx="190" cy="262" rx="120" ry="18" class="ta-card"/>
      <path d="M100,138 H280 V205 Q280,255 230,255 H150 Q100,255 100,205 Z" class="ta-acc"/>
      <path d="M280,158 Q330,158 330,190 Q330,222 280,218" class="ta-stroke-acc"/>
      <ellipse cx="190" cy="138" rx="90" ry="14" class="ta-coffee"/>
      <path d="M155,115 q-14,-22 0,-40 q14,-18 0,-40" class="ta-steam"/>
      <path d="M195,115 q-14,-22 0,-40 q14,-18 0,-40" class="ta-steam"/>
      <path d="M235,115 q-14,-22 0,-40 q14,-18 0,-40" class="ta-steam"/>
      <rect x="276" y="34" width="100" height="62" rx="14" class="ta-card"/>
      <text x="326" y="74" class="ta-m">{ }</text>`,
    /* 2. Control flow and loops: a loop arrow around a decision */
    2: `${bg}
      <path d="M200,58 A107,107 0 1 1 93,165" class="ta-ring"/>
      <path d="M72,170 L114,170 L93,132 Z" class="ta-ac"/>
      <path d="M200,112 L262,165 L200,218 L138,165 Z" class="ta-soft2"/>
      <text x="200" y="172" class="ta-m">i &lt; n</text>
      <rect x="268" y="30" width="96" height="44" rx="22" class="ta-card"/>
      <text x="316" y="59" class="ta-m">i++</text>`,
    /* 3. Arrays, sorting and searching: sorted bars over array cells and a magnifier */
    3: `${bg}
      ${[40, 70, 95, 120, 150, 180].map((hh, i) => `<rect x="${66 + i * 48}" y="${222 - hh}" width="32" height="${hh}" rx="6" class="${i === 3 ? 'ta-acc' : 'ta-ac'}"/>`).join('')}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${60 + i * 48}" y="230" width="44" height="44" rx="7" class="ta-card"/><text x="${82 + i * 48}" y="259" class="ta-s">${i}</text>`).join('')}
      <circle cx="306" cy="92" r="38" class="ta-lens"/>
      <path d="M334,120 L368,154" class="ta-handle"/>`,
    /* 4. Classes and objects: one blueprint, three objects */
    4: `${head(4)}${bg}
      <rect x="36" y="70" width="140" height="180" rx="14" class="ta-ac"/>
      <text x="106" y="106" class="ta-t ta-on-ac">class</text>
      <rect x="56" y="124" width="100" height="12" rx="6" class="ta-paper"/>
      <rect x="56" y="148" width="80" height="12" rx="6" class="ta-paper"/>
      <rect x="56" y="186" width="100" height="12" rx="6" class="ta-paper"/>
      <rect x="56" y="210" width="70" height="12" rx="6" class="ta-paper"/>
      ${[50, 130, 210].map((y, i) => `<path d="M180,160 L244,${y + 30}" class="ta-line" ${arrow(4)}/><rect x="252" y="${y}" width="112" height="60" rx="14" class="ta-card"/><rect x="252" y="${y}" width="112" height="16" rx="8" class="${['ta-acc', 'ta-ok', 'ta-soft1'][i]}"/><circle cx="280" cy="${y + 38}" r="9" class="ta-fill-ink"/><rect x="298" y="${y + 33}" width="50" height="10" rx="5" class="ta-faint"/>`).join('')}`,
    /* 5. Methods and recursion: stacked call frames and the return path */
    5: `${head(5)}${bg}
      ${[4, 3, 2, 1].map((n, k) => `<rect x="${70 + k * 24}" y="${50 + k * 54}" width="200" height="62" rx="14" class="${k === 3 ? 'ta-soft2' : 'ta-card'}"/><text x="${170 + k * 24}" y="${88 + k * 54}" class="ta-m">fact(${n})</text>`).join('')}
      <path d="M356,250 C392,200 392,110 330,78" class="ta-line-acc" ${arrow(5)}/>`,
    /* 6. Access control, static and final: a padlock */
    6: `${bg}
      <path d="M148,150 V108 A52,52 0 0 1 252,108 V150" class="ta-shackle"/>
      <rect x="118" y="142" width="164" height="130" rx="22" class="ta-acc"/>
      <circle cx="200" cy="194" r="17" class="ta-paper"/>
      <rect x="192" y="200" width="16" height="40" rx="6" class="ta-paper"/>
      <rect x="282" y="58" width="104" height="38" rx="19" class="ta-card"/>
      <text x="334" y="83" class="ta-m">private</text>
      <rect x="18" y="226" width="90" height="38" rx="19" class="ta-card"/>
      <text x="63" y="251" class="ta-m">final</text>`,
    /* 7. Inheritance: a class hierarchy with UML arrows */
    7: `${bg}
      <path d="M110,150 V122 H290 V150 M200,122 V96" class="ta-line"/>
      <path d="M290,206 V246" class="ta-line"/>
      <rect x="148" y="40" width="104" height="56" rx="12" class="ta-ac"/>
      <path d="M188,114 L212,114 L200,96 Z" class="ta-card"/>
      <rect x="58" y="150" width="104" height="56" rx="12" class="ta-card"/>
      <rect x="238" y="150" width="104" height="56" rx="12" class="ta-card"/>
      <path d="M278,224 L302,224 L290,206 Z" class="ta-card"/>
      <rect x="238" y="246" width="104" height="52" rx="12" class="ta-soft2"/>
      ${[[200, 68], [110, 178], [290, 178], [290, 272]].map(([x, y], i) => `<rect x="${x - 30}" y="${y - 5}" width="60" height="10" rx="5" class="${i ? 'ta-faint' : 'ta-paper'}"/>`).join('')}`,
    /* 8. Polymorphism and abstraction: one reference, many shapes */
    8: `${head(8)}${bg}
      <path d="M200,92 L98,170" class="ta-dash" ${arrow(8)}/>
      <path d="M200,92 L202,172" class="ta-dash" ${arrow(8)}/>
      <path d="M200,92 L296,168" class="ta-dash" ${arrow(8)}/>
      <rect x="136" y="40" width="128" height="52" rx="26" class="ta-card"/>
      <text x="200" y="73" class="ta-m">Shape s</text>
      <circle cx="88" cy="222" r="46" class="ta-ac"/>
      <rect x="160" y="182" width="84" height="84" rx="10" class="ta-acc"/>
      <path d="M306,176 L354,264 L258,264 Z" class="ta-ok-line"/>`,
    /* 9. Packages and interfaces: a package folder and a plug fitting a socket */
    9: `${bg}
      <path d="M32,92 H112 L132,112 H232 V262 H32 Z" class="ta-folder"/>
      <rect x="52" y="132" width="76" height="50" rx="9" class="ta-card"/>
      <rect x="140" y="132" width="76" height="50" rx="9" class="ta-card"/>
      <rect x="52" y="196" width="164" height="46" rx="9" class="ta-card"/>
      <path d="M216,219 C246,219 236,178 262,178" class="ta-cable"/>
      <rect x="258" y="152" width="34" height="52" rx="7" class="ta-ac"/>
      <rect x="290" y="161" width="16" height="9" rx="2" class="ta-fill-ink"/>
      <rect x="290" y="186" width="16" height="9" rx="2" class="ta-fill-ink"/>
      <rect x="306" y="128" width="66" height="100" rx="14" class="ta-card"/>
      <text x="339" y="258" class="ta-s">interface</text>`,
    /* 10. Exceptions: a warning sign and a catch block */
    10: `${bg}
      <path d="M200,48 L322,246 H78 Z" class="ta-warn"/>
      <rect x="189" y="108" width="22" height="84" rx="11" class="ta-paper"/>
      <circle cx="200" cy="220" r="13" class="ta-paper"/>
      <rect x="252" y="256" width="132" height="44" rx="22" class="ta-card"/>
      <text x="318" y="284" class="ta-m">catch (e)</text>`,
    /* 11. Multithreading: three threads running side by side */
    11: `${bg}
      ${[['ta-strand-ac', 100], ['ta-strand-acc', 165], ['ta-strand-ok', 230]].map(([c, y], i) => `<path d="M64,${y} C110,${y - 32} 150,${y + 32} 200,${y} S290,${y - 32} 334,${y}" class="${c}"/><path d="M330,${y - 16} L362,${y} L330,${y + 16} Z" class="${c.replace('strand', 'tip')}"/><circle cx="48" cy="${y}" r="20" class="${c.replace('strand', 'tip')}"/><text x="48" y="${y + 7}" class="ta-t ta-on-ac">${i + 1}</text>`).join('')}`,
    /* 12. Strings: characters in a row between quote marks */
    12: `${bg}
      <text x="70" y="128" class="ta-quote">\u201C</text>
      <text x="338" y="300" class="ta-quote">\u201D</text>
      ${'Hello'.split('').map((ch, i) => `<rect x="${68 + i * 54}" y="136" width="50" height="62" rx="9" class="${i === 0 ? 'ta-soft2' : 'ta-card'}"/><text x="${93 + i * 54}" y="177" class="ta-m ta-big">${ch}</text><text x="${93 + i * 54}" y="224" class="ta-s">${i}</text>`).join('')}`,
    /* 13. JavaFX, JDBC and Spring: an app window, a database and a leaf */
    13: `${head(13)}${bg}
      <rect x="26" y="62" width="212" height="172" rx="14" class="ta-card"/>
      <path d="M26,94 V76 A14,14 0 0 1 40,62 H224 A14,14 0 0 1 238,76 V94 Z" class="ta-bar"/>
      <circle cx="46" cy="78" r="6" class="ta-dot1"/><circle cx="64" cy="78" r="6" class="ta-dot2"/><circle cx="82" cy="78" r="6" class="ta-dot3"/>
      <rect x="48" y="112" width="168" height="14" rx="7" class="ta-faint"/>
      <rect x="48" y="138" width="120" height="14" rx="7" class="ta-faint"/>
      <rect x="48" y="180" width="80" height="34" rx="9" class="ta-ac"/>
      <path d="M244,150 H272" class="ta-line" ${arrow(13)}/>
      <path d="M280,104 V214 A45,14 0 0 0 370,214 V104" class="ta-ok-fill"/>
      <path d="M280,140 A45,14 0 0 0 370,140 M280,176 A45,14 0 0 0 370,176" class="ta-line-thin"/>
      <ellipse cx="325" cy="104" rx="45" ry="14" class="ta-ok-fill"/>
      <path d="M292,296 C290,256 330,244 368,248 C364,284 334,300 292,296 Z" class="ta-leaf"/>
      <path d="M298,290 C318,276 338,264 360,254" class="ta-vein"/>`
  };
})();

(function mountTopicArt() {
  document.querySelectorAll('[data-art]').forEach((el) => {
    const art = TOPIC_ART[el.getAttribute('data-art')];
    if (art) el.innerHTML = `<svg viewBox="0 0 400 320" class="ta-svg" focusable="false">${art}</svg>`;
  });
})();
