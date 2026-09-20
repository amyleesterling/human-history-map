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

## Cards, fifth drop: Iran, India and Southeast Asia, and seven China entries

Nineteen cards and seven polity entries. None of the cards existed
before, so nothing was rectified; all nineteen are published with the
changes below. The seven entries are saved verbatim as
`batch-03-civilizations.json` (the array brackets are ours; Qwen sent
the entries as a fragment). Amy asked whether they were already there.
Five were, under the importer's ids; two were not.

- **Already there, harmonized.** `liao-dynasty` is the imported `liao`,
  which now also absorbs the 900 map's "Khitans" so the Liao's researched
  dates (907 to 1125) have a polygon from 907. `western-xia` is the
  imported `xixia`. `yuan-dynasty` is the imported "Great Khanate"
  (1279 to 1492 on the maps, renamed in the importer's merge table).
  `qing-dynasty` is the imported "Manchu Empire" and "Qing Empire",
  three runs that are now one polity (1650 to 1920 on the maps, 1644 to
  1912 by Qwen's dates). `ming-dynasty` is curated; Qwen's entry adds
  only its aliases.
- **New.** `jin-dynasty-1115`, the Jurchen Jin. The 1200 map draws
  Manchuria and north China as "Liao", which by 1200 was Jin, so the
  importer names that one polygon "Jurchen Jin" with this id; it draws
  from 1200 to 1234. `southern-song` is skipped, as the two Han were: the
  site's `song-dynasty` runs 960 to 1279.
- **Republic of China** stays a plain name in the Qing's fall; no entry
  covers China between 1912 and the 1945 map.
- **Other harmonizations the cards needed.** The imported "Seljuk Empire"
  of 1100 to 1492 was the Great Seljuks in Iran on the 1100 map and the
  Seljuks of Rum in Anatolia from 1279; the Anatolian polygons are now
  `sultanate-of-rum`, and `seljuk-empire` carries curated dates 1037 to
  1194. The two Maratha runs ("Maratha", "Maratha Confederacy") are one
  `maratha`, 1674 to 1818. Curated dates were added for `samanid-empire`
  (819 to 999), `sukhothai` (1238 to 1438), `champa` (192 to 1832) and
  `malacca` (1400 to 1511); each polygon still draws only for the years
  its map covers.
- **Fall links.** Balhae now falls to `liao`, drawn in 926. Samanid to
  `ghaznavid-emirate` (its map begins in 1000, one year after the fall)
  and the Karakhanids as a plain name; Seljuk to `khwarazmian-dynasty`;
  Safavid to a plain "Afsharid dynasty", since the map's Persia begins
  again only in 1783; Chola to `pandya-state-1279`; Vijayanagara to
  `golkonda` and a plain Bijapur; Maratha to `british-east-india-company`;
  Champa to `annam-1815`, the map's Vietnam in 1832; Malacca to
  `portugal`; Funan, Ayutthaya and Majapahit to plain Chenla, Thonburi
  and Demak, which have no entries. The curated `mongol-empire`,
  `ming-dynasty` and `han-dynasty` falls now link the Yuan, the Qing and
  the Three Kingdoms by id.
- **elam**: Chogha Zanbil is a ziggurat, not a pyramid; the matrilineal
  claim is hedged as a reading some scholars make; Napir-Asu's statue
  (1,750 kg, c. 1340 BCE) and Proto-Elamite (c. 3100 BCE) dated; the fall
  adds Assyria's sack of Susa in 647 BCE; UNESCO listing dated 1979.
- **achaemenid-empire**: the couriers took about a week, not nine days;
  the Cyrus Cylinder's "human rights" reading is marked disputed and
  "freeing enslaved peoples" becomes the return of deported peoples;
  "Zoroastrianism practiced by the royal family" becomes the kings'
  invocation of Ahura Mazda with the question left open; coins (c. 515),
  Persepolis (518), the Judean return (538) dated.
- **parthian-empire**: the 97 CE contact was the Han envoy Gan Ying
  reaching Parthia, and Han envoys first came in the 110s BCE; Carrhae
  (53 BCE) added.
- **samanid-empire**: Al-Biruni was born in Khwarazm in 973 and worked
  mostly after the Samanids; Rudaki dated to Nasr II's court (c. 930),
  Ferdowsi's start c. 977, Bal'ami's Tabari 963, the mausoleum before
  943.
- **seljuk-empire**: the Friday Mosque domes dated 1086 and 1088, the
  Nizamiyya 1067; "more accurate than the Gregorian" given its figure
  (about a day in 3,770 years); the Rubaiyat described as quatrains
  later gathered; the fall separates the Great Seljuks (1194) from Rum
  (1308).
- **safavid-empire**: the Imam Mosque named by its historical name, the
  Shah Mosque; the fall adds the Afghan capture of Isfahan in 1722; New
  Julfa dated 1606; the Tahmasp Shahnameh's 258 miniatures.
- **kushan-empire**: Gandhara made "some of the first" Buddha images,
  contemporary with Mathura; the Kashmir council is given as Buddhist
  tradition; Bactrian as the state language; the fall names the
  Kushano-Sasanians.
- **chola-empire**: the Brihadisvara tower's height (about 66 m), the
  Chola embassies to Song China (1015, 1077) and the Uttaramerur
  assemblies (920s) added; the fall names the Pandyas of Madurai.
- **delhi-sultanate**: the Qutb Minar's start moved to c. 1199 (the
  complex began in 1193) and its height to 72.5 m; the Alai Darwaza
  (1311) and Amir Khusrau added; UNESCO listing dated 1993.
- **vijayanagara**: the population figure of 500,000 is hedged as
  "several hundred thousand"; Paes's account (c. 1520) and
  Krishnadevaraya's works added; the fall names the Aravidu capitals and
  the year 1646.
- **maratha**: Kanhoji Angre's navy, chauth and sardeshmukhi, and
  Panipat (1761) added; the fall names the Peshwa's surrender.
- **funan**: the fall is marked circa (c. 550); Kang Tai and Zhu Ying
  (c. 245), the Roman coins and the 90 km canal added.
- **champa**: founding as Lin-yi (192 CE), the sack of Angkor (1177), the
  Dong Yen Chau inscription (fourth century) and the fall of Vijaya
  (1471) added.
- **srivijaya**: the Kedukan Bukit inscription (683) and Atisha's stay
  (c. 1011) added; the fall gives the sequence from the Chola raid of
  1025 to Majapahit's attack of 1377.
- **pagan**: Anawrahta's conversion is c. 1056 with the conquest of Thaton
  in 1057; the Ananda temple (1105) and the Myazedi inscription (1113)
  dated; the fall names the Mongol invasions of 1277 and 1287, the
  murder of Narathihapate and the Myinsaing brothers (1297). Qwen's
  Britannica link could not be confirmed, so the sources are UNESCO's
  Bagan listing and Wikipedia.
- **sukhothai**: the Ram Khamhaeng inscription's date is given as its own
  claim, with the dispute over the stone noted; Sawankhalok ware added.
- **ayutthaya**: the Dutch factory (1608), Phaulkon and the embassy to
  Versailles (1686) added; the fall names Taksin's Thonburi.
- **majapahit**: the fall is marked circa (Demak took the capital around
  1527; some histories say 1478); Bhinneka Tunggal Ika added.
- **malacca**: "over 80 languages" becomes Tomé Pires's count of 84;
  Zheng He's visits (from 1405) added.
- **Links.** Britannica's Srivijaya and Majapahit pages are at
  "Srivijaya-empire" and "Majapahit-empire".

## Seams: why dynasties vanished, and the fixes

Amy's screenshots showed China blank in 252 and 423 and a stack of
translucent polygons over Central Asia in 721. Sampling the map at
nineteen cities every four years found the pattern: a researched polity
was drawn only for the years its imported snapshot covered, so every
dynasty change that fell between two maps left a hole (222 to 298, 422 to
598, 758 to 798, 910 to 958 and 1370 to 1398 in China; Japan, Korea and
Tibet the same). The 721 stack was two duplicates (the imported
"Göktürks" beside Qwen's `gokturk`, "Tufan Empire" beside
`tibetan-empire`) plus Qwen's Tang polygon reaching to 47 N over
Mongolia.

- **Founding backfill** (`js/data.js`, `BACKFILL_YEARS`): a researched
  polity is drawn from its founding with its earliest shape, if that
  shape is no more than 150 years later. Only the start is stretched. A
  fallen state's last shape is never carried forward, because a rump is
  usually far smaller than the map it came from (the Mughals of 1800 are
  not the Mughals of 1715). This alone closed the Jin (266), Northern Wei
  (439), Southern Qi (479), Sui (581), Balhae (698), Goryeo (918), Yuan
  (1271), Kamakura (1185) and Heian (794) gaps.
- **Mislabelled maps** (importer `MERGES` with year bounds): the 700 map
  says Sui over what was Tang, the 900 map says Yamato over the Heian
  court, the 800 map spells Silla "Silia". Renamed for those years.
- **Shared polygons** (importer `SPLITS`): the 400 map's Jin is the
  Eastern Jin, whose south the Liu Song took in 420; the 500 map's
  southern Jin was the Southern Qi, Liang and Chen in turn; the 700 map's
  Yamato became the Nara court in 710; the 1300 map's Kamakura became the
  Muromachi shogunate in 1333; the 1200 map's Jurchen Jin fell to the
  Mongols in 1234. Each segment is its own feature, and the polities
  created this way (Southern Qi, Liang, Chen) carry curated dates.
- **Carried and dropped shapes** (importer `CARRIES`, `DROPS`): the 1279
  and 1300 maps fold Korea into the Yuan, so the 1200 Goryeo shape is
  carried to 1392; the 1400 map draws China and Mongolia as one Great
  Khanate, which is dropped, and the 1492 Ming shape stands in from 1368
  (Mongolia is then blank until 1492; the Northern Yuan has no entry).
- **Drawn by the site** (`data/civilizations-seams.json`,
  `data/borders/china-seams.geojson`): no map has the Three Kingdoms,
  the eastern and western halves of the Northern Wei's successors, or the
  Five Dynasties, so coarse extents were drawn after Tan Qixiang's
  Historical Atlas of China, dashed and marked precision 1, with entries
  for Eastern Wei, Western Wei, Northern Qi, Northern Zhou, Later Tang,
  Later Jin, Later Han and Later Zhou. The Later Liang shape leaves out
  Shanxi, held by its rival; the shapes from 938 leave out the Sixteen
  Prefectures ceded to the Liao.
- **Overlaps**: `gokturks` and `tufan-empire` are merged into `gokturk`
  and `tibetan-empire`; the Tang polygon's northern edge now stops at
  43 N. The Tang and Tibetan shapes still overlap in the Tarim and
  Qinghai, which both contested; that is the coarseness of both.
- **Still blank**: south China from 907 to 960 (the Ten Kingdoms have no
  entries), Mongolia from 1368 to 1492, and Kyoto before 350 (Yamato's
  earliest shape is the 500 map, beyond the 150-year reach). A Qwen batch
  for the Ten Kingdoms and the Northern Yuan would close the first two.
- The Later Liang, Liu Song and Northern Wei cards now link their
  successors by id; the Sixteen Kingdoms carry curated dates (304 to 439)
  so they no longer overlap the Northern Wei.
- **Imported outlines now win** (2026-09-20): where a snapshot and a
  researched file both draw a polity in a year, the snapshot draws and the
  researched extent fills only the years the snapshot lacks. Amy saw the
  Western Zhou hexagon sitting in a hole in the Sinic ring at 1000 BCE
  where the 1000 BCE map's Zhou belonged. A researched shape can still
  override a snapshot with `"over": true` in its properties, used only
  where the snapshot is wrong and the importer's tables cannot mend it.
- **Southern Song, Jurchen Jin and the Mongols in China** are three such
  `over` seams in `data/borders/china-seams.geojson`: the 1100 and 1200
  maps keep the Song over all of China until 1279 and hold the Jin to
  Manchuria. The seams put the Song south of the Huai and the Qinling from
  1127, the Jin north of that line from 1115 to 1234, and the Mongol Empire
  in the Jin's, Xixia's and Mongolia's place from 1234 to 1271, after which
  the Yuan's own 1279 shape reaches back to 1271.
- **Sasanian**: the 300 map still names Persia "Parthian Empire" and the
  400 map names it "Persia"; both are renamed to the Sasanian Empire in the
  importer, so the polity now runs from the 300 map and reaches back to 224
  through the founding backfill. The card link from the Parthians' fall
  used to land on an empty steppe. A side effect: the Qajar-era "Persia"
  run (1783 to 1914) is now the first run of that name, so its id changed
  from `persia-1783` to `persia`; nothing referenced the old id.
- **Tang at 700 to 800**: the 700 map's Tang (its "Sui", renamed) runs into
  its Tibetan Empire, Uyghurs and Karluks. That is the snapshot's own
  overlap; the globe now paints states as solid washes with the smaller
  polygon on top, so the overlap no longer shows as a mixed colour.
