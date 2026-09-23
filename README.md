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

Das Repo muss **öffentlich** sein: aus einem privaten Repo veröffentlicht Pages nur mit GitHub Pro. Das wäre hier ohnehin sinnlos — eine Pages-Seite ist auch aus einem privaten Repo im offenen Internet erreichbar, versteckt würde nur der Quelltext. Damit die Seite wenigstens nicht in Suchmaschinen auftaucht, steht in `index.html` ein `noindex`. Bewusst **ohne** Sperre in `robots.txt`: die würde verhindern, dass das `noindex` überhaupt gelesen wird.

Nicht im Repo landet der Ordner `kursmaterial/` — er liegt eine Ebene höher, außerhalb. Der Lernfortschritt wird nie hochgeladen, der bleibt im Browser des jeweiligen Geräts.

Änderungen später ausspielen: `git add -A && git commit -m "..." && git push`.

> **Bei jeder Änderung an einer Datei aus `ASSETS` die Zahl in `CACHE` (`sw.js`) hochzählen.** Der `activate`-Handler löscht nur Caches mit *anderem* Namen; bleibt der Name gleich, räumt er nie auf und die App läuft auf den Geräten beliebig lange weiter mit alten Dateien. Genau so hing die Wortliste mit 108 Einträgen fest, während die Datei schon 140 hatte.

## Auf dem Handy

Zwei Dinge sind eigens fürs iPhone gebaut, weil die Bildschirmhöhe dort knapp ist:

- **Die Weiterkommen-Knöpfe kleben unten** (`.weiter` im CSS). Eine Intro-Karte ist rund 500 px hoch, eine Auswertung mit Eselsbrücke ähnlich — ohne das läge der Knopf unterhalb des Displays und man müsste nach jeder Antwort scrollen. `position: sticky` heftet nur innerhalb des sichtbaren Teils des Elternblocks; liegt der ganz unterhalb des Rands, hilft es nicht. Deshalb holt `zeigeAuswertung()` die Auswertung zusätzlich per `scrollIntoView` heran, und `zumSeitenanfang()` setzt vor jeder neuen Frage zurück nach oben.
- **`enterkeyhint="go"`** auf den Eingabefeldern: Die Taste unten rechts auf der Handytastatur heißt dann „Los" und schickt die Antwort ab. Sonst müsste man den Prüfen-Knopf treffen, den die eingeblendete Tastatur oft verdeckt.

## Kursmodus

Standardmäßig übt der Trainer **nur die Zeichen, die im Kurs schon dran waren**. Welche das sind, steht in `kurs.js` und wird aus den Übungsblättern in `kursmaterial/` abgeleitet.

Neue Blätter bekommen? Einfach in `kursmaterial/` legen und im Projektordner ausführen:

```sh
python3 kurs-aktualisieren.py
```

Das Skript liest die Dateinamen (`50hiragana-su.pdf` → す, `katakana-tu.pdf` → ツ) und schreibt `kurs.js` neu. Es versteht Kunrei und Hepburn (`si` wie `shi`) sowie `nn` für ん. Kopien mit Zählsuffix (`50hiragana-to (1).pdf`) meldet es als nicht zuordenbar und überspringt sie — das Original zählt.

Zeichen **ohne eigenes Übungsblatt** — typischerweise Dakuten-Formen, die nur im Lehrbuch auftauchen — stehen in `kursmaterial/weitere-zeichen.txt`, ein Zeichen pro Zeile mit Quellenangabe als Kommentar.

Den Schalter „Nur meine Kurszeichen" auf der Startseite ausmachen, um stattdessen nach den klassischen Reihen zu lernen. Im Kursmodus sind auch die Antwortmöglichkeiten und die Ähnlichkeitshinweise auf die Kursauswahl beschränkt — es taucht nie ein Zeichen auf, das im Kurs noch nicht dran war.

## Lesemodus („Wörter")

Zeigt ein echtes japanisches Wort in Hiragana, du tippst die Umschrift. Es erscheinen **nur Wörter, deren Zeichen du alle schon kannst** — die Liste wächst also automatisch mit, sobald neue Zeichen dazukommen.

Hepburn und Kunrei gelten beide (`shi` wie `si`, `tsu` wie `tu`). Lange Vokale werden bewusst *nicht* zusammengezogen, sonst wären めいし (*meishi*, Visitenkarte) und めし (*meshi*, Essen) nicht mehr zu unterscheiden.

Bei einem Fehler wird das Wort in seine Zeichen zerlegt, damit du siehst, an welcher Stelle es hakte.

Wörter stehen in `woerter.js`. Beim Ergänzen: keine kleinen Kana (っ ゃ ゅ ょ) und kein Dehnungsstrich verwenden — die kennt der Trainer noch nicht als eigene Zeichen, solche Wörter würden nie erscheinen.

**Nach jedem neuen Zeichensatz die Abdeckung pro Zeichen nachrechnen**, nicht nur die Gesamtzahl lesbarer Wörter: ein Zeichen, für das kein Wort existiert, kommt im Lesemodus schlicht nie vor. Katakana sind dabei besonders zäh — ohne Dehnungsstrich lässt sich aus wenigen Zeichen fast kein Lehnwort bilden. Stand 23.09.: ツ und ト haben noch kein Wort.

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

Nicht alle Spalten müssen gefüllt sein — nötig sind nur eine japanische Seite und die deutsche Bedeutung. Eine fünfte Spalte `notiz` nimmt Zusatzinfos auf.

**Gleich geschriebene Vokabeln** (さん heißt „drei" *und* „Herr/Frau") bekommen getrennte Lernstände. Bei der Abfrage Japanisch → Deutsch wird die `notiz` als Unterscheidungshilfe eingeblendet — sonst wäre die Frage nicht beantwortbar. Deshalb bei solchen Paaren immer eine Notiz setzen.

## Zwei Arten von Merkhilfen

Zu jedem Zeichen steht in `kana-data.js` eine Eselsbrücke zur **Form** (`m`, „は ist ein Haus mit Leiter"). Zeichen, die im Kurs dran waren, haben zusätzlich die Merkhilfe aus dem Lehrbuch (`km`), die auf den **Klang** zielt („Hanna" → ha). Die App zeigt beide — im Unterricht fällt die zweite Variante.

## Mac und iPhone abgleichen

Der Lernstand liegt im `localStorage` des jeweiligen Browsers — jedes Gerät zählt für sich. Zum Zusammenführen unten auf der Übersicht **Stand kopieren**, den Text sich selbst per Nachricht oder AirDrop aufs andere Gerät schicken, dort **Stand einfügen**.

Die beiden Stände werden **zusammengeführt, nicht ersetzt**:

- Je Karte gilt die Fassung mit mehr Wiederholungen — `seen` wächst nur, also hat sie die jüngeren Antworten gesehen.
- Bei Gleichstand (auf beiden Geräten unabhängig geübt) gewinnt die niedrigere Box: was einmal danebenging, kommt lieber nochmal dran.
- Die Tagesstatistik nimmt je Datum den höheren Wert, freigeschaltete Lektionen werden vereinigt.

Dadurch ist die Richtung egal, und zweimal einfügen ändert nichts mehr. Die **Einstellungen bleiben lokal** — eine alte Sicherung soll nicht unbemerkt den Kursmodus abschalten.

Alternativ geht es weiter als Datei („Lieber als Datei sichern"). Auf dem iPhone ist der Weg über die Zwischenablage aber zuverlässiger, weil Downloads aus einer Home-Bildschirm-App dort nicht immer funktionieren.

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
