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

## Cards, fourth drop: Korea, Japan, Tibet and the steppe

Thirteen cards delivered (Silla twice, identical); kept verbatim in
`proposed-cards/`, published with these changes.

- **Ids.** `unified-silla` is the site's `silla` (which runs to 935),
  `liao-dynasty` and `uyghur-khaganate` are the imported `liao` and
  `uyghurs`, and Qwen's `xiongnu` card is Modu's empire, so it is published
  as `xiongnu-bc200`, the entry the batch integration already maps it to
  (the imported `xiongnu` of 400 to 323 BCE is a pre-imperial snapshot).
- **Fall links land on drawn borders.** Balhae's fall links `khitans`,
  the polygon on the map in 926; the imported Liao begins in 1000, so a
  link to it opened an empty view. The polity entry's `fell` is patched
  the same way in `integrate-asia.mjs`. Goguryeo and Baekje fall to `silla`
  and `tang`, both drawn in 668 and 660. Kamakura's link to `muromachi`
  opens a chip saying the map covers 1400 to 1492, since the imported
  1300 map's Japan is the Kamakura polygon and no map holds the Ashikaga
  years before 1400; a known seam, left for a researched border.
- **Joseon runs to 1910.** Qwen ended it in 1897 with a fall to a
  "korean-empire" that has no entry. The Korean Empire was Joseon under a
  new title, and the imported 1900 map draws it, so the entry now ends at
  the annexation of 1910 and falls to `imperial-japan`, which is drawn
  then. Ending in 1897 had left Korea blank until the 1914 map.
- **goguryeo**: Korea's name comes from Goryeo, which took its name from
  Goguryeo, not from Goguryeo directly; the gold crowns are gilt-bronze
  ornaments; the two UNESCO listings are named with their year (2004);
  the fall text adds the Tang protectorate and Silla's expulsion of Tang
  by 676.
- **silla**: Bulguksa and Seokguram dated (begun 751, listed 1995);
  Cheomseongdae dated by Queen Seondeok's reign (632 to 647); the
  unification of 676 added to the overview; Gyeongju listing dated 2000.
- **baekje**: the Buddhism-to-Japan item is marked circa, since Japanese
  sources give 538 or 552; the fall adds Baekgang (663) and Tang's
  interim rule; the incense burner's find (Neungsan-ri, 1993) is named.
- **balhae**: founding (698, Dae Joyeong) added; "surprise campaign"
  becomes a campaign of a few weeks under Yelü Abaoji.
- **goryeo**: the 1234 printing names the Sangjeong Gogeum Yemun and the
  Jikji (1377) as the oldest surviving metal-type book; the Tripitaka
  Koreana is "more than 81,000 blocks", since UNESCO and the temple's own
  recount give 81,258 and 81,352; "still usable after 800 years" becomes
  "nearly 800 years" (1251 to today is 775); the examinations are dated
  to 958 and no longer said to test Buddhist texts (monks had a separate
  examination); the Khan Academy link is the canonical one (Qwen's had a
  typo in the path, though it resolves) and UNESCO's Haeinsa listing is
  added.
- **joseon**: Hangul 1443 with the 1446 promulgation; the rain gauge's
  European comparison is dated (1639); the clock is dated 1434 and named;
  the Chiljeongsan (1442) and Donguibogam (1613) are added; the Annals'
  span (1392 to 1863) is given.
- **yamato**: the largest kofun is named and measured (Daisen, 486 m);
  Shotoku's constitution (604), the Inariyama sword (471) and the Taika
  Reform (645) are added; "Shinto" is glossed as the later name for kami
  worship; the Mozu-Furuichi listing (2019) is added.
- **nara-japan**: the Manyoshu count (4,516) and its latest poem (759),
  the Kojiki (712) and Nihon Shoki (720), the Great Buddha (752) and the
  provincial temples (741) are dated; the ritsuryo codes are named.
- **heian-japan**: The Pillow Book marked circa; the kana (c. 900),
  Tendai and Shingon (806), Genshin (985) and the Phoenix Hall (1053) are
  dated; the fall adds Dan-no-ura and the shogunal title of 1192.
- **kamakura**: Zen (Eisai 1191, Dogen 1227), the Pure Land and Lotus
  schools (1175, 1253) and the Great Buddha (1252) are dated; "Zen
  gardens" dropped, since the dry garden is a Muromachi form; bushido
  is described as the later codification; the Mongol invasions (1274,
  1281) are added; the fall names Ashikaga Takauji's shogunate of 1336.
- **tibetan-empire**: the script is dated c. 640 and its model given as an
  Indian script of the Gupta type rather than Brahmi; Samye (779),
  Chang'an (763), Dunhuang (786 to 848) and the treaty pillar (822) are
  added; the fall names the Era of Fragmentation.
- **xiongnu-bc200**: Modu (209 BCE), the heqin treaties (198 BCE), the
  split of 54 BCE and Ikh Bayan (89 CE) are added; the fall also links
  `southern-xiongnu`, drawn from 100.
- **gokturk**: Qwen dated the Orkhon script c. 600; the oldest long texts
  are the Kül Tegin and Bilge Qaghan stelae of 732 and 735, so the item
  says so. Manichaeism is dropped (it reached the steppe with the Uyghurs
  in 762) and Taspar Qaghan's Buddhism (c. 575) and Maniakh's embassy
  (568) are added. Qwen's World History Encyclopedia link does not
  resolve to an article, so the sources are Wikipedia's First Turkic
  Khaganate and Orkhon inscriptions pages.
- **Sources.** Britannica, UNESCO, Khan Academy and the Met all block
  automated link checks, so their links were confirmed by search or by
  their known slugs (Britannica's Koguryo, Parhae, Choson dynasty,
  Kamakura period and Tibet history pages).
