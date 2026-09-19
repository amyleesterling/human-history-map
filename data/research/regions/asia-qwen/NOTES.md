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
