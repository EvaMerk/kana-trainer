/* Spaced Repetition nach dem Leitner-Prinzip.
 *
 * Jedes Zeichen sitzt in einer "Box". Richtig beantwortet -> eine Box hoch,
 * falsch -> zurück auf Box 0. Je höher die Box, desto später kommt das
 * Zeichen wieder dran. */

const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 7, 14, 30];
const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;
const DAY_MS = 24 * 60 * 60 * 1000;

const STORAGE_KEY = 'kana-trainer-v1';

const Store = {
  data: null,

  defaults() {
    return {
      cards: {},              // zeichen -> { box, due, correct, wrong, seen }
      unlockedLessons: ['h-a'], // mit der a-Reihe geht es los
      history: {},            // 'YYYY-MM-DD' -> Anzahl beantworteter Karten
      words: {},              // wort -> { seen, correct }
      vocab: {},              // vokabel-id -> { box, due, seen, correct, wrong }
      kanji: {},              // kanji-id -> wie vocab
      settings: { newPerSession: 5, sessionLength: 20, courseOnly: true, fokus: 'alle' },
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? this.merge(JSON.parse(raw)) : this.defaults();
    } catch {
      // localStorage kann blockiert sein (z. B. Safari bei file://) — dann
      // läuft der Trainer eben ohne Fortschrittsspeicherung weiter.
      this.data = this.defaults();
    }
    return this.data;
  },

  /* Gespeicherten Stand mit den Standardwerten zusammenführen.
   *
   * settings muss dabei eigens verschmolzen werden: ein flaches Überschreiben
   * würde das ganze settings-Objekt durch den alten Stand ersetzen, sodass
   * später hinzugekommene Einstellungen (z. B. courseOnly) fehlen und als
   * "aus" gelten. */
  merge(gespeichert) {
    const d = this.defaults();
    return {
      ...d,
      ...gespeichert,
      settings: { ...d.settings, ...(gespeichert && gespeichert.settings) },
    };
  },

  /* Welche von zwei Fassungen derselben Karte gilt?
   *
   * Normalfall: die mit mehr Wiederholungen — `seen` wächst nur, das Gerät
   * mit dem höheren Wert hat also die jüngeren Antworten gesehen.
   *
   * Gleichstand heißt, dass auf beiden Geräten unabhängig geübt wurde. Dann
   * gewinnt die niedrigere Box, also die Seite, auf der das Zeichen schlechter
   * saß. Das ist zum einen sicherer — was einmal danebenging, soll wieder
   * drankommen — und zum anderen unabhängig davon, in welche Richtung gerade
   * abgeglichen wird. Sonst hinge das Ergebnis daran, wer wen einliest. */
  fremdeGewinnt(eigene, fremde) {
    const eSeen = eigene.seen || 0, fSeen = fremde.seen || 0;
    if (fSeen !== eSeen) return fSeen > eSeen;
    const eBox = eigene.box || 0, fBox = fremde.box || 0;
    if (fBox !== eBox) return fBox < eBox;
    return (fremde.due || 0) < (eigene.due || 0);
  },

  /* Einen fremden Lernstand in den eigenen einarbeiten — fürs Üben auf Mac
   * und iPhone.
   *
   * Pro Karte entscheidet fremdeGewinnt(); die Gewinnerin wird komplett
   * übernommen und nicht feldweise gemischt, sonst passten Box und
   * Fälligkeitstermin nicht mehr zusammen.
   *
   * Dadurch ist die Richtung des Abgleichs egal und mehrfaches Einspielen
   * derselben Datei ändert nichts mehr. Die Einstellungen bleiben bewusst
   * lokal: eine alte Sicherung soll nicht unbemerkt den Kursmodus abschalten. */
  mergeProgress(eingehend) {
    const lokal = this.merge(this.data);
    const fremd = this.merge(eingehend);
    const ziel = this.merge(lokal);
    let uebernommen = 0;

    for (const feld of ['cards', 'words', 'vocab', 'kanji']) {
      ziel[feld] = { ...lokal[feld] };
      for (const [id, fremdeKarte] of Object.entries(fremd[feld])) {
        const eigene = ziel[feld][id];
        if (!eigene || this.fremdeGewinnt(eigene, fremdeKarte)) {
          ziel[feld][id] = fremdeKarte;
          uebernommen += 1;
        }
      }
    }

    // Tagesstatistik: der höhere Wert je Datum. Addieren würde bei jedem
    // erneuten Abgleich denselben Tag ein weiteres Mal mitzählen.
    ziel.history = { ...lokal.history };
    for (const [tag, anzahl] of Object.entries(fremd.history)) {
      ziel.history[tag] = Math.max(ziel.history[tag] || 0, anzahl);
    }

    ziel.unlockedLessons = [...new Set([...lokal.unlockedLessons, ...fremd.unlockedLessons])];
    ziel.settings = { ...lokal.settings };

    return { data: ziel, uebernommen };
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { /* kein Speicher verfügbar, nicht schlimm */ }
  },

  reset() {
    this.data = this.defaults();
    this.save();
  },
};

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function cardFor(char) {
  if (!Store.data.cards[char]) {
    Store.data.cards[char] = { box: 0, due: 0, correct: 0, wrong: 0, seen: 0 };
  }
  return Store.data.cards[char];
}

/* Kursmodus: nur die Zeichen üben, die laut kursmaterial/ schon dran waren.
 * Die Liste steht in kurs.js und wird von kurs-aktualisieren.py erzeugt. */
function courseModeActive() {
  return Boolean(
    Store.data.settings.courseOnly &&
    typeof COURSE_CHARS !== 'undefined' &&
    COURSE_CHARS.length
  );
}

/* Zeichen, die gerade geübt werden — im Kursmodus die Kursauswahl,
 * sonst alles aus den freigeschalteten Lektionen. */
function unlockedChars() {
  if (courseModeActive()) {
    const set = new Set(COURSE_CHARS);
    return ALL_CHARS.filter(c => set.has(c.c));
  }
  const set = new Set(Store.data.unlockedLessons);
  return ALL_CHARS.filter(c => set.has(c.lesson));
}

/* Schwerpunkt der Übungsrunde: 'alle', 'hiragana', 'katakana' oder 'kanji'.
 * Gilt nur für die Runde auf der Übersicht (Üben, Problemzeichen, Freies
 * Üben) — Lesemodus und Schreiben bleiben davon unberührt. */
const FOKUS_ARTEN = ['alle', 'hiragana', 'katakana', 'kanji'];

function fokus() {
  const f = Store.data.settings.fokus;
  return FOKUS_ARTEN.includes(f) ? f : 'alle';
}

function kanjiImFokus() {
  return fokus() === 'alle' || fokus() === 'kanji';
}

/* Kana-Zeichen für die heutige Runde: die freigeschalteten, gefiltert nach
 * Schwerpunkt. Bei „Kanji" gibt es keine. */
function fokusChars() {
  const f = fokus();
  if (f === 'kanji') return [];
  const alle = unlockedChars();
  return f === 'alle' ? alle : alle.filter(c => c.script === f);
}

/* Kanji in einer Übungsrunde: dieselben Datensätze wie im Kanji-Reiter,
 * mit einer Markierung, damit die Runde sie als Karteikarte zeigt. */
function alsKanjiFrage(k) {
  return { ...k, typ: 'kanji' };
}

function weakestKanji(limit = 8) {
  return vocabList('kanji')
    .map(k => ({ k, card: Store.data.kanji[vocabId(k)] }))
    .filter(x => x.card && x.card.seen > 0)
    .map(x => ({ ...x, rate: x.card.correct / x.card.seen }))
    .filter(x => x.rate < 1)
    .sort((a, b) => a.rate - b.rate || b.card.wrong - a.card.wrong)
    .slice(0, limit)
    .map(x => alsKanjiFrage(x.k));
}

/* Fällige Karten: schon mal gesehen und Fälligkeitsdatum erreicht */
function dueChars(now = Date.now()) {
  return fokusChars().filter(c => {
    const card = Store.data.cards[c.c];
    return card && card.seen > 0 && card.due <= now;
  });
}

/* Noch nie geübte Zeichen aus freigeschalteten Lektionen */
function newChars() {
  return fokusChars().filter(c => {
    const card = Store.data.cards[c.c];
    return !card || card.seen === 0;
  });
}

/* Antwort verbuchen und nächsten Termin berechnen */
function grade(char, correct) {
  const card = cardFor(char);
  card.seen += 1;

  if (correct) {
    card.correct += 1;
    card.box = Math.min(card.box + 1, MAX_BOX);
  } else {
    card.wrong += 1;
    card.box = 0;
  }

  card.due = Date.now() + BOX_INTERVALS_DAYS[card.box] * DAY_MS;

  const key = todayKey();
  Store.data.history[key] = (Store.data.history[key] || 0) + 1;
  Store.save();
  return card;
}

/* Wie sicher sitzt ein Zeichen? 0..1 */
function mastery(char) {
  const card = Store.data.cards[char];
  if (!card || card.seen === 0) return 0;
  return card.box / MAX_BOX;
}

/* Fortschritt einer Lektion in Prozent */
function lessonProgress(lesson) {
  if (!lesson.chars.length) return 0;
  const sum = lesson.chars.reduce((acc, c) => acc + mastery(c.c), 0);
  return Math.round((sum / lesson.chars.length) * 100);
}

/* Zeichen, die als Ablenker im Quiz taugen: bevorzugt schon freigeschaltete
 * derselben Schrift, damit keine völlig unbekannten Lesungen auftauchen. */
function distractorPool(script) {
  const unlocked = unlockedChars().filter(c => c.script === script);
  return unlocked.length >= 4 ? unlocked : ALL_CHARS.filter(c => c.script === script);
}

/* Die wackeligsten Zeichen — Basis fürs gezielte Wiederholen */
function weakestChars(limit = 8) {
  return fokusChars()
    .map(c => ({ ...c, card: Store.data.cards[c.c] }))
    .filter(c => c.card && c.card.seen > 0)
    .map(c => ({ ...c, rate: c.card.correct / c.card.seen }))
    .sort((a, b) => a.rate - b.rate || b.card.wrong - a.card.wrong)
    .filter(c => c.rate < 1)
    .slice(0, limit);
}

/* Nächste Lektion freischalten, sobald die aktuelle sitzt */
function nextLockedLesson() {
  return LESSONS.find(l => !Store.data.unlockedLessons.includes(l.id)) || null;
}

function unlockLesson(id) {
  if (!Store.data.unlockedLessons.includes(id)) {
    Store.data.unlockedLessons.push(id);
    Store.save();
  }
}

// ------------------------------------------------------------- Lesemodus

/* Wörter, die vollständig aus bereits gelernten Zeichen bestehen. */
function availableWords() {
  if (typeof WORDS === 'undefined') return [];
  const koennen = new Set(unlockedChars().map(c => c.c));
  return WORDS.filter(eintrag => [...eintrag.w].every(z => koennen.has(z)));
}

/* Umschrift auf eine Vergleichsform bringen.
 *
 * Hepburn und Kunrei sollen beide gelten (shi/si, chi/ti, tsu/tu, fu/hu).
 * Lange Vokale werden bewusst NICHT zusammengezogen: sonst wären めいし
 * (meishi, Visitenkarte) und めし (meshi, Essen) nicht mehr zu unterscheiden
 * — beide stehen in ihrer aktuellen Auswahl. */
function normalizeRomaji(eingabe) {
  return String(eingabe)
    .toLowerCase()
    .trim()
    .replace(/[\s'’´`_-]/g, '')
    .replace(/ō/g, 'ou').replace(/ū/g, 'uu').replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii').replace(/ē/g, 'ee')
    .replace(/tsu/g, 'tu')
    .replace(/shi/g, 'si')
    .replace(/chi/g, 'ti')
    .replace(/fu/g, 'hu')
    .replace(/ji/g, 'zi');
}

function wordAnswerCorrect(eintrag, eingabe) {
  return normalizeRomaji(eingabe) === normalizeRomaji(eintrag.r);
}

function gradeWord(wort, richtig) {
  const s = Store.data.words[wort] || { seen: 0, correct: 0 };
  s.seen += 1;
  if (richtig) s.correct += 1;
  Store.data.words[wort] = s;
  Store.save();
  return s;
}

/* Nächstes Wort: erst ungesehene, dann die mit den meisten Fehlern. */
function pickWord(zuletzt) {
  let pool = availableWords();
  if (!pool.length) return null;
  if (pool.length > 1 && zuletzt) pool = pool.filter(e => e.w !== zuletzt);

  const ungesehen = pool.filter(e => !Store.data.words[e.w]);
  if (ungesehen.length) return ungesehen[Math.floor(Math.random() * ungesehen.length)];

  const gewichtet = pool.map(e => {
    const s = Store.data.words[e.w];
    return { e, fehlerquote: 1 - s.correct / s.seen };
  }).sort((a, b) => b.fehlerquote - a.fehlerquote);

  // Aus der schwächeren Hälfte ziehen, damit es nicht monoton wird
  const haelfte = gewichtet.slice(0, Math.max(1, Math.ceil(gewichtet.length / 2)));
  return haelfte[Math.floor(Math.random() * haelfte.length)].e;
}

// ------------------------------------------------------ Vokabeltrainer

/* Vokabeln werden über japanische Seite UND Bedeutung identifiziert.
 *
 * Die Bedeutung muss mit rein: さん ist sowohl „drei" als auch die Anrede
 * „Herr/Frau". Über die kana-Seite allein würden sich beide einen Lernstand
 * teilen, und ein Fehler bei der einen würde die andere mit zurückwerfen. */
function vocabId(v) {
  return (v.kana || v.kanji || v.romaji) + '·' + v.deutsch;
}

/* Gibt es weitere Vokabeln, die genauso geschrieben werden? */
function vocabHomographen(v) {
  const seite = v.kana || v.kanji || v.romaji;
  return vocabList().filter(a => (a.kana || a.kanji || a.romaji) === seite && a.deutsch !== v.deutsch);
}

/* Zwei Stapel teilen sich dieselbe Leitner-Logik: 'vocab' (Vokabeln) und
 * 'kanji'. Jeder hat seinen eigenen Lernstand in Store.data[stapel]. Ohne
 * Angabe ist immer der Vokabelstapel gemeint. */
function vocabList(stapel = 'vocab') {
  if (stapel === 'kanji') return typeof KANJI === 'undefined' ? [] : KANJI;
  return typeof VOCAB === 'undefined' ? [] : VOCAB;
}

function vocabCardFor(id, stapel = 'vocab') {
  if (!Store.data[stapel][id]) {
    Store.data[stapel][id] = { box: 0, due: 0, seen: 0, correct: 0, wrong: 0 };
  }
  return Store.data[stapel][id];
}

function vocabDue(stapel = 'vocab', now = Date.now()) {
  return vocabList(stapel).filter(v => {
    const c = Store.data[stapel][vocabId(v)];
    return c && c.seen > 0 && c.due <= now;
  });
}

function vocabNew(stapel = 'vocab') {
  return vocabList(stapel).filter(v => {
    const c = Store.data[stapel][vocabId(v)];
    return !c || c.seen === 0;
  });
}

/* Nächste Vokabel: erst Fälliges, dann Neues. Nie zweimal dieselbe
 * direkt hintereinander, solange es Alternativen gibt. */
function nextVocab(zuletzt, stapel = 'vocab') {
  let faellig = vocabDue(stapel);
  let neu = vocabNew(stapel);

  if (zuletzt && faellig.length + neu.length > 1) {
    faellig = faellig.filter(v => vocabId(v) !== zuletzt);
    neu = neu.filter(v => vocabId(v) !== zuletzt);
  }

  const pool = faellig.length ? faellig : neu;
  if (!pool.length) {
    // Alles gelernt und nichts fällig: trotzdem weiterüben lassen
    const alle = vocabList(stapel).filter(v => vocabId(v) !== zuletzt);
    return alle.length ? alle[Math.floor(Math.random() * alle.length)] : null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/* Abfragerichtung. Neue Vokabeln zuerst Japanisch -> Deutsch: erkennen ist
 * leichter als produzieren, und die Karte wird ja gerade erst eingeführt. */
function vocabDirection(id, modus) {
  if (modus === 'jp-de' || modus === 'de-jp') return modus;
  const c = Store.data.vocab[id];
  if (!c || c.seen === 0) return 'jp-de';
  return Math.random() < 0.5 ? 'jp-de' : 'de-jp';
}

function gradeVocab(id, richtig, stapel = 'vocab') {
  const c = vocabCardFor(id, stapel);
  c.seen += 1;
  if (richtig) {
    c.correct += 1;
    c.box = Math.min(c.box + 1, MAX_BOX);
  } else {
    c.wrong += 1;
    c.box = 0;
  }
  c.due = Date.now() + BOX_INTERVALS_DAYS[c.box] * DAY_MS;

  const key = todayKey();
  Store.data.history[key] = (Store.data.history[key] || 0) + 1;
  Store.save();
  return c;
}

/* Wie viele Vokabeln sitzen schon sicher? */
function vocabStats(stapel = 'vocab') {
  const alle = vocabList(stapel);
  const gelernt = alle.filter(v => {
    const c = Store.data[stapel][vocabId(v)];
    return c && c.seen > 0;
  });
  const sicher = gelernt.filter(v => Store.data[stapel][vocabId(v)].box >= 3);
  return { gesamt: alle.length, gelernt: gelernt.length, sicher: sicher.length,
           faellig: vocabDue(stapel).length, neu: vocabNew(stapel).length };
}

/* Lernstreak: aufeinanderfolgende Tage mit mindestens einer Antwort */
function streak() {
  let count = 0;
  const d = new Date();
  // Heute zählt nur mit, wenn schon geübt wurde — sonst beim gestrigen Tag starten.
  if (!Store.data.history[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (Store.data.history[todayKey(d)]) {
    count += 1;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

/* Neue und fällige Kanji für eine Runde. Bei „Alles" kommen höchstens drei
 * neue dazu, damit die Kana nicht untergehen; bei „Kanji" so viele wie sonst
 * neue Zeichen. */
function kanjiFuerRunde() {
  if (!kanjiImFokus()) return { due: [], fresh: [] };
  const maxNeu = fokus() === 'kanji' ? Store.data.settings.newPerSession : 3;
  return {
    due: vocabDue('kanji').map(alsKanjiFrage),
    fresh: vocabNew('kanji').slice(0, maxNeu).map(alsKanjiFrage),
  };
}

/* Stellt die Karten für eine Übungsrunde zusammen:
 * erst Fälliges, dann eine Handvoll neuer Zeichen. */
function buildSession() {
  const { newPerSession, sessionLength } = Store.data.settings;
  const kanji = kanjiFuerRunde();
  const due = shuffle([...dueChars(), ...kanji.due]);
  const fresh = [...newChars().slice(0, newPerSession), ...kanji.fresh];

  const queue = [...fresh, ...due].slice(0, sessionLength);
  // Neue Zeichen bewusst nicht ganz am Anfang bündeln
  return shuffle(queue);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
