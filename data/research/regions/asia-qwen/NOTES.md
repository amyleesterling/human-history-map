# Asia batches from Qwen

Batch files here are kept exactly as delivered. What the site loads is
`data/civilizations-asia.json`, which is the same entries with the small
adjustments listed below, so the difference between the two is always
visible.

## Batch 01 (Xia, Shang), integrated 2026-09-19

- `xia` overrides the imported entry of the same id (map coverage 2000 to
  1500 BCE); the imported border for that interval still draws. Dates follow
  the Xia-Shang-Zhou Chronology Project's conventional 2070 to 1600 BCE and
  are marked circa, as befits a semi-legendary dynasty.
- `shang` is new to the index. No border is drawn for it yet: the imported
  snapshots label that region "Sinic". Search finds it and the chip says so.
- `dateBasis: historical` added to both so the chip prints the dates rather
  than "Map coverage".
- Shang's successor `western-zhou` is not in the index yet, so the fall
  points at the plain name "Western Zhou" until Qwen's Zhou batch lands;
  then it becomes the id again.
- Facts checked: Xia 2070 to 1600 and Shang 1600 to 1046 BCE are the
  Chronology Project's dates (some scholars put Muye at 1045 BCE); Yangzhai
  and Yangcheng are both traditional Xia capitals; Anyang (Yin) was the last
  Shang capital; oracle bones, bronze casting and chariots are attested at
  Anyang.

## Batch 02 (47 entries: China, Korea, Japan, Tibet, the steppe, India,
## Southeast Asia, Iran), integrated 2026-09-19

Integration is now done by `scripts/integrate-asia.mjs`, which reads every
batch file here and writes `data/civilizations-asia.json`. Its rules:

- **Imported names harmonized in the importer's merge table**, so Qwen's
  ids inherit the imported borders instead of duplicating the polity:
  Koguryo is now `goguryeo`, Paekche `baekje`, Parhae and Balhae `balhae`,
  Korea before 1200 `goryeo` and Korea 1492 to 1900 `joseon`, Toba Wei
  `northern-wei`, Sui Empire `sui`, Tang Empire `tang`, Song Empire
  `song-dynasty`, the Jin of 300 to 600 `jin-dynasty`, Sultanate of Delhi
  `delhi-sultanate`, Srivijaya Empire `srivijaya`, Cholas and Chola Empire
  `chola-empire`, Parthia and Parthian Empire `parthian-empire`, the source's
  misspelt "Zhoa" `zhou` before 1200 BCE, `western-zhou` and `eastern-zhou`
  by year, and Japan's imported labels `heian-japan`, `kamakura` and
  `muromachi` by year.
- **Qwen ids renamed onto existing ids**: maurya to maurya-empire, gupta to
  gupta-empire, mughal to mughal-empire, kushan to kushan-empire, parthian
  to parthian-empire, sasanian to sasanian-empire, safavid to
  safavid-empire, chola to chola-empire (the medieval Cholas; the imported
  `chola` of 200 to 300 CE is the early Cholas and stays), xiongnu to
  xiongnu-bc200 (the imported `xiongnu` of 400 BCE stays as the earlier
  record).
- **Skipped**: Western Han and Eastern Han are phases of `han-dynasty`,
  which has a checked card. Qwen's Western Han summary also put paper and
  the seismograph in the wrong half: both are Eastern Han (105 and 132 CE).
  Xin (9 to 23 CE) is kept as its own polity between them.
- **Curated entries keep their text**: for maurya-empire, gupta-empire and
  mughal-empire only Qwen's native-script aliases are taken.
- **Qin**: the imported border is the Qin state from 323 BCE, so the entry
  runs from 770 BCE (Qin's enfeoffment under King Ping) to 206 BCE and its
  first sentence says so; Qwen's dates covered only the dynasty.
- **Fall targets not in the index become plain names**: Later Tang, Yuan
  dynasty, Southern Qi, Eastern and Western Wei, Xianbei, Shunga, Chenla,
  Demak, Thonburi, Afsharid, Rashidun Caliphate, Korean Empire. They turn
  into links when Qwen delivers those ids. Predecessors and successors that
  are not ids were dropped (Northern Dynasties, Later Zhou, Rouran,
  Singhasari).
- **Facts checked**: Zhou 1046 to 771 and 770 to 256 BCE; Qin 221 to 206;
  Xin 9 to 23 CE; Cao Wei abdication 265 or 266 (both in use); Jin 266 to
  420; Northern Wei 386 to 534; Sui 581 to 618; Tang 618 to 907; Song 960
  to 1279; the Three Kingdoms' traditional founding years for Korea (57,
  37 and 18 BCE); Balhae 698 to 926; Goryeo 918 to 1392; Joseon 1392 to
  1897; Heian 794 to 1185; Kamakura 1185 to 1333; Tibetan Empire 618 to
  842; Göktürk 552 to 744; Chola 848 to 1279; Delhi Sultanate 1206 to
  1526; Vijayanagara 1336 to 1646 with Talikota 1565; Khmer 802 to 1431;
  Majapahit 1293 to 1527; Pagan 849 to 1297; Ayutthaya 1351 to 1767;
  Parthian 247 BCE to 224 CE; Sasanian 224 to 651; Safavid 1501 to 1736.
- **Left for later batches**: Yuan, Ming and Qing under Qwen's ids (the
  index has ming-dynasty from the curated set), Liao, Jin (Jurchen), Xi
  Xia, the Five Dynasties after Later Liang, Chenla, Sukhothai's own
  entry, Muromachi and Edo, the Korean Empire, and borders for every
  polity that has none.

## Cards from Qwen

Delivered cards are kept verbatim in `proposed-cards/`; what is published
in `data/cards/` is the checked version. Edits so far:

- **xia**: Erlitou's earliest bronze vessels (jue) belong to phases II and
  III, about 1700 BCE, not 1900; the vessels are plain, so "animal masks"
  (the taotie of Shang bronzes) was removed and the turquoise dragon added;
  the Mandate of Heaven is a Zhou idea used to explain the Shang's fall,
  so the Legacy item now says the Zhou named the pattern; the palace
  precinct's size (about 11 hectares, walled, found 2004) added; Yu's flood
  works kept as tradition and labelled so. Sources kept, with the Cambridge
  volume's editors and the Erlitou chapter named, and Britannica's Erlitou
  entry added.
- **shang**: the last king is Di Xin (Qwen's "Zhou Xin" mixes his name and
  his posthumous title); the calendar item now names the ten-day week and
  the sixty-day stem-and-branch cycle rather than "decimal and duodecimal";
  cowries were royal gifts and grave wealth, not a currency in the later
  sense; rice was a lesser crop beside millet; the Houmuwu ding's 832 kg
  and Fu Hao's 755 jades and 468 bronzes added as checked figures.
- **western-zhou**: smelted iron reaches China only about 800 BCE, at the
  period's end, so the item is dated and hedged; the Classic of Poetry's
  songs are of the period but the anthology was assembled later; the Book
  of Changes item separates the Zhou divination core from the much later
  commentaries; "feudal lords" became "regional lords"; the empire ended in
  1912, not 1911.
- **eastern-zhou**: the Daodejing is dated by its earliest copies (Guodian,
  about 300 BCE) rather than to a 500 BCE Laozi; cast iron moved from 600
  to about 500 BCE and bronze crossbow triggers to about 400 BCE, the
  earliest finds; the Annals' span 722 to 481 BCE and Chu lacquer added.
- **qin**: the site's Qin runs from 770 BCE (the state) to 206 BCE, so the
  overview opens with the state and Shang Yang's reforms of 356 BCE are
  added; the Terracotta Army item now gives 8,000 figures and the 246 BCE
  start; the burning of the books is dated 213 and the execution of
  scholars marked as tradition; the Lingqu canal named; "the name China
  derives from Qin" hedged to "probably"; the fall now links han-dynasty,
  the site's one Han, in place of Qwen's western-han.
- **western-han, eastern-han** (cards): not published. The site treats the
  Han as one polity, `han-dynasty`, with a checked card, and both deliveries
  again put Cai Lun's paper (105) and Zhang Heng's seismoscope (132) in the
  Western Han. Two checked items unique to the Eastern Han card were folded
  into the Han card: Xu Shen's Shuowen Jiezi (presented 121) and the Way of
  the Celestial Masters (142). The "first true porcelain" of about 100 CE is
  Eastern Han proto-porcelain, so it was left out.
- **xin**: the trade in slaves was banned, not slavery abolished; the land
  order's withdrawal within three years and the monopolies of 10 CE added;
  the fall links `han-dynasty` (Qwen's `eastern-han` is not an id).
- **cao-wei**: Cao Pi's Discourse on Literature named and dated; the
  south-pointing chariot's gearing described as reconstructed; the tuntian
  colonies dated to 196 under the Han; the nine-rank system (220) added;
  the abdication's date given in both calendars.
- **shu-han**: the repeating crossbow predates Zhuge Liang, so his part is
  "improved, by tradition"; Dujiangyan named.
- **eastern-wu**: "possibly the Roman world" replaced by the recorded visit
  of the merchant Qin Lun in 226.
- **jin-dynasty**: the Orchid Pavilion Preface (353), Huiyuan (386) and
  Faxian (399) added with dates; the Seven Sages placed at the Wei to Jin
  transition.
- **liu-song**: Zu Chongzhi's pi given as the bounds he found, with his
  dates, and his Daming calendar of 462 added, since the pi work itself is
  not dated to a year.
- **northern-wei**: Xiaowen's move to Luoyang dated 494, Longmen 493;
  Western Wei's separation dated 535.
- **sui**: the Grand Canal dated 605 to 610; the examinations "begin"
  rather than "revived", with the jinshi degree of about 605.
- **tang**: the gunpowder reference moved from about 700 to about 850,
  the date of the earliest alchemical warning; Alopen and the Xi'an Stele
  named; Lu Yu dated; the claim that the English word Chinatown derives from
  Tang replaced by the Chinese word Tangrenjie, which does.
- **later-liang**: as delivered; the fall names Later Tang in plain text.
- **song-dynasty**: Zhu Xi moved from about 1100 to about 1190 (he was
  born in 1130); the jiaozi dated 1024 and Champa rice 1012; the fall links
  `mongol-empire`, on the map to 1294, and names the Yuan in the text.
- **qin** (card): delivered a second time, identical; the published card
  stands.

## Borders from Qwen (asia-ancient.geojson)

Kept verbatim in `proposed-borders/`; published as
`data/borders/asia-ancient.geojson` with priority 1 in the manifest, so
these polygons replace the imported snapshot borders of the same polities
for the years they cover (the loader's rule for researched borders).
Edits: Qwen's `western-han` and `eastern-han` polygons, which differ by
one vertex, became one `han-dynasty` feature for 206 BCE to 220 CE, and
the same polygon serves `xin` for 9 to 23 CE, which held the same
territory; the Northern Song polygon's northern edge was clipped from 42
to 40 degrees north, since the Sixteen Prefectures around Beijing were
Liao. All seven are coarse "core area" polygons of about ten vertices,
marked precision 1, and draw dashed.

Since Cao Wei, Shu Han and Eastern Wu are now polities with cards, the
Han card's fall entry names them by id so the three pills link.
