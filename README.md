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
