/* Kana-Datenbasis: Hiragana + Katakana mit deutschen Eselsbrücken.
 *
 * Felder pro Zeichen:
 *   c  = Zeichen
 *   r  = Romaji (Umschrift)
 *   m  = Eselsbrücke auf Deutsch — beschreibt die FORM des Zeichens
 *   km = Merkhilfe aus Evas Lehrbuch — zielt auf den KLANG (は = „Hanna").
 *        Nur bei Zeichen, die im Kurs schon dran waren. Ergänzt m, ersetzt es
 *        nicht: im Unterricht hört sie diese Variante.
 *   s  = optionale Liste ähnlich aussehender Zeichen (für gemeine Quiz-Ablenker) */

const LESSONS = [
  // ---------------------------------------------------------------- Hiragana
  {
    id: 'h-a', script: 'hiragana', title: 'Hiragana: a-Reihe', chars: [
      { c: 'あ', r: 'a',  m: 'Ein Apfel, der an einem Kreuz-Ast hängt.', s: ['お', 'め', 'ぬ'] },
      { c: 'い', r: 'i',  m: 'Zwei Striche nebeneinander — wie zwei i ohne Punkt.', km: 'Inge', s: ['り'] },
      { c: 'う', r: 'u',  m: 'Ein Gesicht im Profil, das „Uh?" sagt: Stirn und Nase.', s: ['ら', 'つ'] },
      { c: 'え', r: 'e',  m: 'Eine Ente mit langem Hals und Schwanz.', s: ['ん', 'ス'] },
      { c: 'お', r: 'o',  m: 'Wie あ, aber mit Schwung — eine Oma mit Dutt.', s: ['あ', 'む'] },
    ]
  },
  {
    id: 'h-ka', script: 'hiragana', title: 'Hiragana: ka-Reihe', chars: [
      { c: 'か', r: 'ka', m: 'Ein Kanu mit Paddel daneben.', s: ['が', 'ケ'] },
      { c: 'き', r: 'ki', m: 'Ein Kirchturm mit zwei Querbalken.', s: ['さ', 'ま'] },
      { c: 'く', r: 'ku', m: 'Ein Kuckucks-Schnabel, der sich öffnet.', km: 'Kulisse', s: ['へ'] },
      { c: 'け', r: 'ke', m: 'Ein Kegel mit einem Strich davor.', s: ['は', 'ほ', 'に'] },
      { c: 'こ', r: 'ko', m: 'Zwei Kommas übereinander.', km: 'Kost', s: ['に', 'コ'] },
    ]
  },
  {
    id: 'h-sa', script: 'hiragana', title: 'Hiragana: sa-Reihe', chars: [
      { c: 'さ', r: 'sa',  m: 'Eine Salat-Gabel mit Schwung.', km: 'Passant', s: ['き', 'ち'] },
      { c: 'し', r: 'shi', m: 'Ein Schihang — die lange Kurve am Ende der Piste.', km: 'Schiff', s: ['つ', 'レ'] },
      { c: 'す', r: 'su',  m: 'Eine Suppenkelle mit Schlaufe.', km: 'Maß (ß + u)', s: ['お', 'む'] },
      { c: 'せ', r: 'se',  m: 'Ein Seil, das an einem Pfosten hängt.', s: ['サ', 'せ'] },
      { c: 'そ', r: 'so',  m: 'Eine Sockennaht im Zickzack.', s: ['ぞ', 'ろ'] },
    ]
  },
  {
    id: 'h-ta', script: 'hiragana', title: 'Hiragana: ta-Reihe', chars: [
      { c: 'た', r: 'ta',  m: 'Ein „t" und ein „a" nebeneinander geschrieben.', s: ['な', 'に'] },
      { c: 'ち', r: 'chi', m: 'Ein Stuhl, auf dem jemand chillt.', s: ['さ', 'ら'] },
      { c: 'つ', r: 'tsu', m: 'Eine Tsunami-Welle, die heranrollt.', s: ['し', 'う', 'ツ'] },
      { c: 'て', r: 'te',  m: 'Eine winkende Hand — 手 (te) heißt wirklich „Hand"!', km: 'Tennis', s: ['で', 'へ'] },
      { c: 'と', r: 'to',  m: 'Ein Tor-Pfosten mit einem Querstrich.', s: ['ど', 'ヒ'] },
    ]
  },
  {
    id: 'h-na', script: 'hiragana', title: 'Hiragana: na-Reihe', chars: [
      { c: 'な', r: 'na', m: 'Ein Nagel mit Knoten und Schlaufe.', s: ['た', 'ta'] },
      { c: 'に', r: 'ni', m: 'Ein Knie von der Seite — nicht ganz gerade.', s: ['こ', 'け'] },
      { c: 'ぬ', r: 'nu', m: 'Nudeln, die sich zu einer Schleife ringeln.', s: ['め', 'あ'] },
      { c: 'ね', r: 'ne', m: 'Ein Nest mit gekringeltem Schwanz.', s: ['れ', 'わ'] },
      { c: 'の', r: 'no', m: 'Der durchgestrichene Kreis — „No!" / Verbotsschild.', s: [] },
    ]
  },
  {
    id: 'h-ha', script: 'hiragana', title: 'Hiragana: ha-Reihe', chars: [
      { c: 'は', r: 'ha', m: 'Ein Haus mit Leiter an der Wand.', km: 'Hanna', s: ['ほ', 'け', 'ば'] },
      { c: 'ひ', r: 'hi', m: 'Ein lachender Mund — hihi!', s: ['び', 'ぴ'] },
      { c: 'ふ', r: 'fu', m: 'Der Berg Fuji mit Wolken drumherum.', s: ['ぶ', 'ヌ'] },
      { c: 'へ', r: 'he', m: 'Eine kleine Hecke — und identisch mit Katakana ヘ!', s: ['く', 'ヘ'] },
      { c: 'ほ', r: 'ho', m: 'Wie は, aber mit Antenne oben — ein Hotel.', s: ['は', 'ぼ'] },
    ]
  },
  {
    id: 'h-ma', script: 'hiragana', title: 'Hiragana: ma-Reihe', chars: [
      { c: 'ま', r: 'ma', m: 'Mama mit Haarschleife.', km: 'Mann', s: ['き', 'も'] },
      { c: 'み', r: 'mi', m: 'Sieht aus wie die Zahl 21 — aber wir sagen „mi".', s: ['ろ'] },
      { c: 'む', r: 'mu', m: 'Eine Kuh sagt Muh.', s: ['す', 'お'] },
      { c: 'め', r: 'me', m: 'Ein Auge — 目 (me) heißt wirklich „Auge". Wie ぬ, nur ohne Schleife.', km: 'Mensch', s: ['ぬ', 'あ'] },
      { c: 'も', r: 'mo', m: 'Ein Angelhaken mit zwei Würmern dran.', s: ['ま', 'モ'] },
    ]
  },
  {
    id: 'h-ya', script: 'hiragana', title: 'Hiragana: ya-Reihe', chars: [
      { c: 'や', r: 'ya', m: 'Eine Yacht mit schrägem Segel.', s: ['ヤ'] },
      { c: 'ゆ', r: 'yu', m: 'Ein Fisch mit Schwanzflosse.', s: ['ユ'] },
      { c: 'よ', r: 'yo', m: 'Ein Yo-Yo an der Schnur.', km: 'Yoga', s: ['ま', 'ヨ'] },
    ]
  },
  {
    id: 'h-ra', script: 'hiragana', title: 'Hiragana: ra-Reihe', chars: [
      { c: 'ら', r: 'ra', m: 'Eine Rakete mit Startrampe.', s: ['う', 'ち'] },
      { c: 'り', r: 'ri', m: 'Ein Riss im Papier — zwei Striche.', s: ['い', 'リ'] },
      { c: 'る', r: 'ru', m: 'Eine Rutsche mit Schleife am Ende.', s: ['ろ', 'ぬ'] },
      { c: 'れ', r: 're', m: 'Jemand, der rennt — Bein nach hinten.', s: ['ね', 'わ'] },
      { c: 'ろ', r: 'ro', m: 'Ein Rohr — wie る, aber ohne den Knoten.', s: ['る', 'そ'] },
    ]
  },
  {
    id: 'h-wa', script: 'hiragana', title: 'Hiragana: wa-Reihe + n', chars: [
      { c: 'わ', r: 'wa', m: 'Ein Wasserhahn, aus dem es tropft.', s: ['ね', 'れ'] },
      { c: 'を', r: 'wo', m: 'Gesprochen wie „o". Kommt nur als Partikel vor (markiert das Objekt).', s: ['お'] },
      { c: 'ん', r: 'n',  m: 'Ein „n" mit Schwung — der einzige Einzelkonsonant im Japanischen.', km: 'Annahme', s: ['え', 'ソ'] },
    ]
  },

  // ------------------------------------------------- Hiragana mit Dakuten
  {
    id: 'h-daku1', script: 'hiragana', title: 'Hiragana: Dakuten g / z', chars: [
      { c: 'が', r: 'ga', m: 'か + zwei Striche („Dakuten") → k wird zu g.', s: ['か'] },
      { c: 'ぎ', r: 'gi', m: 'き + Dakuten.', s: ['き'] },
      { c: 'ぐ', r: 'gu', m: 'く + Dakuten.', km: 'Guss', s: ['く'] },
      { c: 'げ', r: 'ge', m: 'け + Dakuten.', s: ['け'] },
      { c: 'ご', r: 'go', m: 'こ + Dakuten.', km: 'Gold', s: ['こ'] },
      { c: 'ざ', r: 'za', m: 'さ + Dakuten → s wird zu z.', km: 'Sand', s: ['さ'] },
      { c: 'じ', r: 'ji', m: 'し + Dakuten. Achtung: klingt „dschi", nicht „zi"!', km: 'Jim', s: ['し', 'ぢ'] },
      { c: 'ず', r: 'zu', m: 'す + Dakuten.', km: 'Summe', s: ['す', 'づ'] },
      { c: 'ぜ', r: 'ze', m: 'せ + Dakuten.', s: ['せ'] },
      { c: 'ぞ', r: 'zo', m: 'そ + Dakuten.', s: ['そ'] },
    ]
  },
  {
    id: 'h-daku2', script: 'hiragana', title: 'Hiragana: Dakuten d / b / p', chars: [
      { c: 'だ', r: 'da', m: 'た + Dakuten → t wird zu d.', s: ['た'] },
      { c: 'ぢ', r: 'ji', m: 'ち + Dakuten. Klingt wie じ, kommt aber viel seltener vor.', s: ['じ'] },
      { c: 'づ', r: 'zu', m: 'つ + Dakuten. Klingt wie ず, kommt selten vor.', s: ['ず'] },
      { c: 'で', r: 'de', m: 'て + Dakuten.', km: 'denn', s: ['て'] },
      { c: 'ど', r: 'do', m: 'と + Dakuten.', s: ['と'] },
      { c: 'ば', r: 'ba', m: 'は + Dakuten → h wird zu b.', s: ['は', 'ぱ'] },
      { c: 'び', r: 'bi', m: 'ひ + Dakuten.', s: ['ひ', 'ぴ'] },
      { c: 'ぶ', r: 'bu', m: 'ふ + Dakuten.', s: ['ふ', 'ぷ'] },
      { c: 'べ', r: 'be', m: 'へ + Dakuten.', s: ['へ', 'ぺ'] },
      { c: 'ぼ', r: 'bo', m: 'ほ + Dakuten.', s: ['ほ', 'ぽ'] },
      { c: 'ぱ', r: 'pa', m: 'は + kleiner Kreis („Handakuten") → h wird zu p.', s: ['ば'] },
      { c: 'ぴ', r: 'pi', m: 'ひ + Handakuten.', s: ['び'] },
      { c: 'ぷ', r: 'pu', m: 'ふ + Handakuten.', s: ['ぶ'] },
      { c: 'ぺ', r: 'pe', m: 'へ + Handakuten.', s: ['べ'] },
      { c: 'ぽ', r: 'po', m: 'ほ + Handakuten.', s: ['ぼ'] },
    ]
  },

  // ---------------------------------------------------------------- Katakana
  {
    id: 'k-a', script: 'katakana', title: 'Katakana: a-Reihe', chars: [
      { c: 'ア', r: 'a', m: 'Wie ein „A" ohne Querstrich, mit Haken.', s: ['マ', 'ヌ'] },
      { c: 'イ', r: 'i', m: 'Ein Pfeil nach oben — i wie „hinauf".', s: ['ノ', 'ハ'] },
      { c: 'ウ', r: 'u', m: 'Ein Dach mit Strich — ein Unterstand.', s: ['ワ', 'ク'] },
      { c: 'エ', r: 'e', m: 'Wie ein Eisenträger von der Seite (工).', s: ['ヱ', 'ユ'] },
      { c: 'オ', r: 'o', m: 'Ein Obstbaum mit Kreuz und Haken.', s: ['ホ', 'ナ'] },
    ]
  },
  {
    id: 'k-ka', script: 'katakana', title: 'Katakana: ka-Reihe', chars: [
      { c: 'カ', r: 'ka', m: 'Wie か, nur ohne den kleinen Strich — Kanu ohne Paddel.', s: ['か', 'ヵ'] },
      { c: 'キ', r: 'ki', m: 'Wie き, nur ohne die Kurve unten.', s: ['き', 'サ'] },
      { c: 'ク', r: 'ku', m: 'Ein Kuchenstück — eckiger Schnabel.', s: ['ワ', 'ヲ', 'タ'] },
      { c: 'ケ', r: 'ke', m: 'Eine Kerbe im Holz.', s: ['ク', 'か'] },
      { c: 'コ', r: 'ko', m: 'Wie こ, nur eckig — eine Klammer.', s: ['ロ', 'こ'] },
    ]
  },
  {
    id: 'k-sa', script: 'katakana', title: 'Katakana: sa-Reihe', chars: [
      { c: 'サ', r: 'sa',  m: 'Wie さ, nur eckig — Salat-Gabel mit drei Zinken.', s: ['キ', 'せ'] },
      { c: 'シ', r: 'shi', m: 'Zwei Punkte WAAGERECHT, Haken von UNTEN nach oben. Der Schifahrer schaut zur Seite.', s: ['ツ', 'ソ', 'ン'] },
      { c: 'ス', r: 'su',  m: 'Ein Sushi-Stück auf dem Brett.', s: ['ヌ', 'え'] },
      { c: 'セ', r: 'se',  m: 'Wie せ, nur ohne den langen Schwanz.', s: ['せ'] },
      { c: 'ソ', r: 'so',  m: 'EIN Punkt schräg, Strich von OBEN nach unten. Vergleiche mit ン!', s: ['ン', 'シ', 'ツ'] },
    ]
  },
  {
    id: 'k-ta', script: 'katakana', title: 'Katakana: ta-Reihe', chars: [
      { c: 'タ', r: 'ta',  m: 'Wie ク mit einem Strich drin — ein Taschenmesser.', s: ['ク', 'ヲ'] },
      { c: 'チ', r: 'chi', m: 'Wie der obere Teil von ち — ein Skalpell.', s: ['テ', 'ナ'] },
      { c: 'ツ', r: 'tsu', m: 'Zwei Punkte SENKRECHT, Haken von UNTEN. Tsunami-Tropfen fallen herab.', s: ['シ', 'ソ', 'ン'] },
      { c: 'テ', r: 'te',  m: 'Wie て mit Hut — ein Teleskop-Stativ.', s: ['チ', 'ラ'] },
      { c: 'ト', r: 'to',  m: 'Ein Totempfahl mit einem Ast.', s: ['ヒ', 'と'] },
    ]
  },
  {
    id: 'k-na', script: 'katakana', title: 'Katakana: na-Reihe', chars: [
      { c: 'ナ', r: 'na', m: 'Ein Nagel-Kreuz.', s: ['オ', 'チ'] },
      { c: 'ニ', r: 'ni', m: 'Zwei Striche — ni wie 二, die japanische Zwei!', s: ['こ', 'エ'] },
      { c: 'ヌ', r: 'nu', m: 'Nudeln, jetzt eckig gefaltet.', s: ['ス', 'ア', 'メ'] },
      { c: 'ネ', r: 'ne', m: 'Ein Netz-Kreuz mit Haken.', s: ['ホ', 'オ'] },
      { c: 'ノ', r: 'no', m: 'Nur ein einzelner Strich — notfalls reicht einer.', s: ['イ', 'ソ'] },
    ]
  },
  {
    id: 'k-ha', script: 'katakana', title: 'Katakana: ha-Reihe', chars: [
      { c: 'ハ', r: 'ha', m: 'Zwei Striche wie ein Dach — hatschi, ein Niesen spritzt.', s: ['ル', 'イ'] },
      { c: 'ヒ', r: 'hi', m: 'Eine Person, die auf einer Bank sitzt.', s: ['ト', 'と'] },
      { c: 'フ', r: 'fu', m: 'Eine Nase im Profil / ein kurzer Skihang.', s: ['ワ', 'ク', 'ラ'] },
      { c: 'ヘ', r: 'he', m: 'IDENTISCH mit Hiragana へ — ein Geschenk, das kannst du schon!', s: ['へ'] },
      { c: 'ホ', r: 'ho', m: 'Wie 木 (Baum) — ein Holz-Baum.', s: ['ネ', 'オ'] },
    ]
  },
  {
    id: 'k-ma', script: 'katakana', title: 'Katakana: ma-Reihe', chars: [
      { c: 'マ', r: 'ma', m: 'Ein Mantel-Kragen.', s: ['ア', 'ム'] },
      { c: 'ミ', r: 'mi', m: 'Drei Striche — mi wie 三, die japanische Drei!', s: ['シ', 'ニ'] },
      { c: 'ム', r: 'mu', m: 'Eine Kuh von vorn — Muh mit eckigem Maul.', s: ['マ', 'メ'] },
      { c: 'メ', r: 'me', m: 'Ein Messer-Kreuz, ein X.', s: ['ヌ', 'ム'] },
      { c: 'モ', r: 'mo', m: 'Wie も ohne den Schwung — ein Mobile.', s: ['も', 'ヨ'] },
    ]
  },
  {
    id: 'k-ya', script: 'katakana', title: 'Katakana: ya-Reihe', chars: [
      { c: 'ヤ', r: 'ya', m: 'Wie や, nur eckig — eine Yacht.', s: ['や'] },
      { c: 'ユ', r: 'yu', m: 'Ein U-Boot von der Seite.', s: ['エ', 'コ'] },
      { c: 'ヨ', r: 'yo', m: 'Ein E ohne linken Strich — ein Yoga-Block mit drei Stufen.', s: ['ヲ', 'モ'] },
    ]
  },
  {
    id: 'k-ra', script: 'katakana', title: 'Katakana: ra-Reihe', chars: [
      { c: 'ラ', r: 'ra', m: 'Eine Rakete mit Dach.', s: ['テ', 'フ'] },
      { c: 'リ', r: 'ri', m: 'Wie り, nur gerade — zwei Stäbe.', s: ['り', 'ソ'] },
      { c: 'ル', r: 'ru', m: 'Zwei Beine, die runterlaufen.', s: ['ハ', 'レ'] },
      { c: 'レ', r: 're', m: 'Ein einzelner Haken — eine Regenrinne.', s: ['ル', 'し'] },
      { c: 'ロ', r: 'ro', m: 'Ein Quadrat — ein Rohr von vorn (口 = Mund).', s: ['コ', 'ヮ'] },
    ]
  },
  {
    id: 'k-wa', script: 'katakana', title: 'Katakana: wa-Reihe + n', chars: [
      { c: 'ワ', r: 'wa', m: 'Wie ク, aber offen — eine Wanne.', s: ['ク', 'ウ', 'フ'] },
      { c: 'ヲ', r: 'wo', m: 'Wie ワ mit Strich. Kommt in echtem Text so gut wie nie vor.', s: ['ワ', 'ヨ'] },
      { c: 'ン', r: 'n',  m: 'EIN Punkt waagerecht, Haken von UNTEN. Vergleiche mit ソ!', s: ['ソ', 'シ', 'ツ'] },
    ]
  },
  {
    id: 'k-daku', script: 'katakana', title: 'Katakana: Dakuten', chars: [
      { c: 'ガ', r: 'ga', m: 'カ + Dakuten.', s: ['カ'] },
      { c: 'ギ', r: 'gi', m: 'キ + Dakuten.', s: ['キ'] },
      { c: 'グ', r: 'gu', m: 'ク + Dakuten.', s: ['ク'] },
      { c: 'ゲ', r: 'ge', m: 'ケ + Dakuten.', s: ['ケ'] },
      { c: 'ゴ', r: 'go', m: 'コ + Dakuten.', s: ['コ'] },
      { c: 'ザ', r: 'za', m: 'サ + Dakuten.', s: ['サ'] },
      { c: 'ジ', r: 'ji', m: 'シ + Dakuten. Klingt „dschi".', s: ['シ'] },
      { c: 'ズ', r: 'zu', m: 'ス + Dakuten.', s: ['ス'] },
      { c: 'ゼ', r: 'ze', m: 'セ + Dakuten.', s: ['セ'] },
      { c: 'ゾ', r: 'zo', m: 'ソ + Dakuten.', s: ['ソ'] },
      { c: 'ダ', r: 'da', m: 'タ + Dakuten.', s: ['タ'] },
      { c: 'デ', r: 'de', m: 'テ + Dakuten.', s: ['テ'] },
      { c: 'ド', r: 'do', m: 'ト + Dakuten.', s: ['ト'] },
      { c: 'バ', r: 'ba', m: 'ハ + Dakuten.', s: ['ハ', 'パ'] },
      { c: 'ビ', r: 'bi', m: 'ヒ + Dakuten.', s: ['ヒ', 'ピ'] },
      { c: 'ブ', r: 'bu', m: 'フ + Dakuten.', s: ['フ', 'プ'] },
      { c: 'ベ', r: 'be', m: 'ヘ + Dakuten.', s: ['ヘ', 'ペ'] },
      { c: 'ボ', r: 'bo', m: 'ホ + Dakuten.', s: ['ホ', 'ポ'] },
      { c: 'パ', r: 'pa', m: 'ハ + Handakuten (kleiner Kreis).', s: ['バ'] },
      { c: 'ピ', r: 'pi', m: 'ヒ + Handakuten.', s: ['ビ'] },
      { c: 'プ', r: 'pu', m: 'フ + Handakuten.', s: ['ブ'] },
      { c: 'ペ', r: 'pe', m: 'ヘ + Handakuten.', s: ['ベ'] },
      { c: 'ポ', r: 'po', m: 'ホ + Handakuten.', s: ['ボ'] },
    ]
  },
];

/* Flache Liste aller Zeichen, mit Rückverweis auf die Lektion. */
const ALL_CHARS = LESSONS.flatMap(l =>
  l.chars.map(c => ({ ...c, lesson: l.id, script: l.script, lessonTitle: l.title }))
);

/* Schnellzugriff Zeichen -> Datensatz */
const CHAR_MAP = Object.fromEntries(ALL_CHARS.map(c => [c.c, c]));
