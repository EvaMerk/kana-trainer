/* UI und Übungsablauf des Kana-Trainers. */

const $ = sel => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

let session = null;          // { queue, index, right, wrong }
let resizeWriteCanvas = null; // von initWriting() gesetzt

// ---------------------------------------------------------------- Navigation

/* Zurück an den Anfang, bevor die nächste Frage aufgebaut wird. Ohne das
 * bliebe die Seite dort stehen, wo eben der Weiter-Knopf war, und das neue
 * Zeichen erschiene oberhalb des Bildschirmrands. */
function zumSeitenanfang() {
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* Nach einer Antwort die Auswertung ins Bild holen.
 *
 * Sie wird unter das Eingabefeld gehängt und liegt auf dem Handy komplett
 * unterhalb des Bildschirmrands — man musste jedes Mal erst scrollen, um
 * Ergebnis und Weiter-Knopf zu sehen. `block: 'end'` schiebt das untere Ende
 * ins Bild, also den Knopf; ist die Erklärung länger als der Bildschirm,
 * hält ihn zusätzlich `position: sticky` fest (siehe `.weiter` im CSS).
 *
 * Der Fokus wandert weiterhin auf den Knopf, damit am Mac die Eingabetaste
 * weitermacht — aber ohne den ruckartigen eigenen Scrollsprung. */
function zeigeAuswertung(block, knopf) {
  const sanft = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  block.scrollIntoView({ block: 'end', behavior: sanft ? 'smooth' : 'auto' });
  knopf.focus({ preventScroll: true });
}

function show(view) {
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  $('#view-' + view).hidden = false;
  document.querySelectorAll('nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));

  // Während einer Runde Kopfzeile ausblenden: auf dem iPhone kostet sie
  // knapp 180 px, und dann passt die Auswertung samt Weiter-Knopf nicht mehr
  // auf den Bildschirm. Raus geht es über „Abbrechen".
  document.body.classList.toggle('in-runde', view === 'session');

  // Das Canvas hat nur eine messbare Größe, wenn es sichtbar ist.
  if (view === 'write' && resizeWriteCanvas) resizeWriteCanvas();
}

function renderHeader() {
  const kanji = kanjiImFokus();
  const due = dueChars().length + (kanji ? vocabDue('kanji').length : 0);
  const fresh = newChars().length + (kanji ? vocabNew('kanji').length : 0);
  $('#stat-streak').textContent = streak();
  $('#stat-due').textContent = due;
  $('#stat-new').textContent = fresh;
}

// ---------------------------------------------------------------- Startseite

/* Standanzeige ganz unten auf der Übersicht.
 *
 * Zeigt, welche Fassung auf DIESEM Gerät läuft — die Zahlen kommen aus den
 * geladenen Dateien, der Name aus dem tatsächlich aktiven Zwischenspeicher.
 * Damit ist auf einen Blick erkennbar, ob ein Handy noch auf altem Stand
 * hängt, statt das aus dem Verhalten erraten zu müssen. */
function renderVersion() {
  const n = $('#version-line');
  if (!n) return;

  const teile = [];
  if (typeof COURSE_CHARS !== 'undefined') teile.push(`${COURSE_CHARS.length} Zeichen`);
  if (typeof WORDS !== 'undefined') teile.push(`${WORDS.length} Wörter`);
  if (typeof VOCAB !== 'undefined') teile.push(`${VOCAB.length} Vokabeln`);
  if (typeof KANJI !== 'undefined') teile.push(`${KANJI.length} Kanji`);
  n.textContent = teile.join(' · ');

  // Der Name des aktiven Caches verrät die Fassung. Ohne Service Worker
  // (z. B. per Doppelklick geöffnet) gibt es keinen — dann bleibt es bei
  // den Zahlen.
  if (!('caches' in window)) return;
  caches.keys().then(namen => {
    const treffer = namen.find(k => k.startsWith('kana-trainer-'));
    if (treffer) n.textContent += ' · Stand ' + treffer.replace('kana-trainer-', '');
  }).catch(() => { /* Zugriff gesperrt, nicht schlimm */ });
}

function renderHome() {
  renderHeader();
  renderFokus();
  renderCourseMode();
  renderVersion();

  const kanji = kanjiFuerRunde();
  const due = dueChars().length + kanji.due.length;
  const fresh = Math.min(newChars().length, Store.data.settings.newPerSession) + kanji.fresh.length;
  const hint = $('#session-hint');

  if (due + fresh === 0) {
    hint.textContent = 'Alles wiederholt für heute. Du kannst trotzdem freies Üben starten oder eine neue Lektion freischalten.';
  } else {
    const parts = [];
    if (due) parts.push(`${due} zur Wiederholung`);
    if (fresh) parts.push(`${fresh} neu`);
    hint.textContent = parts.join(' · ');
  }

  // Schwache Zeichen (bei Kanji-Schwerpunkt die schwachen Kanji)
  const weak = fokus() === 'kanji' ? weakestKanji(8)
    : [...weakestChars(8), ...(kanjiImFokus() ? weakestKanji(4) : [])].slice(0, 8);
  const weakBox = $('#weak-list');
  weakBox.innerHTML = '';
  if (weak.length === 0) {
    weakBox.append(el('p', 'muted', 'Noch keine Problemzeichen — üb ein paar Runden, dann zeige ich dir hier, wo es hakt.'));
  } else {
    weak.forEach(w => {
      const item = el('div', 'weak-item');
      const istKanji = w.typ === 'kanji';
      item.append(el('span', 'weak-char', istKanji ? w.kanji : w.c));
      item.append(el('span', 'weak-romaji', istKanji ? w.lesung.split('、')[0] : w.r));
      const rate = istKanji ? (() => { const c = Store.data.kanji[vocabId(w)]; return c.correct / c.seen; })() : w.rate;
      item.append(el('span', 'weak-rate', Math.round(rate * 100) + '%'));
      item.title = istKanji ? w.deutsch : w.m;
      weakBox.append(item);
    });
  }

  renderLessonList();
}

/* Schwerpunkt-Auswahl: Alles / Hiragana / Katakana / Kanji */
function renderFokus() {
  document.querySelectorAll('#fokus button').forEach(b => {
    const aktiv = b.dataset.fokus === fokus();
    b.classList.toggle('active', aktiv);
    b.setAttribute('aria-pressed', aktiv);
  });
}

function setzeFokus(f) {
  Store.data.settings.fokus = f;
  Store.save();
  renderHome();
}

/* Schalter „Nur meine Kurszeichen" samt Anzeige der betroffenen Zeichen */
function renderCourseMode() {
  const toggle = $('#toggle-course');
  const list = $('#course-chars');
  const verfuegbar = typeof COURSE_CHARS !== 'undefined' && COURSE_CHARS.length;

  // Ohne kurs.js gibt es nichts zu filtern — Schalter ausblenden.
  toggle.closest('.switch').hidden = !verfuegbar;
  if (!verfuegbar) { list.innerHTML = ''; return; }

  toggle.checked = Boolean(Store.data.settings.courseOnly);

  // Bei „Kanji" ist der Kana-Schalter bedeutungslos — ausblenden.
  toggle.closest('.switch').hidden = fokus() === 'kanji';

  list.innerHTML = '';
  list.hidden = !toggle.checked && fokus() !== 'kanji';
  if (kanjiImFokus()) {
    vocabList('kanji').forEach(k => {
      const chip = el('span', 'course-chip kanji-chip', k.kanji);
      chip.title = `${k.lesung} — ${k.deutsch}`;
      list.append(chip);
    });
  }
  if (toggle.checked && fokus() !== 'kanji') {
    const f = fokus();
    COURSE_CHARS.filter(ch => f === 'alle' || (CHAR_MAP[ch] && CHAR_MAP[ch].script === f)).forEach(ch => {
      const eintrag = CHAR_MAP[ch];
      const chip = el('span', 'course-chip', ch);
      if (eintrag) chip.title = `${eintrag.r} — ${eintrag.m}`;
      list.append(chip);
    });
  }

  const note = $('#lesson-note');
  note.textContent = toggle.checked
    ? 'Im Kursmodus inaktiv: geübt wird nur die Auswahl oben. Schalter ausmachen, um nach Reihen zu lernen.'
    : 'Schalte eine neue Reihe erst frei, wenn die vorherige bei ca. 80 % steht.';
  $('#lesson-list').classList.toggle('inactive', toggle.checked);
}

function renderLessonList() {
  const box = $('#lesson-list');
  box.innerHTML = '';

  LESSONS.forEach(lesson => {
    const unlocked = Store.data.unlockedLessons.includes(lesson.id);
    const row = el('div', 'lesson' + (unlocked ? '' : ' locked'));

    const head = el('div', 'lesson-head');
    head.append(el('span', 'lesson-title', lesson.title));
    head.append(el('span', 'lesson-chars', lesson.chars.map(c => c.c).join(' ')));
    row.append(head);

    if (unlocked) {
      const pct = lessonProgress(lesson);
      const bar = el('div', 'bar');
      const fill = el('div', 'bar-fill');
      fill.style.width = pct + '%';
      bar.append(fill);
      row.append(bar);
      row.append(el('span', 'lesson-pct', pct + '% sicher'));

      const btn = el('button', 'ghost', 'Zeichen ansehen');
      btn.onclick = () => openLesson(lesson);
      row.append(btn);
    } else {
      const btn = el('button', 'ghost', 'Freischalten');
      btn.onclick = () => { unlockLesson(lesson.id); renderHome(); };
      row.append(btn);
    }

    box.append(row);
  });
}

/* Lektions-Detail: alle Zeichen mit Eselsbrücke zum Nachlesen */
function openLesson(lesson) {
  const box = $('#lesson-detail');
  box.innerHTML = '';
  box.append(el('h2', null, lesson.title));

  lesson.chars.forEach(c => {
    const card = el('div', 'study-card');
    card.append(el('div', 'study-char', c.c));
    const body = el('div', 'study-body');
    body.append(el('div', 'study-romaji', c.r));
    body.append(el('div', 'study-mnemonic', c.m));
    const merkhilfe = kursMerkhilfe(c);
    if (merkhilfe) body.append(merkhilfe);
    if (c.s && c.s.length) {
      body.append(el('div', 'study-similar', 'Nicht verwechseln mit: ' + c.s.join(' ')));
    }
    card.append(body);
    box.append(card);
  });

  const back = el('button', 'ghost', '← Zurück');
  back.onclick = () => show('home');
  box.append(back);

  show('lesson');
}

// ------------------------------------------------------------------- Session

function startSession(customQueue) {
  const queue = customQueue || buildSession();
  if (!queue.length) {
    alert(fokus() === 'kanji'
      ? 'Keine Kanji fällig. Nutze „Freies Üben", um trotzdem welche zu wiederholen.'
      : 'Nichts fällig. Schalte unten eine neue Lektion frei oder nutze „Freies Üben".');
    return;
  }
  session = { queue, index: 0, right: 0, wrong: 0 };
  show('session');
  nextQuestion();
}

/* Freies Üben: alles Freigeschaltete, egal ob fällig */
function startFreePractice() {
  const kanji = kanjiImFokus() ? vocabList('kanji').map(alsKanjiFrage) : [];
  const pool = shuffle([...fokusChars(), ...kanji]).slice(0, 20);
  startSession(pool);
}

/* Gezielt die Problemzeichen */
function startWeakPractice() {
  const weak = fokus() === 'kanji' ? weakestKanji(10)
    : [...weakestChars(10), ...(kanjiImFokus() ? weakestKanji(5) : [])];
  if (!weak.length) {
    alert('Noch keine Problemzeichen erkannt — üb erst ein paar normale Runden.');
    return;
  }
  startSession(shuffle(weak));
}

function pickMode(char) {
  if (char.typ === 'kanji') return 'kanji';
  const card = Store.data.cards[char.c];
  if (!card || card.seen === 0) return 'intro';
  if (card.box <= 1) return 'mc-read';
  if (card.box <= 3) return Math.random() < 0.5 ? 'mc-read' : 'mc-write';
  return 'type';
}

/* Ablenker: erst optisch ähnliche Zeichen, dann Zufall aus derselben Schrift */
function distractors(target, count) {
  const picked = [];
  const seen = new Set([target.r]);

  const pool = distractorPool(target.script);
  const erlaubt = new Set(pool.map(c => c.c));

  // Optisch ähnliche Zeichen zuerst — das trainiert genau die Verwechslungen.
  // Im Kursmodus nur solche, die auch im Kurs vorkamen: sonst stünden auf
  // einmal Zeichen zur Auswahl, die sie noch nie gesehen hat.
  let similar = (target.s || []).map(ch => CHAR_MAP[ch]).filter(Boolean);
  if (courseModeActive()) similar = similar.filter(c => erlaubt.has(c.c));

  for (const c of shuffle(similar)) {
    if (picked.length >= count) break;
    if (!seen.has(c.r)) { picked.push(c); seen.add(c.r); }
  }

  for (const c of shuffle(pool)) {
    if (picked.length >= count) break;
    if (!seen.has(c.r)) { picked.push(c); seen.add(c.r); }
  }
  return picked;
}

/* Merkhilfe aus dem Lehrbuch, falls es für das Zeichen eine gibt.
 * Sie zielt auf den Klang, meine Eselsbrücke auf die Form — beide zeigen. */
function kursMerkhilfe(char) {
  if (!char.km) return null;
  const box = el('div', 'kurs-merkhilfe');
  box.append(el('span', 'kurs-label', 'Im Kurs: '));
  box.append(el('span', 'kurs-wort', char.km));
  return box;
}

/* Verwechslungshinweise, die für sie gerade Sinn ergeben. Im Kursmodus
 * bringt „ähnlich zu ほ" nichts, wenn ほ noch nie im Kurs vorkam. */
function relevantSimilar(char) {
  const alle = char.s || [];
  if (!courseModeActive()) return alle;
  return alle.filter(ch => COURSE_CHARS.includes(ch));
}

function nextQuestion() {
  if (session.index >= session.queue.length) return finishSession();

  const char = session.queue[session.index];
  const mode = pickMode(char);
  const box = $('#question');
  box.innerHTML = '';

  // Nach dem Antworten steht die Seite unten beim Weiter-Knopf. Ohne das hier
  // erschiene die nächste Frage oberhalb des Bildschirmrands.
  zumSeitenanfang();

  $('#progress-fill').style.width =
    Math.round((session.index / session.queue.length) * 100) + '%';
  $('#session-count').textContent = `${session.index + 1} / ${session.queue.length}`;

  if (char.typ === 'kanji') return renderKanjiFrage(char, box);
  if (mode === 'intro') return renderIntro(char, box);
  if (mode === 'type') return renderTyping(char, box);
  renderMultipleChoice(char, box, mode);
}

/* Neues Zeichen zuerst in Ruhe vorstellen */
function renderIntro(char, box) {
  box.append(el('div', 'prompt-label', 'Neues Zeichen'));
  box.append(el('div', 'big-char', char.c));
  box.append(el('div', 'big-romaji', char.r));
  box.append(el('div', 'mnemonic', char.m));
  const merkhilfe = kursMerkhilfe(char);
  if (merkhilfe) box.append(merkhilfe);
  const aehnlich = relevantSimilar(char);
  if (aehnlich.length) {
    box.append(el('div', 'similar-warn', 'Achtung, ähnlich: ' + aehnlich.join(' ')));
  }

  const btn = el('button', 'primary weiter', 'Verstanden — abfragen');
  btn.onclick = () => {
    cardFor(char.c).seen = 0; // Intro zählt noch nicht als Wiederholung
    box.innerHTML = '';
    renderMultipleChoice(char, box, 'mc-read');
  };
  box.append(btn);
  btn.focus({ preventScroll: true });
}

function renderMultipleChoice(char, box, mode) {
  const readMode = mode === 'mc-read';
  box.append(el('div', 'prompt-label',
    readMode ? 'Wie wird das gelesen?' : 'Welches Zeichen ist das?'));
  box.append(el('div', 'big-char' + (readMode ? '' : ' as-romaji'),
    readMode ? char.c : char.r));

  const options = shuffle([char, ...distractors(char, 3)]);
  const grid = el('div', 'options');

  options.forEach((opt, i) => {
    const btn = el('button', 'option');
    btn.append(el('span', 'option-key', String(i + 1)));
    btn.append(el('span', 'option-text', readMode ? opt.r : opt.c));
    btn.onclick = () => answer(char, opt.r === char.r, box, readMode ? opt.r : opt.c, 'gewählt');
    grid.append(btn);
  });

  box.append(grid);
  box.dataset.optionCount = options.length;
}

function renderTyping(char, box) {
  box.append(el('div', 'prompt-label', 'Tippe die Umschrift'));
  box.append(el('div', 'big-char', char.c));

  const form = el('form', 'type-form');
  const input = el('input', 'type-input');
  input.type = 'text';
  input.autocapitalize = 'off';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.inputMode = 'latin';
  input.enterKeyHint = 'go'; // Handytastatur: „Los" schickt ab, kein Zielen nötig
  input.placeholder = 'z. B. ka';
  form.append(input);
  form.onsubmit = e => {
    e.preventDefault();
    const given = input.value.trim().toLowerCase();
    if (!given) return;
    answer(char, given === char.r, box, given);
  };
  box.append(form);
  input.focus();
}

function answer(char, correct, box, given, wie = 'getippt') {
  grade(char.c, correct);
  correct ? session.right++ : session.wrong++;

  box.querySelectorAll('button, input').forEach(n => n.disabled = true);
  // Antwortknöpfe bzw. Eingabefeld werden nicht mehr gebraucht — weg damit,
  // sonst schiebt die Auswertung den Weiter-Knopf unter den Bildschirmrand.
  // Was gewählt wurde, steht im Feedback.
  box.querySelectorAll('.options, .type-form').forEach(n => n.hidden = true);

  const fb = el('div', 'feedback ' + (correct ? 'ok' : 'bad'));
  fb.append(el('div', 'feedback-head', correct ? 'Richtig!' : 'Nicht ganz'));

  if (!correct) {
    const line = el('div', 'feedback-answer');
    line.append(el('span', 'fb-char', char.c));
    line.append(el('span', 'fb-eq', '='));
    line.append(el('span', 'fb-romaji', char.r));
    fb.append(line);
    if (given) fb.append(el('div', 'muted', `Du hattest „${given}" ${wie}.`));
    fb.append(el('div', 'mnemonic', char.m));
    const merkhilfe = kursMerkhilfe(char);
    if (merkhilfe) fb.append(merkhilfe);
    const aehnlich = relevantSimilar(char);
    if (aehnlich.length) {
      fb.append(el('div', 'similar-warn', 'Ähnlich, aber anders: ' + aehnlich.join(' ')));
    }
    // Falsch beantwortet -> später in dieser Runde nochmal
    session.queue.push(char);
  }

  const btn = el('button', 'primary weiter', 'Weiter');
  btn.onclick = () => { session.index++; nextQuestion(); };
  fb.append(btn);
  box.append(fb);
  zeigeAuswertung(fb, btn);
}

/* Kanji in der Runde: Karteikarte wie im Kanji-Reiter. Umdrehen mit
 * Enter/Leertaste, bewerten mit 1 (gewusst) und 2 (nicht gewusst) — die
 * beiden Knöpfe sind .option, damit die Zifferntasten der Runde greifen. */
function renderKanjiFrage(k, box) {
  box.append(el('div', 'prompt-label', 'Lesung und Bedeutung?'));
  box.append(el('div', 'kanji-zeichen', k.kanji));

  const flip = el('button', 'primary weiter', 'Umdrehen');
  flip.onclick = () => {
    flip.remove();
    const rueck = el('div', 'kanji-rueckseite');
    if (k.lesung) rueck.append(el('div', 'kanji-lesung', k.lesung));
    rueck.append(el('div', 'vocab-deutsch' + laengenKlasse(k.deutsch, 14, 99), k.deutsch));
    if (k.beispiele) {
      const liste = el('ul', 'kanji-beispiele');
      k.beispiele.split('·').map(b => b.trim()).filter(Boolean)
        .forEach(b => liste.append(el('li', '', b)));
      rueck.append(liste);
    }
    if (k.notiz) rueck.append(el('div', 'vocab-notiz muted', k.notiz));

    const grid = el('div', 'options kanji-bewertung');
    [['Gewusst', true], ['Nicht gewusst', false]].forEach(([text, richtig], i) => {
      const b = el('button', 'option');
      b.append(el('span', 'option-key', String(i + 1)));
      b.append(el('span', 'option-text', text));
      b.onclick = () => kanjiBewerten(k, richtig, box);
      grid.append(b);
    });
    rueck.append(grid);
    box.append(rueck);
    zeigeAuswertung(rueck, grid.querySelector('button'));
  };
  box.append(flip);
  flip.focus({ preventScroll: true });
}

function kanjiBewerten(k, richtig, box) {
  gradeVocab(vocabId(k), richtig, 'kanji');
  richtig ? session.right++ : session.wrong++;
  if (!richtig) session.queue.push(k); // später in dieser Runde nochmal
  session.index++;
  nextQuestion();
}

function finishSession() {
  const total = session.right + session.wrong;
  const pct = total ? Math.round((session.right / total) * 100) : 0;

  const box = $('#question');
  box.innerHTML = '';
  box.append(el('div', 'prompt-label', 'Runde geschafft'));
  box.append(el('div', 'big-romaji', pct + '%'));
  box.append(el('div', 'muted', `${session.right} richtig, ${session.wrong} daneben`));

  let note = 'Weiter so — morgen kommt die Wiederholung.';
  if (pct === 100) note = 'Perfekt! Schalt ruhig die nächste Lektion frei.';
  else if (pct < 60) note = 'Das war zäh. Schau dir die Zeichen nochmal in der Lektionsansicht an, bevor du weitermachst.';
  box.append(el('div', 'mnemonic', note));

  const again = el('button', 'primary', 'Noch eine Runde');
  again.onclick = () => startSession();
  const home = el('button', 'ghost', 'Zur Übersicht');
  home.onclick = () => { session = null; renderHome(); show('home'); };
  box.append(again);
  box.append(home);

  $('#progress-fill').style.width = '100%';
  session = null;
}

// ---------------------------------------------------------------- Lesemodus

let currentWord = null;

function renderWords() {
  const pool = availableWords();
  const hint = $('#words-hint');
  const panel = $('#words-panel');

  if (!pool.length) {
    panel.hidden = true;
    hint.textContent = 'Mit deinen aktuellen Zeichen lässt sich noch kein ganzes Wort bilden. Sobald ein paar mehr dazukommen, tauchen hier automatisch welche auf.';
    return;
  }

  panel.hidden = false;
  updateWordsHint();
  nextWord();
}

function updateWordsHint() {
  const pool = availableWords();
  const geuebt = pool.filter(e => Store.data.words[e.w]).length;
  $('#words-hint').textContent =
    `${pool.length} Wörter kannst du gerade vollständig lesen — ${geuebt} davon schon geübt.`;
}

function nextWord() {
  currentWord = pickWord(currentWord && currentWord.w);
  if (!currentWord) return;

  zumSeitenanfang(); // sonst bliebe die Seite unten bei der alten Auswertung

  const anzeige = $('#word-display');
  anzeige.className = 'big-char word' + laengenKlasse(currentWord.w, 4, 5);
  anzeige.textContent = currentWord.w;
  $('#word-feedback').innerHTML = '';

  const input = $('#word-input');
  input.value = '';
  input.disabled = false;
  $('#word-form').querySelector('button').disabled = false;
  input.focus();
}

function checkWord() {
  if (!currentWord) return;
  const input = $('#word-input');
  const eingabe = input.value.trim();
  if (!eingabe) return;

  const richtig = wordAnswerCorrect(currentWord, eingabe);
  gradeWord(currentWord.w, richtig);
  updateWordsHint();

  input.disabled = true;
  $('#word-form').querySelector('button').disabled = true;

  const fb = $('#word-feedback');
  fb.innerHTML = '';
  const box = el('div', 'feedback ' + (richtig ? 'ok' : 'bad'));
  box.append(el('div', 'feedback-head', richtig ? 'Richtig gelesen!' : 'Noch nicht'));

  if (!richtig) {
    // Wort über Umschrift statt nebeneinander: mehrsilbige Wörter passen
    // sonst auf schmalen Displays nicht in eine Zeile.
    const zeile = el('div', 'feedback-answer stacked');
    zeile.append(el('span', 'fb-char fb-word', currentWord.w));
    zeile.append(el('span', 'fb-romaji', currentWord.r));
    box.append(zeile);
    box.append(el('div', 'muted', `Du hattest „${eingabe}" getippt.`));
    box.append(zeichenAufschluesselung(currentWord));
  }

  const bedeutung = el('div', 'mnemonic');
  bedeutung.append(el('strong', null, currentWord.d));
  if (currentWord.k) bedeutung.append(el('span', 'word-kanji', ' — mit Kanji: ' + currentWord.k));
  box.append(bedeutung);

  const weiter = el('button', 'primary weiter', 'Nächstes Wort');
  weiter.onclick = nextWord;
  box.append(weiter);

  fb.append(box);
  zeigeAuswertung(box, weiter);
}

/* Wort in seine Zeichen zerlegen — zeigt, an welcher Stelle es hakte */
function zeichenAufschluesselung(eintrag) {
  const zeile = el('div', 'word-breakdown');
  [...eintrag.w].forEach(z => {
    const teil = el('span', 'breakdown-part');
    teil.append(el('span', 'breakdown-char', z));
    teil.append(el('span', 'breakdown-romaji', CHAR_MAP[z] ? CHAR_MAP[z].r : '?'));
    zeile.append(teil);
  });
  return zeile;
}

// -------------------------------------------------------- Vokabeltrainer

let currentVocab = null;
let currentDirection = 'jp-de';

function renderVocab() {
  const stats = vocabStats();
  const panel = $('#vocab-panel');

  if (!stats.gesamt) {
    panel.hidden = true;
    $('#vocab-hint').textContent =
      'Noch keine Vokabeln vorhanden. Leg Fotos oder Listen in kursmaterial/Vokabeln/ ab und lass „vokabeln-aktualisieren.py" laufen.';
    return;
  }

  panel.hidden = false;
  updateVocabHint();
  nextVocabCard();
}

function updateVocabHint() {
  const s = vocabStats();
  const teile = [`${s.gesamt} Vokabeln`];
  if (s.faellig) teile.push(`${s.faellig} fällig`);
  if (s.neu) teile.push(`${s.neu} neu`);
  teile.push(`${s.sicher} sitzen sicher`);
  $('#vocab-hint').textContent = teile.join(' · ');
}

function nextVocabCard() {
  currentVocab = nextVocab(currentVocab && vocabId(currentVocab));
  if (!currentVocab) return;

  const id = vocabId(currentVocab);
  currentDirection = vocabDirection(id);

  $('#vocab-direction').textContent =
    currentDirection === 'jp-de' ? 'Was heißt das?' : 'Wie heißt das auf Japanisch?';

  const front = $('#vocab-front');
  const back = $('#vocab-back');
  front.innerHTML = '';
  back.innerHTML = '';
  back.hidden = true;

  if (currentDirection === 'jp-de') {
    front.append(japanischeSeite(currentVocab, true));
    back.append(deutscheSeite(currentVocab));
  } else {
    front.append(deutscheSeite(currentVocab));
    back.append(japanischeSeite(currentVocab, false));
  }

  $('#vocab-actions').hidden = false;
  $('#vocab-grade').hidden = true;
  $('#vocab-flip').focus();
}

/* Schriftgröße nach Länge staffeln, damit nichts über mehrere Zeilen bricht */
function laengenKlasse(text, mittel, gross) {
  if (text.length > gross) return ' sehr-lang';
  if (text.length > mittel) return ' lang';
  return '';
}

function japanischeSeite(v, alsFrage) {
  const box = el('div', 'vocab-jp');
  if (v.kana) box.append(el('div', 'vocab-kana' + laengenKlasse(v.kana, 7, 12), v.kana));
  if (v.kanji) box.append(el('div', 'vocab-kanji', v.kanji));
  if (v.romaji) box.append(el('div', 'vocab-romaji', v.romaji));

  // さん heißt „drei" UND „Herr/Frau". Wird danach gefragt, muss dabeistehen,
  // welche der beiden gemeint ist — sonst ist die Frage nicht beantwortbar.
  if (alsFrage && vocabHomographen(v).length) {
    box.append(el('div', 'vocab-disambig', v.notiz || 'mehrdeutig'));
  }
  return box;
}

function deutscheSeite(v) {
  const box = el('div', 'vocab-de');
  box.append(el('div', 'vocab-deutsch' + laengenKlasse(v.deutsch, 14, 99), v.deutsch));
  if (v.notiz) box.append(el('div', 'vocab-notiz muted', v.notiz));
  return box;
}

function flipVocab() {
  if (!currentVocab) return;
  $('#vocab-back').hidden = false;
  $('#vocab-actions').hidden = true;
  $('#vocab-grade').hidden = false;
  $('#vocab-known').focus();
}

function gradeVocabCard(richtig) {
  if (!currentVocab || $('#vocab-back').hidden) return;
  gradeVocab(vocabId(currentVocab), richtig);
  updateVocabHint();
  renderHeader();
  nextVocabCard();
}

// ------------------------------------------------------------------ Kanji

/* Kanji als Karteikarten, nur in eine Richtung: Kanji sehen, Lesung und
 * Bedeutung wissen. Schreiben wird hier bewusst nicht abgefragt. Lernstand
 * und Leitner-Logik wie bei den Vokabeln, nur im eigenen Stapel 'kanji'. */

let currentKanji = null;

function renderKanji() {
  const stats = vocabStats('kanji');
  const panel = $('#kanji-panel');

  if (!stats.gesamt) {
    panel.hidden = true;
    $('#kanji-hint').textContent =
      'Noch keine Kanji vorhanden. Trag sie in kursmaterial/Kanji/ ein und lass „vokabeln-aktualisieren.py" laufen.';
    return;
  }

  panel.hidden = false;
  updateKanjiHint();
  nextKanjiCard();
}

function updateKanjiHint() {
  const s = vocabStats('kanji');
  const teile = [`${s.gesamt} Kanji`];
  if (s.faellig) teile.push(`${s.faellig} fällig`);
  if (s.neu) teile.push(`${s.neu} neu`);
  teile.push(`${s.sicher} sitzen sicher`);
  $('#kanji-hint').textContent = teile.join(' · ');
}

function nextKanjiCard() {
  currentKanji = nextVocab(currentKanji && vocabId(currentKanji), 'kanji');
  if (!currentKanji) return;

  const front = $('#kanji-front');
  const back = $('#kanji-back');
  front.innerHTML = '';
  back.innerHTML = '';
  back.hidden = true;

  front.append(el('div', 'kanji-zeichen', currentKanji.kanji));

  if (currentKanji.lesung) back.append(el('div', 'kanji-lesung', currentKanji.lesung));
  back.append(el('div', 'vocab-deutsch' + laengenKlasse(currentKanji.deutsch, 14, 99), currentKanji.deutsch));
  if (currentKanji.beispiele) {
    const liste = el('ul', 'kanji-beispiele');
    currentKanji.beispiele.split('·').map(b => b.trim()).filter(Boolean)
      .forEach(b => liste.append(el('li', '', b)));
    back.append(liste);
  }
  if (currentKanji.notiz) back.append(el('div', 'vocab-notiz muted', currentKanji.notiz));

  $('#kanji-actions').hidden = false;
  $('#kanji-grade').hidden = true;
  $('#kanji-flip').focus();
}

function flipKanji() {
  if (!currentKanji) return;
  $('#kanji-back').hidden = false;
  $('#kanji-actions').hidden = true;
  $('#kanji-grade').hidden = false;
  $('#kanji-known').focus();
}

function gradeKanjiCard(richtig) {
  if (!currentKanji || $('#kanji-back').hidden) return;
  gradeVocab(vocabId(currentKanji), richtig, 'kanji');
  updateKanjiHint();
  renderHeader();
  nextKanjiCard();
}

// ------------------------------------------------------------- Schreibübung

function initWriting() {
  const canvas = $('#write-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let current = null;

  /* Canvas auf die tatsächliche Anzeigegröße bringen (scharf auf Retina).
   * Der Inhalt geht dabei verloren — das ist beim Größenwechsel okay. */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return; // noch unsichtbar
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // nicht scale(), sonst multipliziert es sich auf
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#222';
  }
  resizeWriteCanvas = resize;

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }

  function start(e) { e.preventDefault(); drawing = true; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }
  function move(e)  { if (!drawing) return; e.preventDefault(); const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); }
  function end()    { drawing = false; }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

  function newChar() {
    const pool = unlockedChars();
    current = pool[Math.floor(Math.random() * pool.length)];
    $('#write-prompt').textContent = current.r;
    $('#write-reveal').textContent = '';
    $('#write-mnemonic').textContent = '';
    clear();
  }

  $('#write-clear').onclick = clear;
  $('#write-next').onclick = newChar;
  $('#write-show').onclick = () => {
    if (!current) return;
    $('#write-reveal').textContent = current.c;
    $('#write-mnemonic').textContent = current.m;
  };

  window.addEventListener('resize', () => {
    if (!$('#view-write').hidden) resize();
  });

  newChar();
}

// ----------------------------------------------------------------- Sicherung

function backupMsg(text) {
  const n = $('#backup-msg');
  n.textContent = text;
  clearTimeout(backupMsg.timer);
  backupMsg.timer = setTimeout(() => { n.textContent = ''; }, 6000);
}

function exportProgress() {
  const payload = JSON.stringify({ version: 1, exported: new Date().toISOString(), data: Store.data }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `kana-fortschritt-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  backupMsg('Sicherung gespeichert. Leg sie am besten in iCloud ab.');
}

/* Gemeinsamer Weg für Datei und Zwischenablage: Text einlesen, prüfen,
 * mit dem lokalen Stand zusammenführen. */
function applyProgressText(text) {
  let incoming;
  try {
    const parsed = JSON.parse(text);
    incoming = parsed.data || parsed; // auch rohe Store-Daten akzeptieren
    if (!incoming || typeof incoming.cards !== 'object') throw new Error('Format');
  } catch {
    backupMsg('Das konnte ich nicht lesen — ist der Text vollständig kopiert?');
    return false;
  }

  const { data, uebernommen } = Store.mergeProgress(incoming);
  Store.data = data;
  Store.save();
  renderHome();

  backupMsg(uebernommen
    ? `Abgeglichen: ${uebernommen} ${uebernommen === 1 ? 'Karte war' : 'Karten waren'} auf dem anderen Gerät weiter.`
    : 'Abgeglichen — hier war schon alles auf dem neusten Stand.');
  return true;
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => applyProgressText(reader.result);
  reader.readAsText(file);
}

function progressText() {
  return JSON.stringify({ version: 1, exported: new Date().toISOString(), data: Store.data });
}

function zeigeTransferBox(inhalt) {
  const box = $('#transfer-box');
  const feld = $('#transfer-text');
  feld.value = inhalt;
  box.hidden = false;
  feld.focus();
  if (inhalt) feld.select();
}

async function copyProgress() {
  const text = progressText();
  try {
    await navigator.clipboard.writeText(text);
    backupMsg('Kopiert. Schick ihn dir jetzt aufs andere Gerät und füge ihn dort ein.');
  } catch {
    // Zwischenablage ist ohne HTTPS oder ohne Erlaubnis gesperrt — dann den
    // Text markiert anzeigen, damit sie ihn von Hand kopieren kann.
    zeigeTransferBox(text);
    backupMsg('Zwischenablage gesperrt — Text ist markiert, bitte von Hand kopieren.');
  }
}

// ------------------------------------------------------------------ Tastatur

/* Vokabelkarten: Leertaste dreht um, 1 und 2 bewerten. */
document.addEventListener('keydown', e => {
  if ($('#view-vocab').hidden || document.activeElement.tagName === 'INPUT') return;

  if (e.key === ' ' || e.key === 'Enter') {
    if (!$('#vocab-actions').hidden) { e.preventDefault(); flipVocab(); }
    return;
  }
  if ($('#vocab-grade').hidden) return;
  if (e.key === '1') { e.preventDefault(); gradeVocabCard(true); }
  if (e.key === '2') { e.preventDefault(); gradeVocabCard(false); }
});

/* Kanjikarten: dieselben Tasten wie bei den Vokabeln. */
document.addEventListener('keydown', e => {
  if ($('#view-kanji').hidden || document.activeElement.tagName === 'INPUT') return;

  if (e.key === ' ' || e.key === 'Enter') {
    if (!$('#kanji-actions').hidden) { e.preventDefault(); flipKanji(); }
    return;
  }
  if ($('#kanji-grade').hidden) return;
  if (e.key === '1') { e.preventDefault(); gradeKanjiCard(true); }
  if (e.key === '2') { e.preventDefault(); gradeKanjiCard(false); }
});

document.addEventListener('keydown', e => {
  if ($('#view-session').hidden) return;
  const box = $('#question');

  if (e.key === 'Enter' || e.key === ' ') {
    const primary = box.querySelector('button.primary:not([disabled])');
    if (primary && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      primary.click();
    }
    return;
  }

  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 4) {
    const opts = box.querySelectorAll('button.option:not([disabled])');
    if (opts[n - 1]) { e.preventDefault(); opts[n - 1].click(); }
  }
});

// --------------------------------------------------------------------- Start

function init() {
  Store.load();

  document.querySelectorAll('nav button').forEach(b => {
    b.onclick = () => {
      if (b.dataset.view === 'home') renderHome();
      if (b.dataset.view === 'words') renderWords();
      if (b.dataset.view === 'vocab') renderVocab();
      if (b.dataset.view === 'kanji') renderKanji();
      show(b.dataset.view);
    };
  });

  $('#word-form').onsubmit = e => { e.preventDefault(); checkWord(); };

  $('#vocab-flip').onclick = flipVocab;
  $('#vocab-known').onclick = () => gradeVocabCard(true);
  $('#vocab-unknown').onclick = () => gradeVocabCard(false);

  $('#kanji-flip').onclick = flipKanji;
  $('#kanji-known').onclick = () => gradeKanjiCard(true);
  $('#kanji-unknown').onclick = () => gradeKanjiCard(false);

  document.querySelectorAll('#fokus button').forEach(b => {
    b.onclick = () => setzeFokus(b.dataset.fokus);
  });

  $('#btn-start').onclick = () => startSession();
  $('#btn-free').onclick = startFreePractice;
  $('#btn-weak').onclick = startWeakPractice;
  $('#btn-quit').onclick = () => { session = null; renderHome(); show('home'); };

  $('#toggle-course').onchange = e => {
    Store.data.settings.courseOnly = e.target.checked;
    Store.save();
    renderHome();
  };

  $('#btn-copy').onclick = copyProgress;
  $('#btn-paste').onclick = () => zeigeTransferBox('');
  $('#btn-transfer-cancel').onclick = () => { $('#transfer-box').hidden = true; };
  $('#btn-transfer-ok').onclick = () => {
    const text = $('#transfer-text').value.trim();
    if (!text) { backupMsg('Da ist noch nichts eingefügt.'); return; }
    if (applyProgressText(text)) {
      $('#transfer-text').value = ''; // keine Kopie des Lernstands im Formular lassen
      $('#transfer-box').hidden = true;
    }
  };

  $('#btn-export').onclick = exportProgress;
  $('#btn-import').onclick = () => $('#import-file').click();
  $('#import-file').onchange = e => {
    if (e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = ''; // gleiche Datei soll erneut wählbar sein
  };

  $('#btn-reset').onclick = () => {
    if (confirm('Wirklich den gesamten Lernfortschritt löschen?')) {
      Store.reset();
      renderHome();
    }
  };

  initWriting();
  renderHome();
  show('home');
}

document.addEventListener('DOMContentLoaded', init);
