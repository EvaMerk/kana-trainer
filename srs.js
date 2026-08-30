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
      settings: { newPerSession: 5, sessionLength: 20, courseOnly: true },
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

/* Fällige Karten: schon mal gesehen und Fälligkeitsdatum erreicht */
function dueChars(now = Date.now()) {
  return unlockedChars().filter(c => {
    const card = Store.data.cards[c.c];
    return card && card.seen > 0 && card.due <= now;
  });
}

/* Noch nie geübte Zeichen aus freigeschalteten Lektionen */
function newChars() {
  return unlockedChars().filter(c => {
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
  return unlockedChars()
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

/* Stellt die Karten für eine Übungsrunde zusammen:
 * erst Fälliges, dann eine Handvoll neuer Zeichen. */
function buildSession() {
  const { newPerSession, sessionLength } = Store.data.settings;
  const due = shuffle(dueChars());
  const fresh = newChars().slice(0, newPerSession);

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
