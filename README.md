# Kana-Trainer

Ein kleiner Trainer für Hiragana und Katakana. Kein Internet nötig, keine Installation, keine Abhängigkeiten.

## Starten

Doppelklick auf `index.html` reicht meistens. Falls dein Browser den Fortschritt nicht speichert (Safari ist da streng bei lokalen Dateien), starte stattdessen einen kleinen Server:

```sh
cd ~/Documents/Coding/japanisch
python3 -m http.server 8777 --directory trainer
```

Dann im Browser [http://localhost:8777](http://localhost:8777) öffnen.

## Aufs iPhone bringen

Einmal veröffentlichen (im Terminal, im Ordner `trainer/`):

```sh
gh repo create kana-trainer --public --source=. --push
gh api -X POST repos/EvaMerk/kana-trainer/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Nach ein bis zwei Minuten liegt die App unter
**https://evamerk.github.io/kana-trainer/**

Auf dem iPhone in **Safari** öffnen (nicht Chrome — nur Safari darf auf iOS Apps auf den Home-Bildschirm legen), dann Teilen-Symbol → **Zum Home-Bildschirm**. Danach startet sie wie eine normale App, ohne Browserleiste, und funktioniert auch ohne Netz.

Änderungen später ausspielen: `git add -A && git commit -m "..." && git push`.

## Kursmodus

Standardmäßig übt der Trainer **nur die Zeichen, die im Kurs schon dran waren**. Welche das sind, steht in `kurs.js` und wird aus den Übungsblättern in `kursmaterial/` abgeleitet.

Neue Blätter bekommen? Einfach in `kursmaterial/` legen und im Projektordner ausführen:

```sh
python3 kurs-aktualisieren.py
```

Das Skript liest die Dateinamen (`50hiragana-su.pdf` → す) und schreibt `kurs.js` neu. Zeichen ohne eigenes Blatt kannst du im Skript unter `ZUSAETZLICH` eintragen.

Den Schalter „Nur meine Kurszeichen" auf der Startseite ausmachen, um stattdessen nach den klassischen Reihen zu lernen. Im Kursmodus sind auch die Antwortmöglichkeiten und die Ähnlichkeitshinweise auf die Kursauswahl beschränkt — es taucht nie ein Zeichen auf, das im Kurs noch nicht dran war.

## Lesemodus („Wörter")

Zeigt ein echtes japanisches Wort in Hiragana, du tippst die Umschrift. Es erscheinen **nur Wörter, deren Zeichen du alle schon kannst** — die Liste wächst also automatisch mit, sobald neue Zeichen dazukommen.

Hepburn und Kunrei gelten beide (`shi` wie `si`, `tsu` wie `tu`). Lange Vokale werden bewusst *nicht* zusammengezogen, sonst wären めいし (*meishi*, Visitenkarte) und めし (*meshi*, Essen) nicht mehr zu unterscheiden.

Bei einem Fehler wird das Wort in seine Zeichen zerlegt, damit du siehst, an welcher Stelle es hakte.

Wörter stehen in `woerter.js`. Beim Ergänzen: keine kleinen Kana (っ ゃ ゅ ょ) und kein Dehnungsstrich verwenden — die kennt der Trainer noch nicht als eigene Zeichen, solche Wörter würden nie erscheinen.

## Vokabeltrainer

Karteikarten aus `kursmaterial/Vokabeln/`, abgefragt in beide Richtungen (Japanisch → Deutsch und zurück). Neue Vokabeln starten immer mit Japanisch → Deutsch, weil Erkennen leichter ist als Produzieren; danach mischt es sich. Dieselben Leitner-Boxen wie bei den Zeichen.

### Neue Vokabeln hinzufügen

Fotos, Screenshots oder PDFs in `kursmaterial/Vokabeln/` legen und mir Bescheid sagen — ich tippe sie in eine Textdatei daneben ab. Danach:

```sh
python3 vokabeln-aktualisieren.py
```

Das Skript liest alle Textdateien (`.tsv .csv .txt .md`) im Ordner und schreibt `trainer/vokabeln.js`. Bilder und PDFs kann es nicht lesen, meldet sie aber als **OFFEN**, solange keine Textdatei mit gleichem Namen daneben liegt — so ist immer sichtbar, was noch fehlt.

Format, eine Vokabel pro Zeile:

```
いぬ ; inu ; Hund ; 犬
```

Trennzeichen darf `;` `|` oder ein Tabulator sein, `#` am Zeilenanfang ist ein Kommentar. Standardreihenfolge ist `kana ; romaji ; deutsch ; kanji`, änderbar pro Datei mit einer Kopfzeile:

```
#spalten: deutsch ; kana ; romaji
```

Nicht alle Spalten müssen gefüllt sein — nötig sind nur eine japanische Seite und die deutsche Bedeutung.

## Wie es funktioniert

**Spaced Repetition.** Jedes Zeichen sitzt in einer „Box". Richtig beantwortet steigt es eine Box auf und kommt später wieder dran, falsch beantwortet fällt es auf Box 0 zurück und kommt bald wieder. Die Abstände: 1 Tag → 2 → 4 → 7 → 14 → 30.

**Vier Abfragearten**, automatisch passend zum Kenntnisstand:

| Modus | Wann | Aufgabe |
|---|---|---|
| Kennenlernen | Zeichen ist neu | Zeichen, Lesung und Eselsbrücke anschauen |
| Erkennen | frisch gelernt | Zeichen sehen → Lesung aus vier auswählen |
| Umgekehrt | mittlere Box | Lesung sehen → Zeichen aus vier auswählen |
| Tippen | hohe Box | Zeichen sehen → Lesung eintippen |

**Gemeine Ablenker.** Die falschen Antwortmöglichkeiten sind bevorzugt Zeichen, die dem gesuchten optisch ähneln — also genau die, die man verwechselt (シ/ツ/ソ/ン, ぬ/め, は/ほ, る/ろ …).

## Tastatur

- <kbd>1</kbd>–<kbd>4</kbd> — Antwort auswählen
- <kbd>Enter</kbd> — weiter

## Lektionen

23 Lektionen, 140 Zeichen: Hiragana Grundreihen → Hiragana mit Dakuten → Katakana Grundreihen → Katakana mit Dakuten.

Es startet nur die a-Reihe freigeschaltet. Schalte die nächste Lektion frei, wenn die aktuelle bei ungefähr 80 % steht — das steht unter jeder Lektion.

## Dateien

- `kana-data.js` — alle Zeichen mit deutschen Eselsbrücken und Verwechslungspaaren
- `srs.js` — Leitner-Logik und Speicherung (`localStorage`)
- `app.js` — Oberfläche und Übungsablauf
- `index.html`, `style.css`

Der Fortschritt liegt im `localStorage` deines Browsers unter dem Schlüssel `kana-trainer-v1`. Anderer Browser oder privates Fenster heißt: von vorne.
