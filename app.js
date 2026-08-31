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

function show(view) {
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  $('#view-' + view).hidden = false;
  document.querySelectorAll('nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));

  // Das Canvas hat nur eine messbare Größe, wenn es sichtbar ist.
  if (view === 'write' && resizeWriteCanvas) resizeWriteCanvas();
}

function renderHeader() {
  const due = dueChars().length;
  const fresh = newChars().length;
  $('#stat-streak').textContent = streak();
  $('#stat-due').textContent = due;
  $('#stat-new').textContent = fresh;
}

// ---------------------------------------------------------------- Startseite

function renderHome() {
  renderHeader();
  renderCourseMode();

  const due = dueChars().length;
  const fresh = Math.min(newChars().length, Store.data.settings.newPerSession);
  const hint = $('#session-hint');

  if (due + fresh === 0) {
    hint.textContent = 'Alles wiederholt für heute. Du kannst trotzdem freies Üben starten oder eine neue Lektion freischalten.';
  } else {
    const parts = [];
    if (due) parts.push(`${due} zur Wiederholung`);
    if (fresh) parts.push(`${fresh} neu`);
    hint.textContent = parts.join(' · ');
  }

  // Schwache Zeichen
  const weak = weakestChars(8);
  const weakBox = $('#weak-list');
  weakBox.innerHTML = '';
  if (weak.length === 0) {
    weakBox.append(el('p', 'muted', 'Noch keine Problemzeichen — üb ein paar Runden, dann zeige ich dir hier, wo es hakt.'));
  } else {
    weak.forEach(w => {
      const item = el('div', 'weak-item');
      item.append(el('span', 'weak-char', w.c));
      item.append(el('span', 'weak-romaji', w.r));
      const pct = Math.round(w.rate * 100);
      item.append(el('span', 'weak-rate', pct + '%'));
      item.title = w.m;
      weakBox.append(item);
    });
  }

  renderLessonList();
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

  list.innerHTML = '';
  list.hidden = !toggle.checked;
  if (toggle.checked) {
    COURSE_CHARS.forEach(ch => {
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
    alert('Nichts fällig. Schalte unten eine neue Lektion frei oder nutze „Freies Üben".');
    return;
  }
  session = { queue, index: 0, right: 0, wrong: 0 };
  show('session');
  nextQuestion();
}

/* Freies Üben: alles Freigeschaltete, egal ob fällig */
function startFreePractice() {
  const pool = shuffle(unlockedChars()).slice(0, 20);
  startSession(pool);
}

/* Gezielt die Problemzeichen */
function startWeakPractice() {
  const weak = weakestChars(10);
  if (!weak.length) {
    alert('Noch keine Problemzeichen erkannt — üb erst ein paar normale Runden.');
    return;
  }
  startSession(shuffle(weak));
}

function pickMode(char) {
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

  $('#progress-fill').style.width =
    Math.round((session.index / session.queue.length) * 100) + '%';
  $('#session-count').textContent = `${session.index + 1} / ${session.queue.length}`;

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
  const aehnlich = relevantSimilar(char);
  if (aehnlich.length) {
    box.append(el('div', 'similar-warn', 'Achtung, ähnlich: ' + aehnlich.join(' ')));
  }

  const btn = el('button', 'primary', 'Verstanden — abfragen');
  btn.onclick = () => {
    cardFor(char.c).seen = 0; // Intro zählt noch nicht als Wiederholung
    box.innerHTML = '';
    renderMultipleChoice(char, box, 'mc-read');
  };
  box.append(btn);
  btn.focus();
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
    btn.onclick = () => answer(char, opt.r === char.r, box);
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

function answer(char, correct, box, given) {
  grade(char.c, correct);
  correct ? session.right++ : session.wrong++;

  box.querySelectorAll('button, input').forEach(n => n.disabled = true);

  const fb = el('div', 'feedback ' + (correct ? 'ok' : 'bad'));
  fb.append(el('div', 'feedback-head', correct ? 'Richtig!' : 'Nicht ganz'));

  if (!correct) {
    const line = el('div', 'feedback-answer');
    line.append(el('span', 'fb-char', char.c));
    line.append(el('span', 'fb-eq', '='));
    line.append(el('span', 'fb-romaji', char.r));
    fb.append(line);
    if (given) fb.append(el('div', 'muted', `Du hattest „${given}" getippt.`));
    fb.append(el('div', 'mnemonic', char.m));
    const aehnlich = relevantSimilar(char);
    if (aehnlich.length) {
      fb.append(el('div', 'similar-warn', 'Ähnlich, aber anders: ' + aehnlich.join(' ')));
    }
    // Falsch beantwortet -> später in dieser Runde nochmal
    session.queue.push(char);
  }

  const btn = el('button', 'primary', 'Weiter');
  btn.onclick = () => { session.index++; nextQuestion(); };
  fb.append(btn);
  box.append(fb);
  btn.focus();
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

  $('#word-display').textContent = currentWord.w;
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

  const weiter = el('button', 'primary', 'Nächstes Wort');
  weiter.onclick = nextWord;
  box.append(weiter);

  fb.append(box);
  weiter.focus();
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
    front.append(japanischeSeite(currentVocab));
    back.append(deutscheSeite(currentVocab));
  } else {
    front.append(deutscheSeite(currentVocab));
    back.append(japanischeSeite(currentVocab));
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

function japanischeSeite(v) {
  const box = el('div', 'vocab-jp');
  if (v.kana) box.append(el('div', 'vocab-kana' + laengenKlasse(v.kana, 7, 12), v.kana));
  if (v.kanji) box.append(el('div', 'vocab-kanji', v.kanji));
  if (v.romaji) box.append(el('div', 'vocab-romaji', v.romaji));
  return box;
}

function deutscheSeite(v) {
  const box = el('div', 'vocab-de');
  box.append(el('div', 'vocab-deutsch' + laengenKlasse(v.deutsch, 14, 99), v.deutsch));
  if (v.notiz) box.append(el('div', 'muted', v.notiz));
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

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.data || parsed; // auch rohe Store-Daten akzeptieren
      if (!incoming || typeof incoming.cards !== 'object') throw new Error('Format');

      const count = Object.keys(incoming.cards).length;
      if (!confirm(`Sicherung mit ${count} geübten Zeichen gefunden. Deinen aktuellen Stand damit ersetzen?`)) return;

      Store.data = Store.merge(incoming);
      Store.save();
      renderHome();
      backupMsg(`${count} Zeichen wiederhergestellt.`);
    } catch {
      backupMsg('Diese Datei konnte ich nicht lesen — ist das die richtige Sicherungsdatei?');
    }
  };
  reader.readAsText(file);
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
      show(b.dataset.view);
    };
  });

  $('#word-form').onsubmit = e => { e.preventDefault(); checkWord(); };

  $('#vocab-flip').onclick = flipVocab;
  $('#vocab-known').onclick = () => gradeVocabCard(true);
  $('#vocab-unknown').onclick = () => gradeVocabCard(false);

  $('#btn-start').onclick = () => startSession();
  $('#btn-free').onclick = startFreePractice;
  $('#btn-weak').onclick = startWeakPractice;
  $('#btn-quit').onclick = () => { session = null; renderHome(); show('home'); };

  $('#toggle-course').onchange = e => {
    Store.data.settings.courseOnly = e.target.checked;
    Store.save();
    renderHome();
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
